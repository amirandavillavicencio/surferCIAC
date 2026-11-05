CREATE TABLE IF NOT EXISTS runs (
  token TEXT PRIMARY KEY,
  semestre TEXT NOT NULL,
  question_offset INTEGER NOT NULL,
  asked INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  current_id TEXT,
  next_answer_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS scores (
  run_token TEXT PRIMARY KEY REFERENCES runs(token),
  display_name TEXT NOT NULL,
  semestre TEXT NOT NULL,
  score INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_ranking ON scores (score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_scores_semestre ON scores (semestre, score DESC, created_at ASC);
