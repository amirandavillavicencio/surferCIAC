-- Publicación manual: los puntajes existentes permanecen pendientes.
ALTER TABLE scores ADD COLUMN published_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_scores_public_ranking
ON scores (score DESC, created_at ASC) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scores_public_semestre
ON scores (semestre, score DESC, created_at ASC) WHERE published_at IS NOT NULL;
