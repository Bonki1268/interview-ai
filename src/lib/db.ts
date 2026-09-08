import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'interview.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      position TEXT NOT NULL,
      job_description TEXT NOT NULL,
      total_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('passed', 'failed', 'pending')),
      summary TEXT,
      radar_confidence INTEGER DEFAULT 0,
      radar_technical INTEGER DEFAULT 0,
      radar_logic INTEGER DEFAULT 0,
      language TEXT DEFAULT '繁體中文',
      question_count INTEGER DEFAULT 3,
      question_time_limit INTEGER DEFAULT 60,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      transcript TEXT,
      score INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_usage_logs (
      id TEXT PRIMARY KEY,
      key_label TEXT NOT NULL,
      operation TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      audio_seconds REAL NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
  `);

  // Seed default data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('user123', 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run('admin-001', 'Jacky', 'admin@interviewai.com', adminHash, 'admin', 'active');

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run('user-001', '王小明', 'user@interviewai.com', userHash, 'user', 'active');
  }

  // Seed default config if empty
  const configCount = db.prepare('SELECT COUNT(*) as count FROM system_config').get() as { count: number };
  if (configCount.count === 0) {
    const defaultConfigs = [
      ['default_question_count', '3'],
      ['question_time_limit', '60'],
      ['default_language', '繁體中文'],
      ['openai_api_key', ''],
      ['openai_text_model', 'gpt-4o'],
      ['openai_whisper_model', 'whisper-1'],
      ['scoring_weights', JSON.stringify([
        { name: '技術符合度', weight: 40 },
        { name: '邏輯清晰度', weight: 30 },
        { name: '表達自信', weight: 30 },
      ])],
      ['pass_threshold', '60'],
      ['monthly_budget_usd', '50'],
      ['openai_admin_api_key', ''],
      ['openai_organization_id', ''],
    ];

    const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?)');
    for (const [key, value] of defaultConfigs) {
      stmt.run(key, value);
    }
  }

  // Backfill config keys introduced after initial seeding (existing installs)
  const upsertIfMissing = db.prepare('INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)');
  for (const [key, value] of [
    ['monthly_budget_usd', '50'],
    ['openai_admin_api_key', ''],
    ['openai_organization_id', ''],
  ]) {
    upsertIfMissing.run(key, value);
  }
}
