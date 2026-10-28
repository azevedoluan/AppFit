-- ==============================================================================
-- AppFit - Initial Seed Data for PostgreSQL
-- ==============================================================================

-- 1. Inserção de categorias de exercícios
INSERT INTO exercise_categories (code, name, color_hex) VALUES
('peito', 'Peito', '#06b6d4'),
('triceps', 'Tríceps', '#3b82f6'),
('costas', 'Costas', '#10b981'),
('biceps', 'Bíceps', '#8b5cf6'),
('pernas', 'Membros Inferiores (Pernas)', '#f59e0b'),
('ombros', 'Ombros / Deltoides', '#ec4899'),
('abdomen', 'Abdômen / Core', '#14b8a6'),
('cardio', 'Cardiorrespiratório', '#ef4444')
ON CONFLICT (code) DO NOTHING;

-- 2. Inserção de usuário padrão
INSERT INTO users (id, name, email, auth_provider, is_email_verified) VALUES
('user-default-001', 'Luan Azevedo', 'luan@appfit.com', 'email', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

-- 3. Preferências do usuário
INSERT INTO user_preferences (user_id, default_rest_seconds, sound_enabled, vibration_enabled, screen_wake_lock_enabled, theme) VALUES
('user-default-001', 60, true, true, true, 'dark')
ON CONFLICT (user_id) DO NOTHING;

-- 4. Ciclo de Treino
INSERT INTO workout_cycles (id, user_id, name, start_date, end_date, duration_weeks, duration_months, is_active) VALUES
('cycle-001', 'user-default-001', 'Ciclo Regular', CURRENT_DATE, CURRENT_DATE + INTERVAL '28 days', 4, 1, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Programa de Treino A/B/C
INSERT INTO workout_programs (id, user_id, cycle_id, title, division_type, is_active) VALUES
('prog-001', 'user-default-001', 'cycle-001', 'Programa de Treino A/B/C', 'alphabetical', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Dias / Rotinas de Treino
INSERT INTO workout_days (id, program_id, day_code, day_name, title, short_label, category_badge, subtitle, order_index, is_rest_day) VALUES
('day-a', 'prog-001', 'A', 'Treino A', 'Treino A - Peito, Deltoides e Tríceps', 'Treino A', 'SUPERIORES • A', '3 exercícios planejados', 1, false),
('day-b', 'prog-001', 'B', 'Treino B', 'Treino B - Membros Inferiores', 'Treino B', 'INFERIORES • B', '3 exercícios planejados', 2, false),
('day-c', 'prog-001', 'C', 'Treino C', 'Treino C - Costas, Bíceps e Core', 'Treino C', 'COSTAS E BÍCEPS • C', '3 exercícios planejados', 3, false)
ON CONFLICT (id) DO NOTHING;

-- 7. Exercícios do Treino A
INSERT INTO exercises (id, workout_day_id, category_id, category, name, order_index, series_count, reps_description, rest_description, orientation, last_weight) VALUES
('ex-a-1', 'day-a', 1, 'Peito', 'Supino Reto com Barra', 1, 3, '3x 8 a 10', '60s', 'Mantenha os cotovelos a 45 graus do tronco e escápulas aduzidas.', 60.00),
('ex-a-2', 'day-a', 6, 'Ombros / Deltoides', 'Desenvolvimento Halteres', 2, 3, '3x 10 a 12', '60s', 'Suba os halteres sem bater no topo, mantendo postura ereta.', 18.00),
('ex-a-3', 'day-a', 2, 'Tríceps', 'Tríceps Polia Corda', 3, 3, '3x 12 a 15', '60s', 'Abra a corda no final do movimento para contração máxima.', 25.00)
ON CONFLICT (id) DO NOTHING;

-- 8. Séries do Exercício Supino Reto (ex-a-1)
INSERT INTO exercise_sets (id, exercise_id, set_number, target_reps, current_weight, is_completed) VALUES
('set-a1-1', 'ex-a-1', 1, '8 a 10', 50.00, false),
('set-a1-2', 'ex-a-1', 2, '8 a 10', 55.00, false),
('set-a1-3', 'ex-a-1', 3, '8 a 10', 60.00, false)
ON CONFLICT (id) DO NOTHING;

-- Séries do Desenvolvimento (ex-a-2)
INSERT INTO exercise_sets (id, exercise_id, set_number, target_reps, current_weight, is_completed) VALUES
('set-a2-1', 'ex-a-2', 1, '10 a 12', 16.00, false),
('set-a2-2', 'ex-a-2', 2, '10 a 12', 18.00, false),
('set-a2-3', 'ex-a-2', 3, '10 a 12', 18.00, false)
ON CONFLICT (id) DO NOTHING;

-- Séries do Tríceps Corda (ex-a-3)
INSERT INTO exercise_sets (id, exercise_id, set_number, target_reps, current_weight, is_completed) VALUES
('set-a3-1', 'ex-a-3', 1, '12 a 15', 20.00, false),
('set-a3-2', 'ex-a-3', 2, '12 a 15', 25.00, false),
('set-a3-3', 'ex-a-3', 3, '12 a 15', 25.00, false)
ON CONFLICT (id) DO NOTHING;

-- 9. Histórico de Cargas Prévias (Evolução)
INSERT INTO exercise_weight_history (id, user_id, exercise_id, recorded_at, weight, reps, notes) VALUES
('wh-001', 'user-default-001', 'ex-a-1', CURRENT_TIMESTAMP - INTERVAL '14 days', 50.00, '10 reps', 'Carga inicial'),
('wh-002', 'user-default-001', 'ex-a-1', CURRENT_TIMESTAMP - INTERVAL '7 days', 55.00, '9 reps', 'Aumento seguro'),
('wh-003', 'user-default-001', 'ex-a-1', CURRENT_TIMESTAMP - INTERVAL '2 days', 60.00, '8 reps', '+5kg Novo recorde pessoal!')
ON CONFLICT (id) DO NOTHING;

-- 10. Sessão de Treino Concluída para Histórico
INSERT INTO workout_sessions (id, user_id, workout_day_id, workout_title, day_name, started_at, ended_at, duration_seconds, status, total_sets, completed_sets, user_comment) VALUES
('sess-001', 'user-default-001', 'day-a', 'Treino A - Peito, Deltoides e Tríceps', 'Treino A', CURRENT_TIMESTAMP - INTERVAL '2 days' - INTERVAL '48 minutes', CURRENT_TIMESTAMP - INTERVAL '2 days', 2880, 'completed', 9, 9, 'Treino muito bom! Consegui progredir carga no supino.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_name, completed_sets, max_weight, order_index) VALUES
('sess-ex-1', 'sess-001', 'ex-a-1', 'Supino Reto com Barra', 3, 60.00, 1),
('sess-ex-2', 'sess-001', 'ex-a-2', 'Desenvolvimento Halteres', 3, 18.00, 2),
('sess-ex-3', 'sess-001', 'ex-a-3', 'Tríceps Polia Corda', 3, 25.00, 3)
ON CONFLICT (id) DO NOTHING;
