import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { parseWorkoutPlanFromText } from './ocrParser.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory sync versions map: userId -> { version: number, timestamp: number }
const userSyncVersions = new Map();

function bumpSyncVersion(userId) {
  if (!userId) return;
  const current = userSyncVersions.get(userId) || { version: 0, timestamp: Date.now() };
  userSyncVersions.set(userId, {
    version: current.version + 1,
    timestamp: Date.now()
  });
}

function getSyncVersion(userId) {
  if (!userId) return { version: 0, timestamp: Date.now() };
  if (!userSyncVersions.has(userId)) {
    userSyncVersions.set(userId, { version: 1, timestamp: Date.now() });
  }
  return userSyncVersions.get(userId);
}

// ============================================================================
// 1. HEALTH CHECK & USERS
// ============================================================================
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT version();');
    res.json({
      status: 'ok',
      database: 'connected',
      pgVersion: dbRes.rows[0].version,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ============================================================================
// OCR INTELIGENTE DE FICHAS DE TREINO (Sharp + Tesseract)
// ============================================================================
app.post('/api/ocr/analyze-workout', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' });
  }

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Pré-processamento avançado da imagem (upscale 2400px, grayscale, normalise, sharpen)
    const processedBuffer = await sharp(buffer)
      .resize({ width: 2400, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .sharpen()
      .toBuffer();

    const result = await Tesseract.recognize(processedBuffer, 'por+eng');
    const rawText = result.data.text || '';
    const days = parseWorkoutPlanFromText(rawText);

    res.json({
      text: rawText,
      days,
      confidence: result.data.confidence || 0
    });
  } catch (err) {
    console.error('Erro ao processar OCR da imagem:', err);
    res.status(500).json({ error: 'Erro no processamento visual da imagem: ' + err.message });
  }
});

// Lista todos os usuários cadastrados no PostgreSQL
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar_url, auth_provider, is_email_verified, created_at FROM users ORDER BY created_at ASC'
    );
    const users = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      avatarUrl: r.avatar_url,
      provider: r.auth_provider,
      isEmailVerified: r.is_email_verified,
      createdAt: r.created_at
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verifica se um usuário existe e seu status no PostgreSQL
app.get('/api/users/check', async (req, res) => {
  const email = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
  const userId = req.query.userId ? String(req.query.userId).trim() : '';

  if (!email && !userId) {
    return res.status(400).json({ error: 'email ou userId obrigatório' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar_url, role, is_blocked, created_at FROM users WHERE LOWER(email) = $1 OR id = $2 LIMIT 1;',
      [email, userId]
    );

    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }

    const u = result.rows[0];
    return res.json({
      exists: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        role: u.role,
        isBlocked: Boolean(u.is_blocked),
        createdAt: u.created_at
      }
    });
  } catch (err) {
    console.error('Erro ao checar existência de usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sincroniza / Cadastra usuário no PostgreSQL
app.post('/api/users/sync', async (req, res) => {
  const { id, name, email, avatarUrl, provider } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = cleanEmail === 'admin@appfit.com' || cleanEmail === 'appfit';
  const finalEmail = isAdmin ? 'admin@appfit.com' : cleanEmail;
  const finalName = isAdmin ? 'AppFit' : (name || cleanEmail.split('@')[0]);
  const role = isAdmin ? 'admin' : 'user';

  try {
    // 1. Busca por e-mail ou ID
    const existing = await pool.query(
      'SELECT id, name, email, avatar_url, auth_provider, is_email_verified, role, is_blocked, created_at FROM users WHERE LOWER(email) = $1 OR id = $2 LIMIT 1;',
      [finalEmail, id || '']
    );

    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      if (u.is_blocked) {
        return res.status(403).json({ error: 'Esta conta de usuário foi bloqueada pela administração do sistema.' });
      }

      // Se for admin, garante a role no banco
      if (isAdmin && u.role !== 'admin') {
        await pool.query("UPDATE users SET role = 'admin', name = 'AppFit' WHERE id = $1;", [u.id]);
        u.role = 'admin';
        u.name = 'AppFit';
      }

      return res.json({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        provider: u.auth_provider,
        isEmailVerified: u.is_email_verified,
        role: u.role || 'user',
        isBlocked: Boolean(u.is_blocked),
        createdAt: u.created_at
      });
    }

    // 2. Novo usuário
    const userId = id || (isAdmin ? 'user-admin-001' : `user-${Date.now()}`);
    const query = `
      INSERT INTO users (id, name, email, avatar_url, auth_provider, is_email_verified, role, is_blocked)
      VALUES ($1, $2, $3, $4, $5, true, $6, false)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name,
          role = EXCLUDED.role,
          avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
          updated_at = CURRENT_TIMESTAMP
      RETURNING id, name, email, avatar_url, auth_provider, is_email_verified, role, is_blocked, created_at;
    `;
    const result = await pool.query(query, [userId, finalName, finalEmail, avatarUrl || null, provider || 'local', role]);
    const u = result.rows[0];

    // Garante preferências padrão
    await pool.query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING;`,
      [u.id]
    );

    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatar_url,
      provider: u.auth_provider,
      isEmailVerified: u.is_email_verified,
      role: u.role || 'user',
      isBlocked: Boolean(u.is_blocked),
      createdAt: u.created_at
    });
  } catch (err) {
    console.error('Erro ao sincronizar usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ADMIN API ROUTES (Apenas Administrador AppFit)
// ============================================================================

// Lista usuários completos com estatísticas para o painel de administração
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.is_blocked, 
        u.created_at,
        COALESCE((SELECT count(*) FROM workout_programs wp WHERE wp.user_id = u.id AND wp.is_active = true), 0)::int as programs_count,
        COALESCE((SELECT count(*) FROM workout_days wd JOIN workout_programs wp ON wp.id = wd.program_id WHERE wp.user_id = u.id), 0)::int as days_count,
        COALESCE((SELECT count(*) FROM exercises ex JOIN workout_days wd ON wd.id = ex.workout_day_id JOIN workout_programs wp ON wp.id = wd.program_id WHERE wp.user_id = u.id), 0)::int as exercises_count,
        COALESCE((SELECT count(*) FROM workout_sessions ws WHERE ws.user_id = u.id), 0)::int as sessions_count,
        (SELECT MAX(started_at) FROM workout_sessions ws WHERE ws.user_id = u.id) as last_session_at
      FROM users u
      ORDER BY u.role DESC, u.created_at DESC;
    `);

    const users = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role || 'user',
      isBlocked: Boolean(r.is_blocked),
      createdAt: r.created_at,
      programsCount: r.programs_count,
      daysCount: r.days_count,
      exercisesCount: r.exercises_count,
      sessionsCount: r.sessions_count,
      lastSessionAt: r.last_session_at
    }));

    res.json(users);
  } catch (err) {
    console.error('Erro ao listar usuários para o admin:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bloquear / Desbloquear usuário
app.post('/api/admin/users/block', async (req, res) => {
  const { targetUserId, isBlocked } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId é obrigatório' });
  }

  try {
    await pool.query(
      'UPDATE users SET is_blocked = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;',
      [Boolean(isBlocked), targetUserId]
    );
    bumpSyncVersion(targetUserId);
    res.json({ success: true, isBlocked: Boolean(isBlocked) });
  } catch (err) {
    console.error('Erro ao bloquear usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// Apagar os treinos de um usuário específico
app.post('/api/admin/users/delete-workouts', async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId é obrigatório' });
  }

  try {
    await pool.query('DELETE FROM workout_programs WHERE user_id = $1;', [targetUserId]);
    bumpSyncVersion(targetUserId);
    res.json({ success: true, message: 'Treinos do usuário removidos com sucesso!' });
  } catch (err) {
    console.error('Erro ao apagar treinos do usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// Apagar um usuário do sistema (Exclusão definitiva e profunda)
app.post('/api/admin/users/delete-user', async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId é obrigatório' });
  }

  try {
    // 1. Remove referências diretas de sessões, histórico de cargas e fichas
    await pool.query('DELETE FROM workout_session_sets WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = $1);', [targetUserId]);
    await pool.query('DELETE FROM workout_session_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = $1);', [targetUserId]);
    await pool.query('DELETE FROM workout_sessions WHERE user_id = $1;', [targetUserId]);
    await pool.query('DELETE FROM exercise_weight_history WHERE user_id = $1;', [targetUserId]);
    await pool.query('DELETE FROM exercise_sets WHERE exercise_id IN (SELECT e.id FROM exercises e JOIN workout_days d ON e.workout_day_id = d.id JOIN workout_programs p ON d.program_id = p.id WHERE p.user_id = $1);', [targetUserId]);
    await pool.query('DELETE FROM exercises WHERE workout_day_id IN (SELECT d.id FROM workout_days d JOIN workout_programs p ON d.program_id = p.id WHERE p.user_id = $1);', [targetUserId]);
    await pool.query('DELETE FROM workout_days WHERE program_id IN (SELECT id FROM workout_programs WHERE user_id = $1);', [targetUserId]);
    await pool.query('DELETE FROM workout_programs WHERE user_id = $1;', [targetUserId]);
    await pool.query('DELETE FROM workout_cycles WHERE user_id = $1;', [targetUserId]);
    await pool.query('DELETE FROM user_preferences WHERE user_id = $1;', [targetUserId]);

    // 2. Remove o próprio usuário do banco
    const result = await pool.query("DELETE FROM users WHERE id = $1 AND role != 'admin' RETURNING id, email, name;", [targetUserId]);

    bumpSyncVersion(targetUserId);
    res.json({
      success: true,
      message: 'Usuário e todos os seus treinos e dados foram removidos definitivamente!',
      deletedUser: result.rows[0] || null
    });
  } catch (err) {
    console.error('Erro ao remover usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// Limpar históricos de treinos (antigos ou gerais)
app.post('/api/admin/history/cleanup', async (req, res) => {
  const { targetUserId, olderThanDays, clearAll } = req.body;

  try {
    if (clearAll) {
      if (targetUserId) {
        await pool.query('DELETE FROM workout_sessions WHERE user_id = $1;', [targetUserId]);
      } else {
        await pool.query('TRUNCATE TABLE workout_sessions, workout_session_exercises, workout_session_sets, exercise_weight_history CASCADE;');
      }
    } else if (olderThanDays && olderThanDays > 0) {
      if (targetUserId) {
        await pool.query(
          `DELETE FROM workout_sessions 
           WHERE user_id = $1 AND started_at < (CURRENT_TIMESTAMP - ($2 || ' days')::interval);`,
          [targetUserId, olderThanDays]
        );
      } else {
        await pool.query(
          `DELETE FROM workout_sessions 
           WHERE started_at < (CURRENT_TIMESTAMP - ($1 || ' days')::interval);`,
          [olderThanDays]
        );
      }
    }

    if (targetUserId) bumpSyncVersion(targetUserId);
    res.json({ success: true, message: 'Históricos limpos com sucesso!' });
  } catch (err) {
    console.error('Erro ao limpar histórico:', err);
    res.status(500).json({ error: err.message });
  }
});

// Limpeza total do banco de dados (reseta todos os dados para novo teste do zero)
app.post('/api/reset-all', async (req, res) => {
  try {
    await pool.query(
      'TRUNCATE TABLE users, workout_cycles, workout_programs, workout_days, exercises, exercise_sets, workout_sessions, workout_session_exercises, workout_session_sets, exercise_weight_history, user_preferences CASCADE;'
    );
    userSyncVersions.clear();
    console.log('[AppFit Backend] Banco de dados PostgreSQL resetado com sucesso.');
    res.json({ success: true, message: 'Banco de dados totalmente zerado.' });
  } catch (err) {
    console.error('Erro ao resetar banco:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. SINCRONIZAÇÃO E VERSÕES (POLLING BIDIRECIONAL)
// ============================================================================
app.get('/api/sync/version', (req, res) => {
  const userId = req.query.userId;
  res.json(getSyncVersion(userId));
});

// ============================================================================
// 3. WORKOUTS (FICHA DE TREINO E PROGRAMAS)
// ============================================================================

// Carrega os treinos completos do usuário direto do PostgreSQL
app.get('/api/workouts', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    // 1. Busca programa ativo
    const progRes = await pool.query(
      'SELECT id, title, division_type FROM workout_programs WHERE user_id = $1 AND is_active = true LIMIT 1;',
      [userId]
    );

    if (progRes.rows.length === 0) {
      return res.json({ workoutDays: [], cycle: null, divisionType: 'alphabetical' });
    }

    const program = progRes.rows[0];

    // 2. Busca ciclo ativo
    const cycleRes = await pool.query(
      'SELECT id, name, start_date, end_date, duration_weeks, duration_months, is_active FROM workout_cycles WHERE user_id = $1 AND is_active = true LIMIT 1;',
      [userId]
    );
    const cycle = cycleRes.rows.length > 0 ? {
      startDate: cycleRes.rows[0].start_date,
      endDate: cycleRes.rows[0].end_date,
      durationWeeks: cycleRes.rows[0].duration_weeks,
      durationMonths: cycleRes.rows[0].duration_months,
      isActive: cycleRes.rows[0].is_active
    } : null;

    // 3. Busca dias de treino
    const daysRes = await pool.query(
      'SELECT id, day_code, day_name, title, short_label, category_badge, subtitle, order_index, is_rest_day FROM workout_days WHERE program_id = $1 ORDER BY order_index ASC;',
      [program.id]
    );

    if (daysRes.rows.length === 0) {
      return res.json({ workoutDays: [], cycle, divisionType: program.division_type });
    }

    const dayIds = daysRes.rows.map(d => d.id);

    // 4. Busca exercícios
    const exRes = await pool.query(
      `SELECT id, workout_day_id, category, name, order_index, series_count, reps_description, rest_description, orientation, is_optional, is_expanded, last_weight 
       FROM exercises WHERE workout_day_id = ANY($1) ORDER BY order_index ASC;`,
      [dayIds]
    );

    const exerciseIds = exRes.rows.map(e => e.id);

    // 5. Busca séries
    let setsRes = { rows: [] };
    if (exerciseIds.length > 0) {
      setsRes = await pool.query(
        `SELECT id, exercise_id, set_number, target_reps, current_weight, is_completed, completed_at 
         FROM exercise_sets WHERE exercise_id = ANY($1) ORDER BY set_number ASC;`,
        [exerciseIds]
      );
    }

    // 6. Busca histórico de carga
    let histRes = { rows: [] };
    if (exerciseIds.length > 0) {
      histRes = await pool.query(
        `SELECT id, exercise_id, recorded_at, weight, reps, notes 
         FROM exercise_weight_history WHERE exercise_id = ANY($1) ORDER BY recorded_at ASC;`,
        [exerciseIds]
      );
    }

    // Agrupa séries e históricos por exercício
    const setsByEx = new Map();
    for (const s of setsRes.rows) {
      if (!setsByEx.has(s.exercise_id)) setsByEx.set(s.exercise_id, []);
      setsByEx.get(s.exercise_id).push({
        id: s.id,
        setNumber: s.set_number,
        targetReps: s.target_reps,
        weight: parseFloat(s.current_weight) || 0,
        completed: Boolean(s.is_completed),
        completedAt: s.completed_at
      });
    }

    const histByEx = new Map();
    for (const h of histRes.rows) {
      if (!histByEx.has(h.exercise_id)) histByEx.set(h.exercise_id, []);
      histByEx.get(h.exercise_id).push({
        id: h.id,
        date: h.recorded_at,
        weight: parseFloat(h.weight) || 0,
        reps: h.reps,
        notes: h.notes
      });
    }

    // Agrupa exercícios por dia
    const exByDay = new Map();
    for (const e of exRes.rows) {
      if (!exByDay.has(e.workout_day_id)) exByDay.set(e.workout_day_id, []);
      exByDay.get(e.workout_day_id).push({
        id: e.id,
        order: e.order_index,
        name: e.name,
        category: e.category,
        seriesCount: e.series_count,
        repsDescription: e.reps_description,
        restDescription: e.rest_description,
        suggestedRestOptions: [45, 60, 90, 120],
        orientation: e.orientation || '',
        isOptional: Boolean(e.is_optional),
        isExpanded: e.is_expanded !== false,
        lastWeight: parseFloat(e.last_weight) || 0,
        sets: setsByEx.get(e.id) || [],
        weightHistory: histByEx.get(e.id) || []
      });
    }

    // Monta WorkoutDay[] completo
    const workoutDays = daysRes.rows.map(d => ({
      id: d.id,
      dayCode: d.day_code,
      dayName: d.day_name,
      title: d.title,
      shortLabel: d.short_label,
      categoryBadge: d.category_badge,
      subtitle: d.subtitle,
      divisionType: program.division_type,
      exercises: exByDay.get(d.id) || []
    }));

    res.json({
      programId: program.id,
      divisionType: program.division_type,
      cycle,
      workoutDays
    });
  } catch (err) {
    console.error('Erro ao buscar treinos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Salva / substitui toda a ficha de treinos no PostgreSQL (transacional)
app.post('/api/workouts', async (req, res) => {
  const { userId, workoutDays, cycle, divisionType } = req.body;
  if (!userId || !workoutDays) {
    return res.status(400).json({ error: 'userId e workoutDays são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Salva ou atualiza Ciclo
    let cycleId = null;
    if (cycle) {
      cycleId = `cycle-${userId}`;
      await client.query(
        `INSERT INTO workout_cycles (id, user_id, name, start_date, end_date, duration_weeks, duration_months, is_active)
         VALUES ($1, $2, 'Ciclo Regular', $3, $4, $5, $6, true)
         ON CONFLICT (id) DO UPDATE SET
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           duration_weeks = EXCLUDED.duration_weeks,
           duration_months = EXCLUDED.duration_months,
           updated_at = CURRENT_TIMESTAMP;`,
        [cycleId, userId, cycle.startDate || new Date(), cycle.endDate || new Date(), cycle.durationWeeks || 4, cycle.durationMonths || 1]
      );
    }

    // 2. Cria ou atualiza Programa Ativo
    const progId = `prog-${userId}`;
    const divType = divisionType || workoutDays[0]?.divisionType || 'alphabetical';
    await client.query(
      `INSERT INTO workout_programs (id, user_id, cycle_id, title, division_type, is_active)
       VALUES ($1, $2, $3, 'Programa de Treino', $4, true)
       ON CONFLICT (id) DO UPDATE SET
         cycle_id = EXCLUDED.cycle_id,
         division_type = EXCLUDED.division_type,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP;`,
      [progId, userId, cycleId, divType]
    );

    // 3. Limpa dias antigos deste programa (CASCADE limpa exercises e sets)
    await client.query('DELETE FROM workout_days WHERE program_id = $1;', [progId]);

    // 4. Insere dias, exercícios e séries
    for (let dIdx = 0; dIdx < workoutDays.length; dIdx++) {
      const day = workoutDays[dIdx];
      const dayId = day.id || `day-${Date.now()}-${dIdx}`;
      await client.query(
        `INSERT INTO workout_days (id, program_id, day_code, day_name, title, short_label, category_badge, subtitle, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          dayId,
          progId,
          day.dayCode || `T${dIdx + 1}`,
          day.dayName || day.title,
          day.title,
          day.shortLabel || day.dayName || 'Treino',
          day.categoryBadge || 'TREINO',
          day.subtitle || `${day.exercises?.length || 0} exercícios`,
          dIdx + 1
        ]
      );

      if (day.exercises && day.exercises.length > 0) {
        for (let eIdx = 0; eIdx < day.exercises.length; eIdx++) {
          const ex = day.exercises[eIdx];
          const exId = ex.id || `ex-${Date.now()}-${dIdx}-${eIdx}`;
          const maxWeight = Math.max(0, ...(ex.sets?.map(s => s.weight) || [0]), ex.lastWeight || 0);

          await client.query(
            `INSERT INTO exercises (id, workout_day_id, category, name, order_index, series_count, reps_description, rest_description, orientation, is_optional, is_expanded, last_weight)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
            [
              exId,
              dayId,
              ex.category || 'Geral',
              ex.name,
              eIdx + 1,
              ex.seriesCount || ex.sets?.length || 3,
              ex.repsDescription || '3x 10',
              ex.restDescription || '60s',
              ex.orientation || '',
              Boolean(ex.isOptional),
              ex.isExpanded !== false,
              maxWeight
            ]
          );

          if (ex.sets && ex.sets.length > 0) {
            for (let sIdx = 0; sIdx < ex.sets.length; sIdx++) {
              const s = ex.sets[sIdx];
              const setId = s.id || `set-${Date.now()}-${dIdx}-${eIdx}-${sIdx}`;
              await client.query(
                `INSERT INTO exercise_sets (id, exercise_id, set_number, target_reps, current_weight, is_completed)
                 VALUES ($1, $2, $3, $4, $5, $6);`,
                [
                  setId,
                  exId,
                  s.setNumber || sIdx + 1,
                  s.targetReps || '10',
                  parseFloat(s.weight) || 0,
                  Boolean(s.completed)
                ]
              );
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    bumpSyncVersion(userId);
    res.json({ success: true, message: 'Treinos salvos no PostgreSQL com sucesso!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar treinos:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Atualiza uma série individual (Marcação Feito / Atualização de Carga em tempo real)
app.patch('/api/workouts/set', async (req, res) => {
  const { userId, exerciseId, setId, completed, weight } = req.body;
  if (!setId) {
    return res.status(400).json({ error: 'setId é obrigatório' });
  }

  try {
    if (completed !== undefined) {
      await pool.query(
        `UPDATE exercise_sets 
         SET is_completed = $1, 
             completed_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [Boolean(completed), setId]
      );
    }

    if (weight !== undefined) {
      const parsedWeight = parseFloat(weight) || 0;
      await pool.query(
        `UPDATE exercise_sets 
         SET current_weight = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [parsedWeight, setId]
      );

      if (exerciseId) {
        await pool.query(
          `UPDATE exercises 
           SET last_weight = GREATEST(last_weight, $1),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2;`,
          [parsedWeight, exerciseId]
        );
      }
    }

    bumpSyncVersion(userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar série:', err);
    res.status(500).json({ error: err.message });
  }
});

// Adiciona uma nova série a um exercício
app.post('/api/workouts/add-set', async (req, res) => {
  const { userId, exerciseId, newSet } = req.body;
  if (!exerciseId || !newSet) {
    return res.status(400).json({ error: 'exerciseId e newSet são obrigatórios' });
  }

  try {
    await pool.query(
      `INSERT INTO exercise_sets (id, exercise_id, set_number, target_reps, current_weight, is_completed)
       VALUES ($1, $2, $3, $4, $5, false);`,
      [newSet.id, exerciseId, newSet.setNumber, newSet.targetReps || '10', parseFloat(newSet.weight) || 0]
    );

    await pool.query(
      `UPDATE exercises 
       SET series_count = (SELECT COUNT(*) FROM exercise_sets WHERE exercise_id = $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [exerciseId]
    );

    bumpSyncVersion(userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao adicionar série:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove múltiplas séries selecionadas
app.post('/api/workouts/delete-sets', async (req, res) => {
  const { userId, exerciseId, setIds } = req.body;
  if (!exerciseId || !setIds || !Array.isArray(setIds)) {
    return res.status(400).json({ error: 'exerciseId e array de setIds são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove as séries escolhidas
    await client.query('DELETE FROM exercise_sets WHERE id = ANY($1) AND exercise_id = $2;', [setIds, exerciseId]);

    // Renumera as séries restantes 1, 2, 3...
    const remaining = await client.query(
      'SELECT id FROM exercise_sets WHERE exercise_id = $1 ORDER BY set_number ASC;',
      [exerciseId]
    );

    for (let i = 0; i < remaining.rows.length; i++) {
      await client.query('UPDATE exercise_sets SET set_number = $1 WHERE id = $2;', [i + 1, remaining.rows[i].id]);
    }

    // Atualiza series_count
    await client.query('UPDATE exercises SET series_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [
      remaining.rows.length,
      exerciseId
    ]);

    await client.query('COMMIT');
    bumpSyncVersion(userId);
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover séries:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Remove um exercício completo
app.post('/api/workouts/delete-exercise', async (req, res) => {
  const { userId, exerciseId, workoutDayId } = req.body;
  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId é obrigatório' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM exercises WHERE id = $1;', [exerciseId]);

    if (workoutDayId) {
      // Renumera a ordem dos exercícios restantes no dia
      const remaining = await client.query(
        'SELECT id FROM exercises WHERE workout_day_id = $1 ORDER BY order_index ASC;',
        [workoutDayId]
      );
      for (let i = 0; i < remaining.rows.length; i++) {
        await client.query('UPDATE exercises SET order_index = $1 WHERE id = $2;', [i + 1, remaining.rows[i].id]);
      }
      await client.query(
        `UPDATE workout_days SET subtitle = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [`${remaining.rows.length} exercícios planejados`, workoutDayId]
      );
    }

    await client.query('COMMIT');
    bumpSyncVersion(userId);
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover exercício:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Zera as marcações de conclusão de um dia de treino (mantendo as cargas salvas)
app.post('/api/workouts/reset-day', async (req, res) => {
  const { userId, dayId } = req.body;
  if (!dayId) {
    return res.status(400).json({ error: 'dayId é obrigatório' });
  }

  try {
    await pool.query(
      `UPDATE exercise_sets 
       SET is_completed = false, 
           completed_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE exercise_id IN (SELECT id FROM exercises WHERE workout_day_id = $1);`,
      [dayId]
    );
    bumpSyncVersion(userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao zerar marcações do dia:', err);
    res.status(500).json({ error: err.message });
  }
});

// Zera todos os treinos do usuário no PostgreSQL
app.delete('/api/workouts', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    await pool.query('DELETE FROM workout_programs WHERE user_id = $1;', [userId]);
    bumpSyncVersion(userId);
    res.json({ success: true, message: 'Treinos do usuário removidos com sucesso!' });
  } catch (err) {
    console.error('Erro ao limpar treinos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. SESSÕES DE TREINO CONCLUÍDAS E HISTÓRICO
// ============================================================================

// Registra uma sessão de treino concluída (com comentário e tempo)
app.post('/api/sessions', async (req, res) => {
  const {
    id,
    userId,
    workoutDayId,
    workoutTitle,
    dayName,
    startedAt,
    endedAt,
    durationSeconds,
    totalSets,
    completedSets,
    comment,
    exercisesSummary
  } = req.body;

  if (!userId || !workoutTitle) {
    return res.status(400).json({ error: 'userId e workoutTitle são obrigatórios' });
  }

  const sessionId = id || `sess-${Date.now()}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insere a sessão
    await client.query(
      `INSERT INTO workout_sessions 
       (id, user_id, workout_day_id, workout_title, day_name, started_at, ended_at, duration_seconds, status, total_sets, completed_sets, user_comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, $10, $11);`,
      [
        sessionId,
        userId,
        workoutDayId || null,
        workoutTitle,
        dayName || 'Treino',
        startedAt || new Date().toISOString(),
        endedAt || new Date().toISOString(),
        durationSeconds || 0,
        totalSets || 0,
        completedSets || 0,
        comment || ''
      ]
    );

    // 2. Insere o resumo dos exercícios e atualiza histórico de carga
    if (exercisesSummary && Array.isArray(exercisesSummary)) {
      for (let i = 0; i < exercisesSummary.length; i++) {
        const item = exercisesSummary[i];
        const exSummaryId = `sum-${sessionId}-${i}`;
        const maxW = parseFloat(item.maxWeight) || 0;

        await client.query(
          `INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_name, completed_sets, max_weight, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [exSummaryId, sessionId, item.id || null, item.name, item.completedSets || 0, maxW, i + 1]
        );

        // Se houve carga registrada e temos o id do exercício, grava no histórico de progressão
        if (maxW > 0 && item.id) {
          const whId = `wh-${Date.now()}-${item.id}`;
          await client.query(
            `INSERT INTO exercise_weight_history (id, user_id, exercise_id, session_id, recorded_at, weight, reps, notes)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7);`,
            [whId, userId, item.id, sessionId, maxW, `${item.completedSets || 0} séries`, comment || null]
          );
        }
      }
    }

    // 3. Zera os exercícios marcados na ficha ativa após encerrar treino
    if (workoutDayId) {
      await client.query(
        `UPDATE exercise_sets 
         SET is_completed = false, 
             completed_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE exercise_id IN (SELECT id FROM exercises WHERE workout_day_id = $1);`,
        [workoutDayId]
      );
    }

    await client.query('COMMIT');
    bumpSyncVersion(userId);
    res.json({ success: true, sessionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar sessão de treino:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Busca histórico de treinos concluídos (para o calendário)
app.get('/api/sessions', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    const sessionsRes = await pool.query(
      `SELECT id, workout_day_id, workout_title, day_name, started_at, ended_at, duration_seconds, total_sets, completed_sets, user_comment 
       FROM workout_sessions 
       WHERE user_id = $1 
       ORDER BY started_at DESC;`,
      [userId]
    );

    if (sessionsRes.rows.length === 0) {
      return res.json([]);
    }

    const sessionIds = sessionsRes.rows.map(s => s.id);
    const exRes = await pool.query(
      `SELECT session_id, exercise_id, exercise_name, completed_sets, max_weight 
       FROM workout_session_exercises 
       WHERE session_id = ANY($1) 
       ORDER BY order_index ASC;`,
      [sessionIds]
    );

    const exBySession = new Map();
    for (const row of exRes.rows) {
      if (!exBySession.has(row.session_id)) exBySession.set(row.session_id, []);
      exBySession.get(row.session_id).push({
        id: row.exercise_id,
        name: row.exercise_name,
        completedSets: row.completed_sets,
        maxWeight: parseFloat(row.max_weight) || 0
      });
    }

    const records = sessionsRes.rows.map(s => ({
      id: s.id,
      workoutDayId: s.workout_day_id,
      workoutTitle: s.workout_title,
      dayName: s.day_name,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationSeconds: s.duration_seconds,
      totalSets: s.total_sets,
      completedSets: s.completed_sets,
      comment: s.user_comment || '',
      exercisesSummary: exBySession.get(s.id) || []
    }));

    res.json(records);
  } catch (err) {
    console.error('Erro ao buscar histórico de sessões:', err);
    res.status(500).json({ error: err.message });
  }
});

// Busca histórico de evolução de carga de um exercício específico
app.get('/api/history/weight', async (req, res) => {
  const { exerciseId, userId } = req.query;
  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId é obrigatório' });
  }

  try {
    const result = await pool.query(
      `SELECT id, recorded_at, weight, reps, notes 
       FROM exercise_weight_history 
       WHERE exercise_id = $1 
       ORDER BY recorded_at ASC;`,
      [exerciseId]
    );

    const history = result.rows.map(r => ({
      id: r.id,
      date: r.recorded_at,
      weight: parseFloat(r.weight) || 0,
      reps: r.reps,
      notes: r.notes
    }));

    res.json(history);
  } catch (err) {
    console.error('Erro ao buscar histórico de peso:', err);
    res.status(500).json({ error: err.message });
  }
});

// Inicia o servidor HTTP
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AppFit Backend] Servidor Express ativo em http://0.0.0.0:${PORT} conectado ao PostgreSQL`);
});
