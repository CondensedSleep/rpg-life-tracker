-- RPG Life Tracker - Initial Database Schema
-- Created: 2024-12-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: characters
-- ============================================================================
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  current_xp INTEGER DEFAULT 0 CHECK (current_xp >= 0),
  xp_to_next_level INTEGER DEFAULT 10 CHECK (xp_to_next_level >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: core_stats
-- ============================================================================
CREATE TABLE core_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL CHECK (stat_name IN ('body', 'mind', 'heart', 'soul')),
  base_value INTEGER NOT NULL DEFAULT 10,
  current_value INTEGER NOT NULL DEFAULT 10,
  modifier INTEGER DEFAULT 0,
  UNIQUE(character_id, stat_name)
);

-- ============================================================================
-- TABLE: abilities
-- ============================================================================
CREATE TABLE abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  core_stat TEXT NOT NULL CHECK (core_stat IN ('body', 'mind', 'heart', 'soul')),
  ability_name TEXT NOT NULL,
  initial_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL,
  times_used_this_level INTEGER DEFAULT 0 CHECK (times_used_this_level >= 0),
  total_times_used INTEGER DEFAULT 0 CHECK (total_times_used >= 0),
  UNIQUE(character_id, ability_name)
);

-- ============================================================================
-- TABLE: traits
-- ============================================================================
CREATE TABLE traits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  trait_name TEXT NOT NULL,
  trait_type TEXT CHECK (trait_type IN ('feature', 'flaw', 'passive')),
  description TEXT,
  mechanical_effect JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: inventory
-- ============================================================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  item_type TEXT CHECK (item_type IN ('tool', 'comfort', 'consumable', 'debuff')),
  passive_effect JSONB,
  condition TEXT,
  is_equipped BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: quests
-- ============================================================================
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  quest_name TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'main')),
  core_stat TEXT NOT NULL CHECK (core_stat IN ('body', 'mind', 'heart', 'soul')),
  abilities_used TEXT[],
  xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),
  difficulty_class INTEGER CHECK (difficulty_class >= 1 AND difficulty_class <= 30),
  progression_milestone JSONB,
  times_completed INTEGER DEFAULT 0 CHECK (times_completed >= 0),
  description TEXT,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: main_quest_milestones
-- ============================================================================
CREATE TABLE main_quest_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- TABLE: daily_rolls
-- ============================================================================
CREATE TABLE daily_rolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  roll_date DATE NOT NULL,
  roll_value INTEGER NOT NULL CHECK (roll_value >= 1 AND roll_value <= 20),
  day_state TEXT NOT NULL CHECK (day_state IN ('difficult', 'normal', 'inspiration', 'critical')),
  affected_stats TEXT[],
  UNIQUE(character_id, roll_date)
);

-- ============================================================================
-- TABLE: hit_dice
-- ============================================================================
CREATE TABLE hit_dice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  max_hit_dice INTEGER NOT NULL CHECK (max_hit_dice >= 0),
  current_hit_dice INTEGER NOT NULL CHECK (current_hit_dice >= 0),
  exhaustion_level INTEGER DEFAULT 0 CHECK (exhaustion_level >= 0 AND exhaustion_level <= 3),
  days_at_zero INTEGER DEFAULT 0 CHECK (days_at_zero >= 0),
  last_long_rest DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id)
);

-- ============================================================================
-- TABLE: journal_entries
-- ============================================================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  journal_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, entry_date)
);

-- ============================================================================
-- TABLE: action_log
-- ============================================================================
CREATE TABLE action_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  action_date DATE NOT NULL,
  action_time TIMESTAMPTZ DEFAULT NOW(),
  action_type TEXT NOT NULL CHECK (action_type IN ('quest_completion', 'skill_check', 'saving_throw', 'item_use', 'level_up', 'attack', 'damage', 'other')),

  -- Quest-related
  quest_id UUID REFERENCES quests(id),
  quest_name TEXT,
  completion_status TEXT CHECK (completion_status IN ('full', 'partial', 'failed')),
  xp_awarded INTEGER CHECK (xp_awarded >= 0),

  -- Roll-related
  roll_type TEXT CHECK (roll_type IN ('skill_check', 'saving_throw', 'attack', 'damage')),
  ability_used TEXT,
  roll_value INTEGER CHECK (roll_value >= 1 AND roll_value <= 20),
  modifier_value INTEGER,
  total_value INTEGER,
  difficulty_class INTEGER,
  had_advantage BOOLEAN,
  had_disadvantage BOOLEAN,
  success BOOLEAN,

  -- Item-related
  item_id UUID REFERENCES inventory(id),
  item_name TEXT,

  -- Level-up
  ability_increased TEXT,
  new_level INTEGER,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: inspiration_tokens
-- ============================================================================
CREATE TABLE inspiration_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  token_count INTEGER DEFAULT 0 CHECK (token_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Indexes for foreign key lookups
CREATE INDEX idx_core_stats_character_id ON core_stats(character_id);
CREATE INDEX idx_abilities_character_id ON abilities(character_id);
CREATE INDEX idx_traits_character_id ON traits(character_id);
CREATE INDEX idx_inventory_character_id ON inventory(character_id);
CREATE INDEX idx_quests_character_id ON quests(character_id);
CREATE INDEX idx_main_quest_milestones_quest_id ON main_quest_milestones(quest_id);
CREATE INDEX idx_daily_rolls_character_id ON daily_rolls(character_id);
CREATE INDEX idx_hit_dice_character_id ON hit_dice(character_id);
CREATE INDEX idx_journal_entries_character_id ON journal_entries(character_id);
CREATE INDEX idx_action_log_character_id ON action_log(character_id);
CREATE INDEX idx_inspiration_tokens_character_id ON inspiration_tokens(character_id);

-- Indexes for date-based queries
CREATE INDEX idx_daily_rolls_date ON daily_rolls(roll_date DESC);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_action_log_date ON action_log(action_date DESC, action_time DESC);

-- Indexes for quest filtering
CREATE INDEX idx_quests_type ON quests(quest_type);
CREATE INDEX idx_quests_active ON quests(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_quest_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hit_dice ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_tokens ENABLE ROW LEVEL SECURITY;

-- For single-user mode, we'll allow all operations for authenticated users
-- In production, you'd want to restrict these to the character's owner

-- Characters policies
CREATE POLICY "Users can view their own characters"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters"
  ON characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
  ON characters FOR DELETE
  USING (auth.uid() = user_id);

-- Core stats policies
CREATE POLICY "Users can view their character's core stats"
  ON core_stats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = core_stats.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's core stats"
  ON core_stats FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = core_stats.character_id
    AND characters.user_id = auth.uid()
  ));

-- Abilities policies
CREATE POLICY "Users can view their character's abilities"
  ON abilities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = abilities.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's abilities"
  ON abilities FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = abilities.character_id
    AND characters.user_id = auth.uid()
  ));

-- Traits policies
CREATE POLICY "Users can view their character's traits"
  ON traits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = traits.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's traits"
  ON traits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = traits.character_id
    AND characters.user_id = auth.uid()
  ));

-- Inventory policies
CREATE POLICY "Users can view their character's inventory"
  ON inventory FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inventory.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's inventory"
  ON inventory FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inventory.character_id
    AND characters.user_id = auth.uid()
  ));

-- Quests policies
CREATE POLICY "Users can view their character's quests"
  ON quests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = quests.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's quests"
  ON quests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = quests.character_id
    AND characters.user_id = auth.uid()
  ));

-- Main quest milestones policies
CREATE POLICY "Users can view quest milestones"
  ON main_quest_milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quests
    JOIN characters ON characters.id = quests.character_id
    WHERE quests.id = main_quest_milestones.quest_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage quest milestones"
  ON main_quest_milestones FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quests
    JOIN characters ON characters.id = quests.character_id
    WHERE quests.id = main_quest_milestones.quest_id
    AND characters.user_id = auth.uid()
  ));

-- Daily rolls policies
CREATE POLICY "Users can view their character's daily rolls"
  ON daily_rolls FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = daily_rolls.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's daily rolls"
  ON daily_rolls FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = daily_rolls.character_id
    AND characters.user_id = auth.uid()
  ));

-- Hit dice policies
CREATE POLICY "Users can view their character's hit dice"
  ON hit_dice FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = hit_dice.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's hit dice"
  ON hit_dice FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = hit_dice.character_id
    AND characters.user_id = auth.uid()
  ));

-- Journal entries policies
CREATE POLICY "Users can view their character's journal entries"
  ON journal_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = journal_entries.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's journal entries"
  ON journal_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = journal_entries.character_id
    AND characters.user_id = auth.uid()
  ));

-- Action log policies
CREATE POLICY "Users can view their character's action log"
  ON action_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = action_log.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's action log"
  ON action_log FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = action_log.character_id
    AND characters.user_id = auth.uid()
  ));

-- Inspiration tokens policies
CREATE POLICY "Users can view their character's inspiration tokens"
  ON inspiration_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inspiration_tokens.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's inspiration tokens"
  ON inspiration_tokens FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inspiration_tokens.character_id
    AND characters.user_id = auth.uid()
  ));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hit_dice_updated_at
  BEFORE UPDATE ON hit_dice
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspiration_tokens_updated_at
  BEFORE UPDATE ON inspiration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
