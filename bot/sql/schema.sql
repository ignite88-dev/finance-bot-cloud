-- ============================================
-- Finance Bot - Supabase Schema
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    currency VARCHAR(10) DEFAULT 'IDR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories table (seeded with defaults)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    icon VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, type, icon) VALUES
    ('food', 'expense', '🍔'),
    ('transport', 'expense', '🚗'),
    ('shopping', 'expense', '🛍️'),
    ('entertainment', 'expense', '🎬'),
    ('health', 'expense', '💊'),
    ('bills', 'expense', '📄'),
    ('education', 'expense', '📚'),
    ('housing', 'expense', '🏠'),
    ('personal', 'expense', '👤'),
    ('other_expense', 'expense', '📦'),
    ('salary', 'income', '💰'),
    ('freelance', 'income', '💼'),
    ('investment', 'income', '📈'),
    ('gift', 'income', '🎁'),
    ('other_income', 'income', '💵')
ON CONFLICT (name) DO NOTHING;

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'IDR',
    category_id INT REFERENCES categories(id),
    description TEXT,
    raw_input TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_type ON transactions(type);

-- 4. Training logs table (Phase 2 - Self-Learning Loop)
CREATE TABLE IF NOT EXISTS training_logs (
    id BIGSERIAL PRIMARY KEY,
    user_input TEXT NOT NULL,
    raw_ai_response TEXT,
    parsed_json JSONB,
    provider VARCHAR(50),
    model VARCHAR(100),
    confidence DECIMAL(3, 2),
    is_correct BOOLEAN DEFAULT TRUE,
    corrected_json JSONB,
    user_id BIGINT REFERENCES users(id),
    processing_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_logs_provider ON training_logs(provider);
CREATE INDEX idx_training_logs_created_at ON training_logs(created_at);
CREATE INDEX idx_training_logs_is_correct ON training_logs(is_correct);

-- 5. Enable Row Level Security (optional, recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for bot backend)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON transactions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON training_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON categories FOR ALL USING (true);
