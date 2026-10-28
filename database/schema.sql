-- ==============================================================================
-- AppFit - PostgreSQL Normalized Relational Schema
-- ==============================================================================
-- Sistema Gerenciador de Banco de Dados: PostgreSQL 16+
-- Modelo Normalizado em 3ª Forma Normal (3NF) com integridade referencial,
-- chaves primárias, estrangeiras com regras ON DELETE e constraints de negócio.
-- ==============================================================================

-- Habilita extensão para geração de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. FUNÇÕES AUXILIARES E GATILHOS (TRIGGERS)
-- ==============================================================================

-- Função genérica para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. TABELA DE CATEGORIAS / GRUPOS MUSCULARES (Tabela de Domínio / Lookup)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS exercise_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    color_hex VARCHAR(7) DEFAULT '#06b6d4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE exercise_categories IS 'Domínio normalizado de grupos musculares e categorias de exercício';

-- ==============================================================================
-- 3. TABELA DE USUÁRIOS (users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    avatar_url TEXT,
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_auth_provider CHECK (auth_provider IN ('email', 'google', 'apple', 'local')),
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE users IS 'Armazena credenciais, perfil básico e identidade de autenticação dos usuários';

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 4. PREFERÊNCIAS DO USUÁRIO (user_preferences)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_rest_seconds INTEGER NOT NULL DEFAULT 60,
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    vibration_enabled BOOLEAN NOT NULL DEFAULT true,
    screen_wake_lock_enabled BOOLEAN NOT NULL DEFAULT true,
    theme VARCHAR(30) NOT NULL DEFAULT 'dark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pref_rest_seconds CHECK (default_rest_seconds >= 10 AND default_rest_seconds <= 600)
);

COMMENT ON TABLE user_preferences IS 'Configurações de interface, som e comportamento do usuário';

CREATE TRIGGER set_timestamp_user_preferences
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 5. CICLOS DE TREINO (workout_cycles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_cycles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Ciclo Regular',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    duration_months INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cycle_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_cycle_duration_weeks CHECK (duration_weeks > 0),
    CONSTRAINT chk_cycle_duration_months CHECK (duration_months > 0)
);

COMMENT ON TABLE workout_cycles IS 'Gerencia os períodos e ciclos de treinamento (ex: ciclo de 4 a 12 semanas)';

CREATE TRIGGER set_timestamp_workout_cycles
BEFORE UPDATE ON workout_cycles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 6. PROGRAMAS DE TREINO (workout_programs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_programs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_id VARCHAR(64) REFERENCES workout_cycles(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    division_type VARCHAR(30) NOT NULL DEFAULT 'alphabetical',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_prog_division_type CHECK (division_type IN ('weekly', 'alphabetical'))
);

COMMENT ON TABLE workout_programs IS 'Ficha ou programa ativo do usuário (distribuição por dias da semana ou divisão A/B/C)';

CREATE TRIGGER set_timestamp_workout_programs
BEFORE UPDATE ON workout_programs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 7. DIAS / ROTINAS DO PROGRAMA (workout_days)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_days (
    id VARCHAR(64) PRIMARY KEY,
    program_id VARCHAR(64) NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
    day_code VARCHAR(20) NOT NULL,
    day_name VARCHAR(100) NOT NULL,
    title VARCHAR(150) NOT NULL,
    short_label VARCHAR(50) NOT NULL,
    category_badge VARCHAR(100) NOT NULL,
    subtitle VARCHAR(150),
    order_index INTEGER NOT NULL DEFAULT 1,
    is_rest_day BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_day_order CHECK (order_index > 0),
    CONSTRAINT uq_program_day_code UNIQUE (program_id, day_code)
);

COMMENT ON TABLE workout_days IS 'Rotinas individuais de cada dia ou divisão do programa (ex: Treino A, Terça-feira)';

CREATE TRIGGER set_timestamp_workout_days
BEFORE UPDATE ON workout_days
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 8. EXERCÍCIOS (exercises)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(64) PRIMARY KEY,
    workout_day_id VARCHAR(64) NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES exercise_categories(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    series_count INTEGER NOT NULL DEFAULT 3,
    reps_description VARCHAR(100) NOT NULL,
    rest_description VARCHAR(100) NOT NULL DEFAULT '60s',
    orientation TEXT,
    is_optional BOOLEAN NOT NULL DEFAULT false,
    is_expanded BOOLEAN NOT NULL DEFAULT true,
    last_weight NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ex_order CHECK (order_index > 0),
    CONSTRAINT chk_ex_series_count CHECK (series_count > 0),
    CONSTRAINT chk_ex_last_weight CHECK (last_weight >= 0),
    CONSTRAINT uq_day_exercise_order UNIQUE (workout_day_id, order_index) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE exercises IS 'Exercícios cadastrados dentro de uma rotina ou dia de treino';

CREATE TRIGGER set_timestamp_exercises
BEFORE UPDATE ON exercises
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 9. SÉRIES PLANEJADAS DOS EXERCÍCIOS (exercise_sets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS exercise_sets (
    id VARCHAR(64) PRIMARY KEY,
    exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    target_reps VARCHAR(50) NOT NULL,
    current_weight NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_set_number CHECK (set_number > 0),
    CONSTRAINT chk_set_weight CHECK (current_weight >= 0),
    CONSTRAINT uq_exercise_set_number UNIQUE (exercise_id, set_number) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE exercise_sets IS 'Configuração de séries de cada exercício (número, repetições alvo e carga atual)';

CREATE TRIGGER set_timestamp_exercise_sets
BEFORE UPDATE ON exercise_sets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 10. SESSÕES DE TREINO / HISTÓRICO DE EXECUÇÃO (workout_sessions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_day_id VARCHAR(64) REFERENCES workout_days(id) ON DELETE SET NULL,
    workout_title VARCHAR(150) NOT NULL,
    day_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    total_sets INTEGER NOT NULL DEFAULT 0,
    completed_sets INTEGER NOT NULL DEFAULT 0,
    user_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_duration CHECK (duration_seconds >= 0),
    CONSTRAINT chk_session_status CHECK (status IN ('in_progress', 'completed', 'canceled')),
    CONSTRAINT chk_session_sets_count CHECK (total_sets >= 0 AND completed_sets >= 0)
);

COMMENT ON TABLE workout_sessions IS 'Histórico de cada treino iniciado e finalizado com duração, data e comentário do usuário';

-- ==============================================================================
-- 11. RESUMO DOS EXERCÍCIOS NA SESSÃO (workout_session_exercises)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id VARCHAR(64) REFERENCES exercises(id) ON DELETE SET NULL,
    exercise_name VARCHAR(200) NOT NULL,
    completed_sets INTEGER NOT NULL DEFAULT 0,
    max_weight NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    order_index INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_session_ex_sets CHECK (completed_sets >= 0),
    CONSTRAINT chk_session_ex_weight CHECK (max_weight >= 0)
);

COMMENT ON TABLE workout_session_exercises IS 'Sumário por exercício realizado em uma sessão de treino concluída';

-- ==============================================================================
-- 12. LOG DETALHADO DE CADA SÉRIE EXECUTADA (workout_session_sets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_session_sets (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id VARCHAR(64) REFERENCES exercises(id) ON DELETE SET NULL,
    exercise_name VARCHAR(200) NOT NULL,
    set_number INTEGER NOT NULL,
    reps_completed VARCHAR(50),
    weight_used NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_set_number CHECK (set_number > 0),
    CONSTRAINT chk_session_set_weight CHECK (weight_used >= 0)
);

COMMENT ON TABLE workout_session_sets IS 'Auditoria e histórico detalhado série a série de cada execução no treino';

-- ==============================================================================
-- 13. HISTÓRICO DE CARGAS / EVOLUÇÃO (exercise_weight_history)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS exercise_weight_history (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    session_id VARCHAR(64) REFERENCES workout_sessions(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight NUMERIC(6, 2) NOT NULL,
    reps VARCHAR(50),
    notes VARCHAR(255),
    CONSTRAINT chk_history_weight CHECK (weight >= 0)
);

COMMENT ON TABLE exercise_weight_history IS 'Pontos históricos de progressão de carga para alimentar gráficos e deltas';

-- ==============================================================================
-- 14. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ==============================================================================

-- Índices em chaves estrangeiras para otimização de JOINs e exclusões em cascata
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cycles_user_active ON workout_cycles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_programs_user_active ON workout_programs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_days_program_order ON workout_days(program_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exercises_day_order ON exercises(workout_day_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sets_exercise_num ON exercise_sets(exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_day_id ON workout_sessions(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_session_ex_session ON workout_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_session ON workout_session_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_weight_history_ex_date ON exercise_weight_history(exercise_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_history_user ON exercise_weight_history(user_id, recorded_at DESC);

-- ==============================================================================
-- 15. VIEWS ANALÍTICAS / PRONTAS PARA CONSUMO
-- ==============================================================================

-- Visão consolidada da ficha completa de treinos ativa por usuário
CREATE OR REPLACE VIEW v_active_workout_summary AS
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    p.id AS program_id,
    p.title AS program_title,
    p.division_type,
    d.id AS day_id,
    d.day_code,
    d.day_name,
    d.title AS day_title,
    d.order_index AS day_order,
    COUNT(DISTINCT e.id) AS total_exercises,
    COUNT(s.id) AS total_sets
FROM users u
JOIN workout_programs p ON p.user_id = u.id AND p.is_active = true
JOIN workout_days d ON d.program_id = p.id
LEFT JOIN exercises e ON e.workout_day_id = d.id
LEFT JOIN exercise_sets s ON s.exercise_id = e.id
GROUP BY u.id, u.name, p.id, p.title, p.division_type, d.id, d.day_code, d.day_name, d.title, d.order_index
ORDER BY d.order_index;

-- Visão para evolução de cargas por exercício com carga anterior e delta
CREATE OR REPLACE VIEW v_exercise_progression AS
SELECT 
    h.user_id,
    h.exercise_id,
    e.name AS exercise_name,
    e.category AS exercise_category,
    h.recorded_at,
    h.weight,
    LAG(h.weight) OVER (PARTITION BY h.exercise_id ORDER BY h.recorded_at) AS previous_weight,
    h.weight - COALESCE(LAG(h.weight) OVER (PARTITION BY h.exercise_id ORDER BY h.recorded_at), h.weight) AS weight_delta,
    h.reps,
    h.notes,
    h.session_id
FROM exercise_weight_history h
JOIN exercises e ON e.id = h.exercise_id;
