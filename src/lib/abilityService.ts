import { supabase } from './supabase'
import type { Ability, Trait, InventoryItem } from '@/types'
import { calculateTotalModifier, evaluateTraitIsActive } from './calculations'

/**
 * Recalculate and update current_value for all abilities based on active effects
 * This should be called whenever:
 * - A trait is added/removed/toggled
 * - An inventory item is equipped/unequipped
 * - Base values change (level-ups)
 */
export async function recalculateAbilityValues(
  characterId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // Fetch all necessary data
    const [abilitiesRes, traitsRes, inventoryRes] = await Promise.all([
      supabase.from('abilities').select('*').eq('character_id', characterId),
      supabase.from('traits').select('*').eq('character_id', characterId),
      supabase.from('inventory').select('*').eq('character_id', characterId),
    ])

    if (abilitiesRes.error) throw abilitiesRes.error
    if (traitsRes.error) throw traitsRes.error
    if (inventoryRes.error) throw inventoryRes.error

    const abilities = abilitiesRes.data as Ability[]
    const traits = traitsRes.data as Trait[]
    const inventory = inventoryRes.data as InventoryItem[]

    // First, recalculate trait is_active values based on current ability values
    await recalculateTraitActiveStatus(abilities, traits)

    // Fetch updated traits after recalculation
    const updatedTraitsRes = await supabase
      .from('traits')
      .select('*')
      .eq('character_id', characterId)
    const updatedTraits = updatedTraitsRes.data as Trait[]

    // Calculate modified values for each ability
    const updates = abilities.map((ability) => {
      const modifierCalc = calculateTotalModifier(
        ability.ability_name,
        ability.base_value,
        abilities,
        updatedTraits, // Use updated traits with correct is_active values
        inventory,
        {
          state: 'normal', // Don't include day state in stored values
          affectedStats: [],
        }
      )

      return {
        id: ability.id,
        current_value: modifierCalc.total,
      }
    })

    // Batch update all abilities
    for (const update of updates) {
      await supabase
        .from('abilities')
        .update({ current_value: update.current_value })
        .eq('id', update.id)
    }

    console.log(`✅ Recalculated ${updates.length} ability values`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error recalculating ability values:', error)
    return { success: false, error }
  }
}

/**
 * Recalculate and update is_active for all traits based on their conditions
 */
async function recalculateTraitActiveStatus(
  abilities: Ability[],
  traits: Trait[]
): Promise<void> {
  // Update each trait's is_active based on its conditions
  for (const trait of traits) {
    const isActive = evaluateTraitIsActive(trait, abilities)
    
    // Only update if the value changed
    if (trait.is_active !== isActive) {
      await supabase
        .from('traits')
        .update({ is_active: isActive })
        .eq('id', trait.id)
    }
  }
}

/**
 * Recalculate a single ability's current_value
 */
export async function recalculateSingleAbility(
  _abilityId: string,
  characterId: string
): Promise<{ success: boolean; error?: any }> {
  // For now, just recalculate all - optimization later if needed
  return recalculateAbilityValues(characterId)
}
