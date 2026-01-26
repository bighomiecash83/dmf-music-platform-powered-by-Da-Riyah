from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  raw_hash TEXT NOT NULL,
  api_secret_hex TEXT NOT NULL,
  scopes_csv TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_rawhash_idx ON api_keys(raw_hash);

CREATE TABLE IF NOT EXISTS nonces (
  key_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS nonces_unique_idx ON nonces(key_id, nonce);
CREATE INDEX IF NOT EXISTS nonces_exp_idx ON nonces(expires_at);
"""

def make_engine(db_url: str) -> Engine:
    return create_engine(db_url, pool_pre_ping=True)

def init_schema(engine: Engine) -> None:
    with engine.begin() as cx:
        for stmt in SCHEMA_SQL.strip().split(";"):
            s = stmt.strip()
            if s:
                cx.execute(text(s))
