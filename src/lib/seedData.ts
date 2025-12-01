import type {
  Character,
  CoreStat,
  Ability,
  Trait,
  InventoryItem,
  Quest,
} from '@/types'

// Hardcoded user ID for single-user mode
export const SINGLE_USER_ID = '00000000-0000-0000-0000-000000000001'
export const CHARACTER_ID = '00000000-0000-0000-0000-000000000002'

// ============================================================================
// INITIAL CHARACTER DATA
// ============================================================================

export const INITIAL_CHARACTER: Character = {
  id: CHARACTER_ID,
  user_id: SINGLE_USER_ID,
  name: 'Zachary Anderson',
  class: 'ROGUE',
  level: 1,
  current_xp: 0,
  xp_to_next_level: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// ============================================================================
// CORE STATS
// ============================================================================

export const INITIAL_CORE_STATS: CoreStat[] = [
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    stat_name: 'body',
    base_value: 10,
    current_value: 10, // Will be recalculated
    modifier: 0, // Will be recalculated
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    stat_name: 'mind',
    base_value: 14,
    current_value: 14,
    modifier: 2,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    stat_name: 'heart',
    base_value: 12,
    current_value: 12,
    modifier: 1,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    stat_name: 'soul',
    base_value: 15,
    current_value: 15,
    modifier: 2,
  },
]

// ============================================================================
// ABILITIES
// ============================================================================

export const INITIAL_ABILITIES: Ability[] = [
  // BODY abilities (base 10)
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'body',
    ability_name: 'nutrition',
    initial_value: -2,
    current_value: -2,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'body',
    ability_name: 'strength',
    initial_value: 0,
    current_value: 0,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'body',
    ability_name: 'agility',
    initial_value: 2,
    current_value: 2,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'body',
    ability_name: 'sex',
    initial_value: -1,
    current_value: -1,
    times_used_this_level: 0,
    total_times_used: 0,
  },

  // MIND abilities (base 14)
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'mind',
    ability_name: 'language',
    initial_value: 2,
    current_value: 2,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'mind',
    ability_name: 'literature',
    initial_value: 1,
    current_value: 1,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'mind',
    ability_name: 'research',
    initial_value: 1,
    current_value: 1,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'mind',
    ability_name: 'openness',
    initial_value: 0,
    current_value: 0,
    times_used_this_level: 0,
    total_times_used: 0,
  },

  // HEART abilities (base 12)
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'heart',
    ability_name: 'empathy',
    initial_value: 2,
    current_value: 2,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'heart',
    ability_name: 'love',
    initial_value: 0,
    current_value: 0,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'heart',
    ability_name: 'expression',
    initial_value: 1,
    current_value: 1,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'heart',
    ability_name: 'drive',
    initial_value: 0,
    current_value: 0,
    times_used_this_level: 0,
    total_times_used: 0,
  },

  // SOUL abilities (base 15)
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'soul',
    ability_name: 'mindfulness',
    initial_value: 1,
    current_value: 1,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'soul',
    ability_name: 'nature',
    initial_value: 0,
    current_value: 0,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'soul',
    ability_name: 'creation',
    initial_value: 3,
    current_value: 3,
    times_used_this_level: 0,
    total_times_used: 0,
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    core_stat: 'soul',
    ability_name: 'honesty',
    initial_value: 1,
    current_value: 1,
    times_used_this_level: 0,
    total_times_used: 0,
  },
]

// ============================================================================
// TRAITS
// ============================================================================

export const INITIAL_TRAITS: Trait[] = [
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    trait_name: 'ARTIST',
    trait_type: 'feature',
    description: 'Given Drive, anything is possible.',
    mechanical_effect: {
      type: 'stat_modifier',
      stats: ['creation', 'expression'],
      modifier: 2,
      condition: 'drive > 0',
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    trait_name: 'ADDICT',
    trait_type: 'flaw',
    description: 'Concerns: Honesty, Nutrition, Mindfulness',
    mechanical_effect: {
      type: 'stat_modifier',
      stats: ['drive', 'agility', 'honesty'],
      modifier: -2,
      condition: 'always',
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    trait_name: 'STARGAZER',
    trait_type: 'feature',
    description: 'Drawn to the deepest, scariest questions',
    mechanical_effect: {
      type: 'stat_modifier',
      stat: 'openness',
      modifier: 2,
      condition: 'always',
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

// ============================================================================
// INVENTORY
// ============================================================================

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: 'Cargo pants',
    description: 'good fit',
    item_type: 'comfort',
    passive_effect: null,
    condition: 'good',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: '2019 MacBook Pro',
    description: 'worn',
    item_type: 'tool',
    passive_effect: {
      stat: 'creation',
      type: 'advantage',
      condition: 'nutrition > 0',
    },
    condition: 'worn',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: 'Disposable Vape',
    description: 'toxic',
    item_type: 'debuff',
    passive_effect: {
      stat: 'honesty',
      modifier: -1,
      condition: 'always',
    },
    condition: 'toxic',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: 'Vaseline',
    description: 'for lips (blue)',
    item_type: 'comfort',
    passive_effect: null,
    condition: 'good',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: 'Many-pocketed Backpack',
    description: 'very worn',
    item_type: 'tool',
    passive_effect: null,
    condition: 'worn',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: 'Water Bottle',
    description: 'reliable',
    item_type: 'tool',
    passive_effect: null,
    condition: 'good',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    item_name: 'Ancient Casio Privia',
    description: 'worn, reliable',
    item_type: 'comfort',
    passive_effect: {
      type: 'custom',
      description: 'Playing for 30min = regain 1 Hit Die (once per day)',
    },
    condition: 'worn',
    is_equipped: true,
    created_at: new Date().toISOString(),
  },
]

// ============================================================================
// WEEKLY QUESTS
// ============================================================================

export const INITIAL_QUESTS: Quest[] = [
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    quest_name: 'Promise of the Poet',
    quest_type: 'weekly',
    core_stat: 'soul',
    abilities_used: ['creation', 'expression'],
    xp_reward: 3,
    difficulty_class: null,
    progression_milestone: {
      ability: 'creation',
      every: 5,
      gain: 1,
    },
    times_completed: 0,
    description: 'Page of lyrics OR Song excerpt/material',
    deadline: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    quest_name: 'Lift Heavy Things',
    quest_type: 'weekly',
    core_stat: 'body',
    abilities_used: ['drive', 'strength'],
    xp_reward: 4,
    difficulty_class: null,
    progression_milestone: {
      ability: 'drive',
      every: 5,
      gain: 1,
    },
    times_completed: 0,
    description: 'Workout OR Do 20 Push-ups',
    deadline: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    quest_name: 'The Touch of Grass',
    quest_type: 'weekly',
    core_stat: 'soul',
    abilities_used: ['nature', 'agility'],
    xp_reward: 3,
    difficulty_class: null,
    progression_milestone: {
      ability: 'nature',
      every: 5,
      gain: 1,
    },
    times_completed: 0,
    description: 'Go on a hike OR Walk around the block',
    deadline: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    quest_name: 'Drinking in Words',
    quest_type: 'weekly',
    core_stat: 'mind',
    abilities_used: ['literature'],
    xp_reward: 2,
    difficulty_class: null,
    progression_milestone: {
      ability: 'literature',
      every: 10,
      gain: 1,
    },
    times_completed: 0,
    description: 'Read for at least one hour',
    deadline: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    quest_name: 'Human Connection',
    quest_type: 'weekly',
    core_stat: 'heart',
    abilities_used: ['empathy'],
    xp_reward: 3,
    difficulty_class: null,
    progression_milestone: {
      ability: 'empathy',
      every: 5,
      gain: 1,
    },
    times_completed: 0,
    description: 'Text or talk to a friend or loved one',
    deadline: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    character_id: CHARACTER_ID,
    quest_name: 'Chef de Cuisine',
    quest_type: 'weekly',
    core_stat: 'body',
    abilities_used: ['nutrition'],
    xp_reward: 2,
    difficulty_class: null,
    progression_milestone: {
      ability: 'nutrition',
      every: 7,
      gain: 1,
    },
    times_completed: 0,
    description: 'Cook a meal from scratch',
    deadline: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

// Note: Main quests will be added in Phase 4 (Quest System implementation)
