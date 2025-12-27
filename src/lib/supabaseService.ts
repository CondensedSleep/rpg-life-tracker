import { supabase } from './supabase'
import type { Trait, InventoryItem, Quest } from '@/types'
import { recalculateAbilityValues } from './abilityService'
import { evaluateTraitIsActive, calculateXPToNextLevel } from './calculations'

// ============================================================================
// TRAITS
// ============================================================================

export async function createTrait(characterId: string, trait: Partial<Trait>) {
  // Fetch abilities to evaluate trait conditions
  const { data: abilities } = await supabase
    .from('abilities')
    .select('*')
    .eq('character_id', characterId)

  // Calculate is_active based on conditions
  const traitToInsert = {
    character_id: characterId,
    trait_name: trait.trait_name,
    trait_type: trait.trait_type,
    description: trait.description,
    mechanical_effect: trait.mechanical_effect,
  }

  // Evaluate if trait should be active
  const isActive = abilities && abilities.length > 0
    ? evaluateTraitIsActive(traitToInsert as Trait, abilities)
    : true // Default to true if no abilities yet

  const { data, error } = await supabase
    .from('traits')
    .insert([{
      ...traitToInsert,
      is_active: isActive,
    }])
    .select()
    .single()

  // Recalculate ability values if trait has mechanical effects
  if (data && !error && trait.mechanical_effect) {
    await recalculateAbilityValues(characterId)
  }

  return { data, error }
}

export async function updateTrait(traitId: string, updates: Partial<Trait>) {
  // Get the trait first to access character_id
  const { data: existingTrait } = await supabase
    .from('traits')
    .select('character_id')
    .eq('id', traitId)
    .single()

  if (!existingTrait) {
    return { data: null, error: new Error('Trait not found') }
  }

  // Fetch abilities to evaluate trait conditions
  const { data: abilities } = await supabase
    .from('abilities')
    .select('*')
    .eq('character_id', existingTrait.character_id)

  // Calculate is_active based on conditions
  const traitUpdates = { ...updates }

  // Evaluate if trait should be active (if mechanical_effect is being updated)
  if (abilities && abilities.length > 0) {
    const isActive = evaluateTraitIsActive(
      { ...existingTrait, ...traitUpdates } as Trait,
      abilities
    )
    traitUpdates.is_active = isActive
  }

  const { data, error } = await supabase
    .from('traits')
    .update(traitUpdates)
    .eq('id', traitId)
    .select()
    .single()

  // Recalculate ability values when trait is modified
  if (data && !error) {
    await recalculateAbilityValues(data.character_id)
  }

  return { data, error }
}

export async function deleteTrait(traitId: string) {
  // Get character_id before deleting
  const { data: trait } = await supabase
    .from('traits')
    .select('character_id')
    .eq('id', traitId)
    .single()

  const { error } = await supabase
    .from('traits')
    .delete()
    .eq('id', traitId)

  // Recalculate ability values after trait deletion
  if (!error && trait) {
    await recalculateAbilityValues(trait.character_id)
  }

  return { error }
}

// ============================================================================
// INVENTORY
// ============================================================================

export async function createInventoryItem(characterId: string, item: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory')
    .insert([{
      character_id: characterId,
      item_name: item.item_name,
      item_type: item.item_type,
      description: item.description,
      passive_effect: item.passive_effect,
      condition: item.condition,
      is_equipped: item.is_equipped ?? true,
    }])
    .select()
    .single()

  // Recalculate ability values if item has passive effects
  if (data && !error && item.passive_effect) {
    await recalculateAbilityValues(characterId)
  }

  return { data, error }
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  // Recalculate ability values when item is modified (especially is_equipped)
  if (data && !error) {
    await recalculateAbilityValues(data.character_id)
  }

  return { data, error }
}

export async function deleteInventoryItem(itemId: string) {
  // Get character_id before deleting
  const { data: item } = await supabase
    .from('inventory')
    .select('character_id')
    .eq('id', itemId)
    .single()

  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', itemId)

  // Recalculate ability values after item deletion
  if (!error && item) {
    await recalculateAbilityValues(item.character_id)
  }

  return { error }
}

// ============================================================================
// QUESTS
// ============================================================================

export async function createQuest(characterId: string, quest: Partial<Quest>) {
  const { data, error } = await supabase
    .from('quests')
    .insert([{
      character_id: characterId,
      quest_name: quest.quest_name,
      quest_type: quest.quest_type,
      core_stat: quest.core_stat,
      abilities_used: quest.abilities_used,
      xp_reward: quest.xp_reward,
      difficulty_class: quest.difficulty_class,
      progression_milestone: quest.progression_milestone,
      description: quest.description,
      deadline: quest.deadline,
      is_active: quest.is_active ?? true,
      times_completed: 0,
      parent_quest_id: quest.parent_quest_id,
      quest_tree: quest.quest_tree,
    }])
    .select()
    .single()

  return { data, error }
}

export async function updateQuest(questId: string, updates: Partial<Quest>) {
  const { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', questId)
    .select()
    .single()

  return { data, error }
}

export async function deleteQuest(questId: string) {
  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', questId)

  return { error }
}

export async function completeQuest(questId: string, characterId: string) {
  // Get the quest
  const { data: quest, error: fetchError } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single()

  if (fetchError || !quest) return { error: fetchError }

  // Increment times_completed
  const { data: updatedQuest, error: updateError } = await supabase
    .from('quests')
    .update({ times_completed: quest.times_completed + 1 })
    .eq('id', questId)
    .select()
    .single()

  if (updateError) return { error: updateError }

  // Award XP to character
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('current_xp, xp_to_next_level, level')
    .eq('id', characterId)
    .single()

  if (charError || !character) return { error: charError }

  const newXP = character.current_xp + quest.xp_reward

  const { error: xpError } = await supabase
    .from('characters')
    .update({ current_xp: newXP })
    .eq('id', characterId)

  if (xpError) return { error: xpError }

  // Check progression milestones
  if (quest.progression_milestone && quest.progression_milestone.length > 0) {
    const newCompletionCount = quest.times_completed + 1

    // Check each milestone
    for (const milestone of quest.progression_milestone) {
      if (newCompletionCount % milestone.every === 0) {
        // Increment ability value
        const { data: ability, error: abilityFetchError } = await supabase
          .from('abilities')
          .select('*')
          .eq('character_id', characterId)
          .eq('ability_name', milestone.ability)
          .single()

        if (!abilityFetchError && ability) {
          await supabase
            .from('abilities')
            .update({
              current_value: ability.current_value + milestone.gain
            })
            .eq('id', ability.id)

          console.log(`✨ Milestone reached! +${milestone.gain} ${milestone.ability}`)
        }
      }
    }
  }

  return { data: { ...updatedQuest, xp_awarded: quest.xp_reward }, error: null }
}

// ============================================================================
// CHARACTER LEVEL UP
// ============================================================================

export async function levelUpCharacter(characterId: string, abilityName: string) {
  // Get current character data
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('level, current_xp, xp_to_next_level')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { data: null, error: charError || new Error('Character not found') }
  }

  // Calculate new level and XP threshold
  const newLevel = character.level + 1
  const newXPToNext = calculateXPToNextLevel(newLevel)

  // Calculate excess XP to carry over to next level
  const excessXP = Math.max(0, character.current_xp - character.xp_to_next_level)

  // Update character level, XP threshold, and carry over excess XP
  const { error: levelUpError } = await supabase
    .from('characters')
    .update({
      level: newLevel,
      xp_to_next_level: newXPToNext,
      current_xp: excessXP,
    })
    .eq('id', characterId)

  if (levelUpError) {
    return { data: null, error: levelUpError }
  }

  // Get the ability to update
  const { data: ability, error: abilityFetchError } = await supabase
    .from('abilities')
    .select('*')
    .eq('character_id', characterId)
    .eq('ability_name', abilityName)
    .single()

  if (abilityFetchError || !ability) {
    return { data: null, error: abilityFetchError || new Error('Ability not found') }
  }

  // Update ability: increment base_value and reset times_used_this_level
  const { error: abilityUpdateError } = await supabase
    .from('abilities')
    .update({
      base_value: ability.base_value + 1,
      times_used_this_level: 0,
    })
    .eq('id', ability.id)

  if (abilityUpdateError) {
    return { data: null, error: abilityUpdateError }
  }

  // Reset all other abilities' times_used_this_level
  const { error: resetError } = await supabase
    .from('abilities')
    .update({ times_used_this_level: 0 })
    .eq('character_id', characterId)
    .neq('id', ability.id)

  if (resetError) {
    console.error('Error resetting ability usage counters:', resetError)
  }

  // Recalculate ability values (to update current_value based on new base_value)
  await recalculateAbilityValues(characterId)

  return {
    data: {
      newLevel,
      newXPToNext,
      selectedAbility: abilityName,
    },
    error: null,
  }
}

// ============================================================================
// HIT DICE / REST SYSTEM
// ============================================================================

export async function takeLongRest(characterId: string) {
  // Get current hit dice data
  const { data: hitDice, error: fetchError } = await supabase
    .from('hit_dice')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (fetchError || !hitDice) {
    return { data: null, error: fetchError || new Error('Hit dice not found') }
  }

  // Calculate exhaustion level based on days at zero
  const newExhaustionLevel = hitDice.days_at_zero >= 3 ? 1 : 0

  // Update hit dice: restore to max, reset exhaustion and days_at_zero
  const { error: updateError } = await supabase
    .from('hit_dice')
    .update({
      current_hit_dice: hitDice.max_hit_dice,
      exhaustion_level: newExhaustionLevel,
      days_at_zero: 0,
      last_long_rest: new Date().toISOString().split('T')[0],
    })
    .eq('id', hitDice.id)

  if (updateError) {
    return { data: null, error: updateError }
  }

  return {
    data: {
      current_hit_dice: hitDice.max_hit_dice,
      exhaustion_level: newExhaustionLevel,
      days_at_zero: 0,
    },
    error: null,
  }
}

export async function spendHitDie(characterId: string) {
  // Get current hit dice data
  const { data: hitDice, error: fetchError } = await supabase
    .from('hit_dice')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (fetchError || !hitDice) {
    return { data: null, error: fetchError || new Error('Hit dice not found') }
  }

  if (hitDice.current_hit_dice <= 0) {
    return { data: null, error: new Error('No hit dice remaining') }
  }

  const newCurrent = hitDice.current_hit_dice - 1
  const newDaysAtZero = newCurrent === 0 ? hitDice.days_at_zero + 1 : hitDice.days_at_zero

  // Update hit dice
  const { error: updateError } = await supabase
    .from('hit_dice')
    .update({
      current_hit_dice: newCurrent,
      days_at_zero: newDaysAtZero,
    })
    .eq('id', hitDice.id)

  if (updateError) {
    return { data: null, error: updateError }
  }

  return {
    data: {
      current_hit_dice: newCurrent,
      days_at_zero: newDaysAtZero,
    },
    error: null,
  }
}
// ============================================================================
// CORE STATS & ABILITIES - INITIAL VALUES
// ============================================================================

export async function updateCoreStatBaseValue(characterId: string, statName: string, newBaseValue: number) {
  const { data, error } = await supabase
    .from('core_stats')
    .update({ base_value: newBaseValue })
    .eq('character_id', characterId)
    .eq('stat_name', statName)
    .select()
    .single()

  // Recalculate ability values since they depend on core stats
  if (!error && data) {
    await recalculateAbilityValues(characterId)
  }

  return { data, error }
}

export async function updateAbilityBaseValue(characterId: string, abilityName: string, newBaseValue: number) {
  const { data, error } = await supabase
    .from('abilities')
    .update({ base_value: newBaseValue })
    .eq('character_id', characterId)
    .eq('ability_name', abilityName)
    .select()
    .single()

  // Recalculate ability values
  if (!error && data) {
    await recalculateAbilityValues(characterId)
  }

  return { data, error }
}