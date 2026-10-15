CREATE TABLE IF NOT EXISTS hit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS hit_log_player_at ON hit_log (player_id, at);
