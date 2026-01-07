-- =====================================================
-- UNIFIED EFFECTS SYSTEM MIGRATION
-- =====================================================
-- This migration creates a unified effects table that replaces
-- separate traits, inventory, and custom_effects tables.
-- Uses tag-based context expressions with logical operators.
-- =====================================================

-- Archive existing tables (preserve for historical action logs)
ALTER TABLE IF EXISTS traits RENAME TO traits_archived;
ALTER TABLE IF EXISTS inventory RENAME TO inventory_archived;
ALTER TABLE IF EXISTS custom_effects RENAME TO custom_effects_archived;

-- Create unified effects table
CREATE TABLE effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  effect_type TEXT NOT NULL CHECK (effect_type IN ('trait', 'item', 'blessing', 'curse')),
  
  -- Condition formula for passive effect availability (e.g., "drive > 0")
  -- When condition is false, passive modifiers don't apply
  condition TEXT,
  
  -- Context expression: logical operators (AND/OR/NOT) on tags
  -- Determines when active modifiers apply during rolls
  -- Structure: {operator?: 'AND'|'OR'|'NOT', tag?: {category, value}, children?: ContextNode[]}
  context_expression JSONB,
  
  -- Passive modifiers: always-on ability bonuses (when condition is met)
  -- Structure: [{ability: string, value: number}]
  passive_modifiers JSONB DEFAULT '[]'::jsonb,
  
  -- Active modifiers: context-dependent roll bonuses
  -- Structure: [{type: 'advantage'|'disadvantage'|'bonus', value?: number}]
  active_modifiers JSONB DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_effects_character_id ON effects(character_id);
CREATE INDEX idx_effects_is_active ON effects(is_active);
CREATE INDEX idx_effects_effect_type ON effects(effect_type);
CREATE INDEX idx_effects_context_expression ON effects USING gin(context_expression);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_effects_updated_at
  BEFORE UPDATE ON effects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own effects"
  ON effects FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM characters WHERE id = effects.character_id
  ));

CREATE POLICY "Users can insert their own effects"
  ON effects FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM characters WHERE id = effects.character_id
  ));

CREATE POLICY "Users can update their own effects"
  ON effects FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM characters WHERE id = effects.character_id
  ));

CREATE POLICY "Users can delete their own effects"
  ON effects FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM characters WHERE id = effects.character_id
  ));

-- =====================================================
-- SEED DATA: Common D&D-inspired effects
-- =====================================================

-- Note: These will be inserted for each user's first character
-- You can customize these or add them manually per character

COMMENT ON TABLE effects IS 'Unified effects system: traits, items, blessings, and curses with tag-based context matching';
COMMENT ON COLUMN effects.condition IS 'Formula for passive availability (e.g., "drive > 0"). When false, passive modifiers do not apply.';
COMMENT ON COLUMN effects.context_expression IS 'Logical expression tree for active context matching. Null means applies to all contexts.';
COMMENT ON COLUMN effects.passive_modifiers IS 'Array of {ability, value} - always-on bonuses when condition is met';
COMMENT ON COLUMN effects.active_modifiers IS 'Array of {type, value?} - context-dependent modifiers for rolls';

-- =====================================================
-- EXAMPLE SEED EFFECTS (for reference - not inserted)
-- =====================================================

-- Example 1: BLESSED (blessing)
-- Passive: None
-- Active: +1d4 bonus to ability checks and saving throws
-- Context: ability_check OR saving_throw
INSERT INTO effects (character_id, name, description, effect_type, context_expression, active_modifiers, is_active)
SELECT 
  c.id,
  'Blessed',
  'Divine favor guides your actions. Add 1d4 to ability checks and saving throws.',
  'blessing',
  jsonb_build_object(
    'operator', 'OR',
    'children', jsonb_build_array(
      jsonb_build_object('tag', jsonb_build_object('category', 'rollType', 'value', 'ability_check')),
      jsonb_build_object('tag', jsonb_build_object('category', 'rollType', 'value', 'saving_throw'))
    )
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'bonus', 'value', 4)  -- +1d4 represented as +4 for simplicity
  ),
  false  -- Not active by default
FROM characters c
LIMIT 1;  -- Only add once per database (will need to be manually assigned to characters)

-- Example 2: BANE (curse)
-- Passive: None
-- Active: -1d4 penalty to attack rolls and saving throws
-- Context: attack OR saving_throw
INSERT INTO effects (character_id, name, description, effect_type, context_expression, active_modifiers, is_active)
SELECT 
  c.id,
  'Bane',
  'You are cursed with misfortune. Subtract 1d4 from attack rolls and saving throws.',
  'curse',
  jsonb_build_object(
    'operator', 'OR',
    'children', jsonb_build_array(
      jsonb_build_object('tag', jsonb_build_object('category', 'rollType', 'value', 'attack')),
      jsonb_build_object('tag', jsonb_build_object('category', 'rollType', 'value', 'saving_throw'))
    )
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'bonus', 'value', -4)  -- -1d4 penalty
  ),
  false  -- Not active by default
FROM characters c
LIMIT 1;

-- Example 3: GUIDANCE (blessing)
-- Passive: None
-- Active: +1d4 to one ability check (before the roll)
-- Context: ability_check only
INSERT INTO effects (character_id, name, description, effect_type, context_expression, active_modifiers, is_active)
SELECT 
  c.id,
  'Guidance',
  'Divine guidance aids you in one task. Add 1d4 to an ability check.',
  'blessing',
  jsonb_build_object(
    'tag', jsonb_build_object('category', 'rollType', 'value', 'ability_check')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'bonus', 'value', 4)  -- +1d4
  ),
  false  -- Not active by default
FROM characters c
LIMIT 1;

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- OLD DATA PRESERVATION:
-- - traits_archived: Historical trait references
-- - inventory_archived: Historical item references  
-- - custom_effects_archived: Historical custom effect references
-- - Action logs referencing old trait/item IDs will keep those references
-- - UI should handle missing references gracefully (show "Archived Effect")

-- PASSIVE MODIFIER RECALCULATION:
-- - Application layer must call recalculateAbilityCurrentValues() after:
--   * Adding/updating/deleting effects
--   * Toggling effect is_active status
--   * Ability base_value changes
-- - abilities.current_value = base_value + SUM(passive_modifiers where condition met)

-- CONTEXT EXPRESSION EXAMPLES:
-- 1. Simple tag: {"tag": {"category": "rollType", "value": "ability_check"}}
-- 2. AND: {"operator": "AND", "children": [tag1, tag2]}
-- 3. OR: {"operator": "OR", "children": [tag1, tag2]}
-- 4. NOT: {"operator": "NOT", "children": [tag1]}
-- 5. Complex: (research OR literature) AND ability_check
--    {"operator": "AND", "children": [
--      {"operator": "OR", "children": [
--        {"tag": {"category": "ability", "value": "research"}},
--        {"tag": {"category": "ability", "value": "literature"}}
--      ]},
--      {"tag": {"category": "rollType", "value": "ability_check"}}
--    ]}

-- ADVANTAGE/DISADVANTAGE CONFLICTS:
-- - If multiple effects grant both advantage AND disadvantage, they cancel out
-- - Application layer should warn users when creating conflicting effects
-- - Final determination: hasAdvantage && hasDisadvantage = neither applies
