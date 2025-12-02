import { supabase } from './supabase'
import { useStore } from '@/store'
import {
  INITIAL_CHARACTER,
  INITIAL_CORE_STATS,
  INITIAL_ABILITIES,
  INITIAL_TRAITS,
  INITIAL_INVENTORY,
  INITIAL_QUESTS,
} from './seedData'
import { migrateEffectsToArrays } from './migrations/migrateEffectsToArrays'

// Flag to prevent duplicate loads during React StrictMode double-render
let isLoading = false

/**
 * Load seed data into Supabase for a new user
 * This creates the initial character with all stats, abilities, traits, and inventory
 */
export async function loadSeedData() {
  // Prevent duplicate loads
  if (isLoading) {
    console.log('⏳ Already loading seed data, skipping duplicate call...')
    return
  }

  isLoading = true

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('⚠️ No authenticated user found, skipping seed data load')
      isLoading = false
      return
    }

    // Check if character already exists for this user
    const { data: existingCharacter, error: checkError } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking for existing character:', checkError)
      isLoading = false
      return
    }

    if (existingCharacter) {
      console.log('✅ Character already exists, loading from database...')

      // Run migration for effects arrays (if needed)
      console.log('🔄 Checking for effects migration...')
      await migrateEffectsToArrays()

      await loadDataFromSupabase(user.id)
      isLoading = false
      return
    }

    console.log('📝 Creating new character with seed data...')

    // Insert character with user_id
    const { data: character, error: charError } = await supabase
      .from('characters')
      .insert([{
        user_id: user.id,
        name: INITIAL_CHARACTER.name,
        class: INITIAL_CHARACTER.class,
        level: INITIAL_CHARACTER.level,
        current_xp: INITIAL_CHARACTER.current_xp,
        xp_to_next_level: INITIAL_CHARACTER.xp_to_next_level,
      }])
      .select()
      .single()

    if (charError || !character) {
      console.error('Error creating character:', charError)
      isLoading = false
      return
    }

    // Insert core stats
    const coreStatsData = INITIAL_CORE_STATS.map(stat => ({
      character_id: character.id,
      stat_name: stat.stat_name,
      base_value: stat.base_value,
      current_value: stat.current_value,
      modifier: stat.modifier,
    }))

    const { error: coreStatsError } = await supabase.from('core_stats').insert(coreStatsData)
    
    if (coreStatsError) {
      console.error('Error inserting core stats:', coreStatsError)
      isLoading = false
      return
    }

    // Insert abilities
    const abilitiesData = INITIAL_ABILITIES.map(ability => ({
      character_id: character.id,
      core_stat: ability.core_stat,
      ability_name: ability.ability_name,
      initial_value: ability.initial_value,
      base_value: ability.base_value,
      current_value: ability.current_value,
      times_used_this_level: ability.times_used_this_level,
      total_times_used: ability.total_times_used,
    }))

    const { error: abilitiesError } = await supabase.from('abilities').insert(abilitiesData)
    
    if (abilitiesError) {
      console.error('Error inserting abilities:', abilitiesError)
      isLoading = false
      return
    }

    // Insert traits
    const traitsData = INITIAL_TRAITS.map(trait => ({
      character_id: character.id,
      trait_name: trait.trait_name,
      trait_type: trait.trait_type,
      description: trait.description,
      mechanical_effect: trait.mechanical_effect,
      is_active: trait.is_active,
    }))

    await supabase.from('traits').insert(traitsData)

    // Insert inventory
    const inventoryData = INITIAL_INVENTORY.map(item => ({
      character_id: character.id,
      item_name: item.item_name,
      description: item.description,
      item_type: item.item_type,
      passive_effect: item.passive_effect,
      condition: item.condition,
      is_equipped: item.is_equipped,
    }))

    await supabase.from('inventory').insert(inventoryData)

    // Insert quests
    const questsData = INITIAL_QUESTS.map(quest => ({
      character_id: character.id,
      quest_name: quest.quest_name,
      quest_type: quest.quest_type,
      core_stat: quest.core_stat,
      abilities_used: quest.abilities_used,
      xp_reward: quest.xp_reward,
      difficulty_class: quest.difficulty_class,
      progression_milestone: quest.progression_milestone,
      times_completed: quest.times_completed,
      description: quest.description,
      deadline: quest.deadline,
      is_active: quest.is_active,
    }))

    await supabase.from('quests').insert(questsData)

    // Initialize hit dice
    const bodyStatValue = 10 + INITIAL_ABILITIES
      .filter(a => a.core_stat === 'body')
      .reduce((sum, a) => sum + (a.current_value - a.initial_value), 0)

    const maxHD = Math.ceil(bodyStatValue / 2.5)

    await supabase.from('hit_dice').insert([{
      character_id: character.id,
      max_hit_dice: maxHD,
      current_hit_dice: maxHD,
      exhaustion_level: 0,
      days_at_zero: 0,
      last_long_rest: null,
    }])

    // Initialize inspiration tokens
    await supabase.from('inspiration_tokens').insert([{
      character_id: character.id,
      token_count: 0,
    }])

    console.log('✅ Seed data created in Supabase successfully!')

    // Load into store
    await loadDataFromSupabase(user.id)
    isLoading = false

  } catch (error) {
    console.error('Error loading seed data:', error)
    isLoading = false
  }
}

/**
 * Load character data from Supabase into the Zustand store
 */
export async function loadDataFromSupabase(userId: string) {
  const store = useStore.getState()

  // Load character
  const { data: character, error: charLoadError } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (charLoadError) {
    console.error('Error loading character:', charLoadError)
    return
  }

  if (character) {
    store.setCharacter(character)

    // Load core stats
    const { data: coreStats } = await supabase
      .from('core_stats')
      .select('*')
      .eq('character_id', character.id)

    if (coreStats) {
      store.setCoreStats(coreStats)
    }

    // Load abilities
    const { data: abilities } = await supabase
      .from('abilities')
      .select('*')
      .eq('character_id', character.id)

    if (abilities) {
      store.setAbilities(abilities)
    }

    // Load traits
    const { data: traits } = await supabase
      .from('traits')
      .select('*')
      .eq('character_id', character.id)

    if (traits) {
      store.setTraits(traits)
    }

    // Load inventory
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('character_id', character.id)

    if (inventory) {
      store.setInventory(inventory)
    }

    // Load quests
    const { data: quests } = await supabase
      .from('quests')
      .select('*')
      .eq('character_id', character.id)

    if (quests) {
      store.setQuests(quests)
    }

    // Load hit dice
    const { data: hitDice } = await supabase
      .from('hit_dice')
      .select('*')
      .eq('character_id', character.id)
      .maybeSingle()

    if (hitDice) {
      store.setHitDice(hitDice)
    } else {
      // Hit dice doesn't exist, create it
      console.log('⚠️ Hit dice not found, creating...')

      // Get body stat value to calculate max hit dice
      const { data: coreStats } = await supabase
        .from('core_stats')
        .select('*')
        .eq('character_id', character.id)
        .eq('stat_name', 'body')
        .single()

      const bodyValue = coreStats?.current_value || 10
      const maxHD = Math.ceil(bodyValue / 2.5)

      const { data: newHitDice } = await supabase
        .from('hit_dice')
        .insert([{
          character_id: character.id,
          max_hit_dice: maxHD,
          current_hit_dice: maxHD,
          exhaustion_level: 0,
          days_at_zero: 0,
          last_long_rest: null,
        }])
        .select()
        .single()

      if (newHitDice) {
        store.setHitDice(newHitDice)
        console.log('✅ Hit dice created:', newHitDice)
      }
    }

    // Load inspiration tokens
    const { data: inspiration } = await supabase
      .from('inspiration_tokens')
      .select('*')
      .eq('character_id', character.id)
      .maybeSingle()

    if (inspiration) {
      store.setInspirationTokens(inspiration)
    }

    console.log('✅ Data loaded from Supabase into store!')
  }
}
