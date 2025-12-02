-- Migration: Refactor ability values to support base + modified values
-- Created: 2024-12-01
-- Description: Rename current_value to base_value and add new current_value for modified values

-- ============================================================================
-- STEP 1: Rename current_value to base_value
-- ============================================================================

ALTER TABLE abilities 
RENAME COLUMN current_value TO base_value;

-- ============================================================================
-- STEP 2: Add new current_value column for modified values (includes effects)
-- ============================================================================

ALTER TABLE abilities 
ADD COLUMN current_value INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- STEP 3: Initialize current_value to match base_value (no effects yet)
-- ============================================================================

UPDATE abilities
SET current_value = base_value;

-- ============================================================================
-- STEP 4: Add comment for clarity
-- ============================================================================

COMMENT ON COLUMN abilities.initial_value IS 'Starting value from character creation (never changes)';
COMMENT ON COLUMN abilities.base_value IS 'Current base value including permanent changes from level-ups';
COMMENT ON COLUMN abilities.current_value IS 'Fully modified value including traits, items, and temporary effects';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all values copied correctly
-- SELECT ability_name, initial_value, base_value, current_value
-- FROM abilities
-- ORDER BY core_stat, ability_name;

-- ============================================================================
-- NOTES
-- ============================================================================

-- The application layer will be responsible for updating current_value when:
-- 1. Traits are added/removed/toggled
-- 2. Inventory items are equipped/unequipped
-- 3. Daily state changes (advantage/disadvantage)
-- 4. Base value changes (level-ups)
