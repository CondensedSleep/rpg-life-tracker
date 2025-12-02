-- ============================================================================
-- Add custom_effects table for temporary daily buffs/debuffs
-- ============================================================================

CREATE TABLE custom_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  effect_name TEXT NOT NULL,
  effect_type TEXT NOT NULL CHECK (effect_type IN ('stat_modifier', 'advantage', 'disadvantage', 'custom')),
  affected_stats TEXT[],
  stat_modifiers JSONB,
  modifier INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX idx_custom_effects_character_id ON custom_effects(character_id);
CREATE INDEX idx_custom_effects_expires_at ON custom_effects(expires_at);
CREATE INDEX idx_custom_effects_character_active ON custom_effects(character_id, expires_at);

-- RLS Policies
ALTER TABLE custom_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their character's custom effects"
  ON custom_effects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = custom_effects.character_id
    AND characters.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their character's custom effects"
  ON custom_effects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM characters
    WHERE characters.id = custom_effects.character_id
    AND characters.user_id = auth.uid()
  ));

-- Trigger for updated_at (if we add it later)
-- Currently not needed as effects are immutable once created
