-- Add tags column to action_log table
-- Tags will be stored as structured JSONB for querying and display

ALTER TABLE action_log
ADD COLUMN tags JSONB DEFAULT '{}'::jsonb;

-- Add index for tag queries
CREATE INDEX idx_action_log_tags ON action_log USING gin(tags);

-- Add comment
COMMENT ON COLUMN action_log.tags IS 'Structured tags for roll context: { roll_type, ability, core_stat, traits, items, effects, dice, modifiers, organizational }';
