-- Fix RLS policies to properly support INSERT, UPDATE, and DELETE operations
-- Created: 2024-12-23

-- Drop and recreate traits policies
DROP POLICY IF EXISTS "Users can manage their character's traits" ON traits;

CREATE POLICY "Users can insert their character's traits"
  ON traits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = traits.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's traits"
  ON traits FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = traits.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = traits.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's traits"
  ON traits FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = traits.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate inventory policies
DROP POLICY IF EXISTS "Users can manage their character's inventory" ON inventory;

CREATE POLICY "Users can insert into their character's inventory"
  ON inventory FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inventory.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's inventory"
  ON inventory FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inventory.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inventory.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete from their character's inventory"
  ON inventory FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inventory.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate abilities policies
DROP POLICY IF EXISTS "Users can manage their character's abilities" ON abilities;

CREATE POLICY "Users can insert their character's abilities"
  ON abilities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = abilities.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's abilities"
  ON abilities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = abilities.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = abilities.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's abilities"
  ON abilities FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = abilities.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate core_stats policies
DROP POLICY IF EXISTS "Users can manage their character's core stats" ON core_stats;

CREATE POLICY "Users can insert their character's core stats"
  ON core_stats FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = core_stats.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's core stats"
  ON core_stats FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = core_stats.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = core_stats.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's core stats"
  ON core_stats FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = core_stats.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate quests policies
DROP POLICY IF EXISTS "Users can manage their character's quests" ON quests;

CREATE POLICY "Users can insert their character's quests"
  ON quests FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = quests.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's quests"
  ON quests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = quests.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = quests.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's quests"
  ON quests FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = quests.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate quest milestones policies
DROP POLICY IF EXISTS "Users can manage quest milestones" ON main_quest_milestones;

CREATE POLICY "Users can insert quest milestones"
  ON main_quest_milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM quests
    WHERE quests.id = main_quest_milestones.quest_id
    AND EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update quest milestones"
  ON main_quest_milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quests
    WHERE quests.id = main_quest_milestones.quest_id
    AND EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = auth.uid()
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quests
    WHERE quests.id = main_quest_milestones.quest_id
    AND EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete quest milestones"
  ON main_quest_milestones FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM quests
    WHERE quests.id = main_quest_milestones.quest_id
    AND EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = auth.uid()
    )
  ));

-- Drop and recreate daily_rolls policies
DROP POLICY IF EXISTS "Users can manage their character's daily rolls" ON daily_rolls;

CREATE POLICY "Users can insert their character's daily rolls"
  ON daily_rolls FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = daily_rolls.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's daily rolls"
  ON daily_rolls FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = daily_rolls.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = daily_rolls.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's daily rolls"
  ON daily_rolls FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = daily_rolls.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate hit_dice policies
DROP POLICY IF EXISTS "Users can manage their character's hit dice" ON hit_dice;

CREATE POLICY "Users can insert their character's hit dice"
  ON hit_dice FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = hit_dice.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's hit dice"
  ON hit_dice FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = hit_dice.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = hit_dice.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's hit dice"
  ON hit_dice FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = hit_dice.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate journal_entries policies
DROP POLICY IF EXISTS "Users can manage their character's journal entries" ON journal_entries;

CREATE POLICY "Users can insert their character's journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = journal_entries.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's journal entries"
  ON journal_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = journal_entries.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = journal_entries.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's journal entries"
  ON journal_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = journal_entries.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate action_log policies
DROP POLICY IF EXISTS "Users can manage their character's action log" ON action_log;

CREATE POLICY "Users can insert into their character's action log"
  ON action_log FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = action_log.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's action log"
  ON action_log FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = action_log.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = action_log.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete from their character's action log"
  ON action_log FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = action_log.character_id
    AND characters.user_id = auth.uid()
  ));

-- Drop and recreate inspiration_tokens policies
DROP POLICY IF EXISTS "Users can manage their character's inspiration tokens" ON inspiration_tokens;

CREATE POLICY "Users can insert their character's inspiration tokens"
  ON inspiration_tokens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inspiration_tokens.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their character's inspiration tokens"
  ON inspiration_tokens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inspiration_tokens.character_id
    AND characters.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inspiration_tokens.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their character's inspiration tokens"
  ON inspiration_tokens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = inspiration_tokens.character_id
    AND characters.user_id = auth.uid()
  ));
