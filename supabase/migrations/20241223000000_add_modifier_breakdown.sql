-- Add modifier breakdown tracking to action_log
-- Created: 2024-12-23

ALTER TABLE action_log 
ADD COLUMN modifier_breakdown JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN action_log.modifier_breakdown IS 
'JSON array of {label: string, value: number} objects showing each modifier component that contributed to modifier_value. 
Example: [{"label": "Research", "value": 1}, {"label": "Additional Modifier", "value": -1}]';
