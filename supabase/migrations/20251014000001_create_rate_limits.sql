-- Create rate_limits table for proper rate limiting functionality
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- user_id, IP address, or other identifier
  action TEXT NOT NULL, -- e.g., 'github_api', 'linkedin_parse', 'error_intake'
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per identifier per action per window
  UNIQUE(identifier, action)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage all rate limits (for API endpoints)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_rate_limits_identifier_action ON rate_limits(identifier, action);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);

-- Create updated_at trigger
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add a cleanup function for expired rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_rate_limits(retention_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour' * retention_hours;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
