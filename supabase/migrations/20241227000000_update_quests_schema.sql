-- ============================================================================
-- Update quests table for new quest system
-- ============================================================================

-- Update quest_type constraint to support new types: main, side, recurring
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_quest_type_check;
ALTER TABLE quests ADD CONSTRAINT quests_quest_type_check 
  CHECK (quest_type IN ('main', 'side', 'recurring'));

-- Allow multiple core stats (change from single TEXT to array)
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_core_stat_check;
ALTER TABLE quests 
  ALTER COLUMN core_stat TYPE TEXT[] USING ARRAY[core_stat];

-- Add parent_quest_id for quest nesting (only used for MAIN quests)
ALTER TABLE quests
ADD COLUMN IF NOT EXISTS parent_quest_id UUID REFERENCES quests(id) ON DELETE CASCADE;

-- Add quest_tree JSONB for storing the tree structure of MAIN quests
-- Structure: [{ type: 'quest'|'text', id?: uuid, text?: string, completed?: boolean, children?: [...] }]
ALTER TABLE quests
ADD COLUMN IF NOT EXISTS quest_tree JSONB;

-- Add is_completed boolean for tracking completion
ALTER TABLE quests
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Add completed_at timestamp
ALTER TABLE quests
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for parent_quest_id lookups
CREATE INDEX IF NOT EXISTS idx_quests_parent_quest_id ON quests(parent_quest_id);

-- Create index for quest type filtering
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(quest_type);
