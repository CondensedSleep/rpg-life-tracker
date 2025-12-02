-- Migration: Add indexes for journal and action log queries
-- Created: 2024-12-01
-- Description: Optimize queries for date-based journal and action log lookups

-- ============================================================================
-- JOURNAL ENTRIES INDEXES
-- ============================================================================

-- Index for quick lookup by character and date
CREATE INDEX IF NOT EXISTS idx_journal_entries_character_date 
ON journal_entries(character_id, entry_date DESC);

-- ============================================================================
-- DAILY ROLLS INDEXES
-- ============================================================================

-- Index for quick lookup by character and date
CREATE INDEX IF NOT EXISTS idx_daily_rolls_character_date 
ON daily_rolls(character_id, roll_date DESC);

-- ============================================================================
-- ACTION LOG INDEXES
-- ============================================================================

-- Index for quick lookup by character and date
CREATE INDEX IF NOT EXISTS idx_action_log_character_date 
ON action_log(character_id, action_date DESC, action_time DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_action_log_action_type 
ON action_log(action_type);

-- ============================================================================
-- NOTES
-- ============================================================================

-- These indexes support:
-- 1. Fast journal entry retrieval by date
-- 2. Efficient action log queries for a specific day
-- 3. Quick daily roll lookups
-- 4. Action filtering by type (for analytics)
