/**
 * Ability Calculations Module
 * 
 * Handles recalculation of ability current_value based on passive modifiers
 * from active effects with met conditions.
 */

import { supabase } from './supabase'
import { evaluateCondition } from './effectSystem'

interface PassiveModifier {
  ability: string
  value: number
}

interface UnifiedEffect {
  id: string
  name: string
  condition: string | null
  passive_modifiers: PassiveModifier[]
  is_active: boolean
}

interface Ability {
  id: string
  ability_name: string
  base_value: number
  current_value: number
}

/**
 * Recalculate current_value for all abilities based on passive modifiers
 * Should be called after:
 * - Adding/updating/deleting effects
 * - Toggling effect is_active status
 * - Updating ability base_value
 */
export async function recalculateAbilityCurrentValues(characterId: string): Promise<void> {
  try {
    // Fetch all abilities for this character
    const { data: abilities, error: abilitiesError } = await supabase
      .from('abilities')
      .select('*')
      .eq('character_id', characterId)

    if (abilitiesError) throw abilitiesError
    if (!abilities) return

    // Fetch all active effects with passive modifiers
    const { data: effects, error: effectsError } = await supabase
      .from('effects')
      .select('id, name, condition, passive_modifiers, is_active')
      .eq('character_id', characterId)
      .eq('is_active', true)

    if (effectsError) throw effectsError
    if (!effects) {
      // No effects - reset all abilities to base_value
      for (const ability of abilities) {
        if (ability.current_value !== ability.base_value) {
          await supabase
            .from('abilities')
            .update({ current_value: ability.base_value })
            .eq('id', ability.id)
        }
      }
      return
    }

    // Calculate passive modifiers per ability
    const modifiersByAbility: Record<string, number> = {}

    for (const effect of effects as UnifiedEffect[]) {
      if (!effect.passive_modifiers || effect.passive_modifiers.length === 0) {
        continue
      }

      // Check if condition is met (if exists)
      let conditionMet = true
      if (effect.condition) {
        conditionMet = evaluateCondition(
          effect.condition,
          abilities.map(a => ({ ability_name: a.ability_name, current_value: a.base_value }))
        )
      }

      if (!conditionMet) {
        continue
      }

      // Apply passive modifiers
      for (const modifier of effect.passive_modifiers) {
        if (!modifiersByAbility[modifier.ability]) {
          modifiersByAbility[modifier.ability] = 0
        }
        modifiersByAbility[modifier.ability] += modifier.value
      }
    }

    // Update each ability's current_value
    for (const ability of abilities as Ability[]) {
      const passiveModifier = modifiersByAbility[ability.ability_name] || 0
      const newCurrentValue = ability.base_value + passiveModifier

      if (ability.current_value !== newCurrentValue) {
        await supabase
          .from('abilities')
          .update({ current_value: newCurrentValue })
          .eq('id', ability.id)
      }
    }

    console.log(`✅ Recalculated ability values for character ${characterId}`)
  } catch (error) {
    console.error('Error recalculating ability values:', error)
    throw error
  }
}

/**
 * Get breakdown of passive modifiers for a specific ability
 * Useful for displaying tooltip/details in UI
 */
export async function getPassiveModifierBreakdown(
  characterId: string,
  abilityName: string
): Promise<{ source: string; value: number }[]> {
  try {
    const { data: abilities, error: abilitiesError } = await supabase
      .from('abilities')
      .select('*')
      .eq('character_id', characterId)

    if (abilitiesError) throw abilitiesError
    if (!abilities) return []

    const { data: effects, error: effectsError } = await supabase
      .from('effects')
      .select('id, name, condition, passive_modifiers, is_active')
      .eq('character_id', characterId)
      .eq('is_active', true)

    if (effectsError) throw effectsError
    if (!effects) return []

    const breakdown: { source: string; value: number }[] = []

    for (const effect of effects as UnifiedEffect[]) {
      if (!effect.passive_modifiers || effect.passive_modifiers.length === 0) {
        continue
      }

      // Check condition
      let conditionMet = true
      if (effect.condition) {
        conditionMet = evaluateCondition(
          effect.condition,
          abilities.map(a => ({ ability_name: a.ability_name, current_value: a.base_value }))
        )
      }

      if (!conditionMet) {
        continue
      }

      // Find modifier for this ability
      const modifier = effect.passive_modifiers.find(m => m.ability === abilityName)
      if (modifier && modifier.value !== 0) {
        breakdown.push({
          source: effect.name,
          value: modifier.value
        })
      }
    }

    return breakdown
  } catch (error) {
    console.error('Error getting passive modifier breakdown:', error)
    return []
  }
}
