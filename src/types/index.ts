// ============================================================================
// Core Type Definitions for RPG Life Tracker
// ============================================================================

export type CoreStatName = 'body' | 'mind' | 'heart' | 'soul'
export type QuestType = 'daily' | 'weekly' | 'monthly' | 'main'
export type DayState = 'difficult' | 'normal' | 'inspiration' | 'critical'
export type TraitType = 'feature' | 'flaw' | 'passive'
export type ItemType = 'tool' | 'comfort' | 'consumable' | 'debuff'
export type ActionType = 'quest_completion' | 'skill_check' | 'saving_throw' | 'item_use' | 'level_up' | 'attack' | 'damage' | 'other'
export type CompletionStatus = 'full' | 'partial' | 'failed'
export type RollType = 'skill_check' | 'saving_throw' | 'attack' | 'damage'

// ============================================================================
// Character & Stats
// ============================================================================

export interface Character {
  id: string
  user_id: string
  name: string
  class: string
  level: number
  current_xp: number
  xp_to_next_level: number
  created_at: string
  updated_at: string
}

export interface CoreStat {
  id: string
  character_id: string
  stat_name: CoreStatName
  base_value: number
  current_value: number
  modifier: number
}

export interface Ability {
  id: string
  character_id: string
  core_stat: CoreStatName
  ability_name: string
  initial_value: number // Starting value from character creation (never changes)
  base_value: number // Current base value including permanent changes from level-ups
  current_value: number // Fully modified value including traits, items, and temporary effects
  times_used_this_level: number
  total_times_used: number
}

// ============================================================================
// Traits & Inventory
// ============================================================================

export interface StatModifier {
  stat: string
  modifier: number
}

export interface MechanicalEffect {
  type?: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  affected_stats?: string[]  // For advantage/disadvantage
  stat_modifiers?: StatModifier[]  // For stat_modifier type with individual modifiers per stat
  modifier?: number  // For advantage/disadvantage with a flat modifier
  condition?: string
  description?: string
}

export interface Trait {
  id: string
  character_id: string
  trait_name: string
  trait_type: TraitType | null
  description: string | null
  mechanical_effect: MechanicalEffect[] | null
  is_active: boolean
  created_at: string
}

export interface PassiveEffect {
  type?: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  affected_stats?: string[]  // For advantage/disadvantage
  stat_modifiers?: StatModifier[]  // For stat_modifier type with individual modifiers per stat
  modifier?: number  // For advantage/disadvantage with a flat modifier
  condition?: string
  description?: string
}

export interface InventoryItem {
  id: string
  character_id: string
  item_name: string
  description: string | null
  item_type: ItemType | null
  passive_effect: PassiveEffect[] | null
  condition: string | null
  is_equipped: boolean
  created_at: string
}

// ============================================================================
// Quests
// ============================================================================

export interface ProgressionMilestone {
  ability: string
  every: number
  gain: number
}

export interface Quest {
  id: string
  character_id: string
  quest_name: string
  quest_type: QuestType
  core_stat: CoreStatName
  abilities_used: string[] | null
  xp_reward: number
  difficulty_class: number | null
  progression_milestone: ProgressionMilestone[] | null
  times_completed: number
  description: string | null
  deadline: string | null
  is_active: boolean
  created_at: string
}

export interface MainQuestMilestone {
  id: string
  quest_id: string
  milestone_name: string
  description: string | null
  sort_order: number
  is_completed: boolean
  completed_at: string | null
}

// ============================================================================
// Daily State & Hit Dice
// ============================================================================

export interface DailyRoll {
  id: string
  character_id: string
  roll_date: string
  roll_value: number
  day_state: DayState
  affected_stats: CoreStatName[] | null
}

export interface HitDice {
  id: string
  character_id: string
  max_hit_dice: number
  current_hit_dice: number
  exhaustion_level: number
  days_at_zero: number
  last_long_rest: string | null
  updated_at: string
}

export interface CustomEffect {
  id: string
  character_id: string
  effect_name: string
  effect_type: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  affected_stats?: string[] | null
  stat_modifiers?: StatModifier[] | null
  modifier?: number | null
  description?: string | null
  created_at: string
  expires_at: string
}

// ============================================================================
// Journal & Actions
// ============================================================================

export interface JournalEntry {
  id: string
  character_id: string
  entry_date: string
  journal_text: string | null
  created_at: string
}

export interface ActionLog {
  id: string
  character_id: string
  action_date: string
  action_time: string
  action_type: ActionType

  // Quest-related
  quest_id: string | null
  quest_name: string | null
  completion_status: CompletionStatus | null
  xp_awarded: number | null

  // Roll-related
  roll_type: RollType | null
  ability_used: string | null
  roll_value: number | null
  modifier_value: number | null
  total_value: number | null
  difficulty_class: number | null
  had_advantage: boolean | null
  had_disadvantage: boolean | null
  success: boolean | null

  // Item-related
  item_id: string | null
  item_name: string | null

  // Level-up
  ability_increased: string | null
  new_level: number | null

  notes: string | null
  created_at: string
}

export interface InspirationTokens {
  id: string
  character_id: string
  token_count: number
  updated_at: string
}

// ============================================================================
// Grouped Data Structures (for display)
// ============================================================================

export interface AbilitiesByCoreStat {
  body: Ability[]
  mind: Ability[]
  heart: Ability[]
  soul: Ability[]
}

export interface CoreStatsMap {
  body: CoreStat
  mind: CoreStat
  heart: CoreStat
  soul: CoreStat
}

// ============================================================================
// Calculation Results
// ============================================================================

export interface ModifierBreakdown {
  source: string
  value: number
}

export interface CalculatedModifier {
  total: number
  breakdown: ModifierBreakdown[]
  hasAdvantage: boolean
  hasDisadvantage: boolean
}

export interface RollResult {
  rollValue: number
  modifierValue: number
  totalValue: number
  success: boolean | null
  margin: number | null
}

// ============================================================================
// Form Data (for creating/editing)
// ============================================================================

export interface QuestFormData {
  quest_name: string
  quest_type: QuestType
  core_stat: CoreStatName
  abilities_used: string[]
  xp_reward: number
  difficulty_class?: number
  progression_milestone?: ProgressionMilestone[]
  description?: string
  deadline?: string
}

export interface TraitFormData {
  trait_name: string
  trait_type: TraitType
  description?: string
  mechanical_effect?: MechanicalEffect[]
}

export interface InventoryFormData {
  item_name: string
  description?: string
  item_type: ItemType
  passive_effect?: PassiveEffect[]
  condition?: string
}

export interface ActionLogFormData {
  action_type: ActionType
  roll_type?: RollType
  ability_used?: string
  roll_value?: number
  difficulty_class?: number
  quest_id?: string
  use_inspiration?: boolean
  notes?: string
}
