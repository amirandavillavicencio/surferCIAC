CREATE TABLE IF NOT EXISTS schedule_link_clicks (
  id INTEGER PRIMARY KEY,
  clicked_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schedule_link_clicks_clicked_at
ON schedule_link_clicks (clicked_at);
