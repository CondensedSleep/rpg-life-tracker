-- Migration: Convert single effect objects to arrays
-- Created: 2024-12-01
-- Description: Updates existing database records to ensure mechanical_effect and passive_effect 
-- use array format, and progression_milestone uses array format for quests.

-- ============================================================================
-- MIGRATE TRAITS: mechanical_effect to array format
-- ============================================================================

-- Convert single mechanical_effect objects to arrays
UPDATE traits
SET mechanical_effect = jsonb_build_array(mechanical_effect)
WHERE mechanical_effect IS NOT NULL
  AND jsonb_typeof(mechanical_effect) = 'object';

-- Note: If mechanical_effect is already an array, this won't affect it
-- The WHERE clause ensures we only convert objects, not existing arrays

-- ============================================================================
-- MIGRATE INVENTORY: passive_effect to array format
-- ============================================================================

-- Convert single passive_effect objects to arrays
UPDATE inventory
SET passive_effect = jsonb_build_array(passive_effect)
WHERE passive_effect IS NOT NULL
  AND jsonb_typeof(passive_effect) = 'object';

-- ============================================================================
-- MIGRATE QUESTS: progression_milestone to array format
-- ============================================================================

-- Convert single progression_milestone objects to arrays
UPDATE quests
SET progression_milestone = jsonb_build_array(progression_milestone)
WHERE progression_milestone IS NOT NULL
  AND jsonb_typeof(progression_milestone) = 'object';

-- ============================================================================
-- VERIFICATION QUERIES (for manual checking after migration)
-- ============================================================================

-- Check traits with mechanical_effect
-- SELECT id, trait_name, jsonb_typeof(mechanical_effect) as effect_type, mechanical_effect
-- FROM traits
-- WHERE mechanical_effect IS NOT NULL;

-- Check inventory with passive_effect
-- SELECT id, item_name, jsonb_typeof(passive_effect) as effect_type, passive_effect
-- FROM inventory
-- WHERE passive_effect IS NOT NULL;

-- Check quests with progression_milestone
-- SELECT id, quest_name, jsonb_typeof(progression_milestone) as milestone_type, progression_milestone
-- FROM quests
-- WHERE progression_milestone IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration is idempotent - running it multiple times will not cause issues
-- because the WHERE clause checks if the field is an object before converting.
-- If it's already an array, the UPDATE won't match that row.

-- After running this migration, all new records should be created with array format
-- from the start, as enforced by the application layer.
