import { supabase } from './supabase'
import type { Trait, InventoryItem, Quest } from '@/types'

// ============================================================================
// TRAITS
// ============================================================================

export async function createTrait(characterId: string, trait: Partial<Trait>) {
  const { data, error } = await supabase
    .from('traits')
    .insert([{
      character_id: characterId,
      trait_name: trait.trait_name,
      trait_type: trait.trait_type,
      description: trait.description,
      mechanical_effect: trait.mechanical_effect,
      is_active: trait.is_active ?? true,
    }])
    .select()
    .single()

  return { data, error }
}

export async function updateTrait(traitId: string, updates: Partial<Trait>) {
  const { data, error } = await supabase
    .from('traits')
    .update(updates)
    .eq('id', traitId)
    .select()
    .single()

  return { data, error }
}

export async function deleteTrait(traitId: string) {
  const { error } = await supabase
    .from('traits')
    .delete()
    .eq('id', traitId)

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

  return { data, error }
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  return { data, error }
}

export async function deleteInventoryItem(itemId: string) {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', itemId)

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
