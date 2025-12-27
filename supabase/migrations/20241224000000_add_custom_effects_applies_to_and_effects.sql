-- ============================================================================
-- Add applies_to and effects columns to custom_effects table
-- ============================================================================

-- Add applies_to column for specifying when effects apply
ALTER TABLE custom_effects
ADD COLUMN IF NOT EXISTS applies_to TEXT[];

-- Add effects column for custom type (stores array of sub-effects)
ALTER TABLE custom_effects
ADD COLUMN IF NOT EXISTS effects JSONB;
