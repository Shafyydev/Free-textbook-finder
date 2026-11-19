-- 006_add_search_logs_and_cache.sql
CREATE TABLE IF NOT EXISTS search_query_log (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_free_result BOOLEAN NOT NULL DEFAULT FALSE,
  result_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_search_query_log_query ON search_query_log (query);
CREATE INDEX IF NOT EXISTS idx_search_query_log_searched_at ON search_query_log (searched_at);

CREATE TABLE IF NOT EXISTS provider_cache (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  query TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_cache_provider_query ON provider_cache (provider, query);
CREATE INDEX IF NOT EXISTS idx_provider_cache_expires_at ON provider_cache (expires_at);
