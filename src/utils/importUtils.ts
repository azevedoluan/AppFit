import * as XLSX from 'xlsx';
import type { WorkoutDay, Exercise, ExerciseSet, DayCode } from '../types/workout';

export function parseDayCode(header: string): { code: DayCode; name: string } {
  const upper = header.toUpperCase();
  if (upper.includes('SEG')) return { code: 'SEG', name: 'Segunda' };
  if (upper.includes('TER')) return { code: 'TER', name: 'Terça' };
  if (upper.includes('QUA')) return { code: 'QUA', name: 'Quarta' };
  if (upper.includes('QUI')) return { code: 'QUI', name: 'Quinta' };
  if (upper.includes('SEX')) return { code: 'SEX', name: 'Sexta' };
  if (upper.includes('SAB') || upper.includes('SÁB')) return { code: 'SAB', name: 'Sábado' };
  return { code: 'DOM', name: 'Domingo' };
}

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('aquec') || n.includes('mobilidade')) return 'AQUECIMENTO';
  if (n.includes('quadríceps') || n.includes('extensora')) return 'QUADRÍCEPS';
  if (n.includes('flexora') || n.includes('stiff')) return 'POSTERIOR COXA';
  if (n.includes('leg press') || n.includes('agachamento')) return 'COMPOSTO';
  if (n.includes('abdutora') || n.includes('glúteo') || n.includes('elevacao pelvica')) return 'GLÚTEO';
  if (n.includes('panturrilha')) return 'PANTURRILHAS';
  if (n.includes('supino') || n.includes('crucifixo') || n.includes('peitoral')) return 'PEITORAL';
  if (n.includes('remada') || n.includes('puxada') || n.includes('dorsal')) return 'COSTAS';
  if (n.includes('elevação lateral') || n.includes('desenvolvimento') || n.includes('ombro')) return 'OMBROS';
  if (n.includes('bíceps') || n.includes('biceps') || n.includes('rosca')) return 'BÍCEPS';
  if (n.includes('tríceps') || n.includes('triceps')) return 'TRÍCEPS';
  if (n.includes('abdominal') || n.includes('bracing') || n.includes('prancha') || n.includes('core')) return 'CORE';
  if (n.includes('bicicleta') || n.includes('aeróbico') || n.includes('caminhada') || n.includes('esteira')) return 'CARDIO';
  if (n.includes('marcha') || n.includes('bird dog') || n.includes('funcional')) return 'FUNCIONAL';
  return 'GERAL';
}

function buildSets(seriesCount: number, repsDescription: string): ExerciseSet[] {
  const count = Math.max(1, isNaN(seriesCount) ? 2 : seriesCount);
  return Array.from({ length: count }, (_, idx) => ({
    id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx + 1}`,
    setNumber: idx + 1,
    targetReps: repsDescription || '10-12 reps',
    weight: 0,
    completed: false
  }));
}

// Parse Excel Workbook or CSV
export function parseSpreadsheet(data: ArrayBuffer): WorkoutDay[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const parsedDays: WorkoutDay[] = [];
  let currentDay: WorkoutDay | null = null;
  let order = 1;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    if (!firstCell) continue;

    // Check if row is a Day Header (e.g. "SEGUNDA — SUPERIORES A", "TERÇA — INFERIORES A")
    const isDayHeader = /^(SEGUNDA|TERÇA|TERCA|QUARTA|QUINTA|SEXTA|SÁBADO|SABADO|DOMINGO)/i.test(firstCell);

    if (isDayHeader) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
        parsedDays.push(currentDay);
      }

      const { code, name } = parseDayCode(firstCell);
      const splitHeader = firstCell.split(/[—–-]/);
      const title = splitHeader.length > 1 ? splitHeader.slice(1).join(' - ').trim() : firstCell;

      currentDay = {
        id: `day-${code.toLowerCase()}-${Date.now()}`,
        dayCode: code,
        dayName: name,
        title: title || `${name}`,
        shortLabel: title.slice(0, 8),
        categoryBadge: title.toUpperCase(),
        subtitle: 'Carregando exercícios...',
        exercises: []
      };
      order = 1;
      continue;
    }

    // Check if this row is a column title (e.g. "Exercício", "Séries", etc.)
    if (/exerc[ií]cio|s[ée]ries/i.test(firstCell)) {
      continue;
    }

    // Check if we are inside a day
    if (currentDay) {
      const name = firstCell;
      const seriesRaw = row[1] !== undefined ? String(row[1]).trim() : '2';
      const seriesCount = parseInt(seriesRaw, 10) || 2;
      const repsDescription = row[2] !== undefined ? String(row[2]).trim() : '10-12 reps';
      const restDescription = row[3] !== undefined ? String(row[3]).trim() : '60-90 s';
      const orientation = row[4] !== undefined ? String(row[4]).trim() : '';

      const exercise: Exercise = {
        id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        order: order++,
        name,
        category: detectCategory(name),
        seriesCount,
        repsDescription,
        restDescription: restDescription || '-',
        suggestedRestOptions: [45, 60, 90, 120],
        orientation: orientation || 'Executar com postura controlada.',
        sets: buildSets(seriesCount, repsDescription),
        isExpanded: true
      };

      currentDay.exercises.push(exercise);
    }
  }

  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
    parsedDays.push(currentDay);
  }

  return parsedDays;
}

// Parse free-form or OCR-extracted text
export function parsePlainTextPlan(text: string): WorkoutDay[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsedDays: WorkoutDay[] = [];
  let currentDay: WorkoutDay | null = null;
  let order = 1;

  for (const line of lines) {
    const isDayHeader = /^(SEGUNDA|TERÇA|TERCA|QUARTA|QUINTA|SEXTA|SÁBADO|SABADO|DOMINGO)/i.test(line);

    if (isDayHeader) {
      if (currentDay && currentDay.exercises.length > 0) {
        currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
        parsedDays.push(currentDay);
      }

      const { code, name } = parseDayCode(line);
      const splitHeader = line.split(/[—–-]/);
      const title = splitHeader.length > 1 ? splitHeader.slice(1).join(' - ').trim() : line;

      currentDay = {
        id: `day-${code.toLowerCase()}-${Date.now()}`,
        dayCode: code,
        dayName: name,
        title: title || name,
        shortLabel: title.slice(0, 8),
        categoryBadge: title.toUpperCase(),
        subtitle: 'Exercícios importados',
        exercises: []
      };
      order = 1;
      continue;
    }

    if (!currentDay) {
      // Default to a day if no day header encountered yet
      currentDay = {
        id: `day-treino-${Date.now()}`,
        dayCode: 'SEG',
        dayName: 'Segunda',
        title: 'Treino A',
        shortLabel: 'Treino A',
        categoryBadge: 'TREINO A',
        subtitle: 'Exercícios importados',
        exercises: []
      };
    }

    // Ignore lines that look like column headers
    if (/exerc[ií]cio|s[ée]ries|repeti/i.test(line)) continue;

    // Split by tabs, pipe, or comma
    const parts = line.split(/[\t|;]/).map(p => p.trim());
    const name = parts[0];
    if (name.length < 3) continue;

    const seriesRaw = parts[1] || '2';
    const seriesCount = parseInt(seriesRaw, 10) || 2;
    const repsDescription = parts[2] || '10-12 reps';
    const restDescription = parts[3] || '60-90 s';
    const orientation = parts[4] || '';

    currentDay.exercises.push({
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: order++,
      name,
      category: detectCategory(name),
      seriesCount,
      repsDescription,
      restDescription,
      suggestedRestOptions: [45, 60, 90, 120],
      orientation: orientation || 'Movimento e respiração controlados.',
      sets: buildSets(seriesCount, repsDescription),
      isExpanded: true
    });
  }

  if (currentDay && currentDay.exercises.length > 0) {
    currentDay.subtitle = `${currentDay.exercises.length} exercícios planejados`;
    parsedDays.push(currentDay);
  }

  return parsedDays;
}

// Export current workouts to Excel spreadsheet
export function exportToExcel(days: WorkoutDay[], userName = 'Luan Azevedo') {
  const rows: (string | number)[][] = [];

  rows.push([`PLANO DE TREINAMENTO — ${userName.toUpperCase()}`]);
  rows.push(['Gerado pelo AppFit - PWA']);
  rows.push([]);

  days.forEach(day => {
    rows.push([`${day.dayName.toUpperCase()} — ${day.title.toUpperCase()}`]);
    rows.push(['Exercício', 'Séries', 'Repetições / duração', 'Descanso', 'Orientações', 'Última Carga (kg)']);
    
    day.exercises.forEach(ex => {
      const lastWeight = ex.sets.find(s => s.weight > 0)?.weight || 0;
      rows.push([
        ex.name,
        ex.seriesCount,
        ex.repsDescription,
        ex.restDescription,
        ex.orientation,
        lastWeight
      ]);
    });
    rows.push([]); // blank line between days
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plano semanal');
  XLSX.writeFile(workbook, `AppFit_Plano_Treino_${userName.replace(/\s+/g, '_')}.xlsx`);
}
