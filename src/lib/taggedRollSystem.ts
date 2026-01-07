// ============================================================================
// Roll Logging with Tags
// ============================================================================
// Extension of rollSystem.ts to handle tag-based roll logging

import { supabase } from './supabase'
import type { RollResult, ActionLogEntry } from '@/types/rolls'
import type { RollTags, DieRoll } from '@/types/tags'
import { getTotalDiceValue, isCriticalSuccess, isCriticalFailure, ModifierTag } from '@/types/tags'
import { getTodayLocalDate } from './dateUtils'

/**
 * Log a roll with structured tags
 */
export async function logRollWithTags(
  result: RollResult,
  characterId: string,
  tags: RollTags,
  notes?: string
): Promise<ActionLogEntry> {
  const today = getTodayLocalDate()
  const now = new Date().toISOString()

  // Build tags with auto-detected effects
  const completeTags: RollTags = {
    ...tags,
    // Add auto-detected traits from active effects
    traits: [
      ...tags.traits,
      ...result.activeEffects
        .filter((e) => e.sourceType === 'trait')
        .filter((e) => !tags.traits.some((t) => t.id === e.id))
        .map((e) => ({
          id: e.id,
          name: e.source,
          isUserAdded: false,
        })),
    ],
    // Add auto-detected items
    items: [
      ...tags.items,
      ...result.activeEffects
        .filter((e) => e.sourceType === 'item')
        .filter((e) => !tags.items.some((i) => i.id === e.id))
        .map((e) => ({
          id: e.id,
          name: e.source,
          isUserAdded: false,
        })),
    ],
    // Add auto-detected custom effects
    effects: [
      ...tags.effects,
      ...result.activeEffects
        .filter((e) => e.sourceType === 'custom')
        .filter((e) => !tags.effects.some((ef) => ef.id === e.id))
        .map((e) => ({
          id: e.id,
          name: e.source,
          isUserAdded: false,
        })),
    ],
    // Add critical success/failure modifiers
    modifiers: [...new Set([
      ...tags.modifiers,
      ...(isCriticalSuccess(tags.dice) ? [ModifierTag.CRITICAL_SUCCESS] : []),
      ...(isCriticalFailure(tags.dice) ? [ModifierTag.CRITICAL_FAILURE] : []),
    ])],
  }

  // Map roll type tag to action_type for database
  const actionTypeMap: Record<string, string> = {
    ability_check: 'skill_check',
    saving_throw: 'saving_throw',
    attack: 'attack',
    damage: 'damage',
    initiative: 'skill_check',
  }

  const dbRollType = actionTypeMap[tags.rollType || ''] || 'skill_check'

  // Create action log entry with tags
  const actionLogEntry: ActionLogEntry = {
    character_id: characterId,
    action_date: today,
    action_time: now,
    action_type: dbRollType,
    roll_type: dbRollType,
    ability_used: tags.ability,
    roll_value: result.d20Value,
    modifier_value: result.totalModifier,
    modifier_breakdown: result.modifierBreakdown.map((b) => ({
      label: b.source,
      value: b.value,
    })),
    total_value: result.totalValue,
    difficulty_class: result.dc,
    had_advantage: result.hasAdvantage,
    had_disadvantage: result.hasDisadvantage,
    success: result.success,
    xp_awarded: result.xpAwarded,
    notes: notes,
    tags: completeTags,
  }

  const { data: insertedLog, error: logError } = await supabase
    .from('action_log')
    .insert(actionLogEntry)
    .select()
    .single()

  if (logError) throw logError

  // Award XP if any
  if (result.xpAwarded > 0) {
    const { error: xpError } = await supabase.rpc('award_xp', {
      char_id: characterId,
      xp_amount: result.xpAwarded,
    })

    if (xpError) throw xpError
  }

  // Increment ability usage if applicable
  if (result.abilityUsed) {
    const { data: abilityData } = await supabase
      .from('abilities')
      .select('times_used_this_level, total_times_used')
      .eq('character_id', characterId)
      .eq('ability_name', result.abilityUsed)
      .single()

    if (abilityData) {
      const { error: abilityError } = await supabase
        .from('abilities')
        .update({
          times_used_this_level: abilityData.times_used_this_level + 1,
          total_times_used: abilityData.total_times_used + 1,
        })
        .eq('character_id', characterId)
        .eq('ability_name', result.abilityUsed)

      if (abilityError) throw abilityError
    }
  }

  return insertedLog
}

/**
 * Calculate total dice value including all dice in a roll
 */
export function calculateTotalDiceValue(dice: DieRoll[]): number {
  return getTotalDiceValue(dice)
}

/**
 * Build a RollTags object with auto-detected modifiers
 */
export function buildAutoTags(
  userTags: Partial<RollTags>,
  diceValues: DieRoll[]
): RollTags {
  const modifiers = [...(userTags.modifiers || [])]

  // Auto-add critical success/failure
  if (isCriticalSuccess(diceValues) && !modifiers.includes(ModifierTag.CRITICAL_SUCCESS)) {
    modifiers.push(ModifierTag.CRITICAL_SUCCESS)
  }
  if (isCriticalFailure(diceValues) && !modifiers.includes(ModifierTag.CRITICAL_FAILURE)) {
    modifiers.push(ModifierTag.CRITICAL_FAILURE)
  }

  // Handle advantage/disadvantage cancellation
  const hasAdvantage = modifiers.includes(ModifierTag.ADVANTAGE)
  const hasDisadvantage = modifiers.includes(ModifierTag.DISADVANTAGE)
  if (hasAdvantage && hasDisadvantage) {
    // Remove both, add flat
    const filteredModifiers = modifiers.filter(
      (m) => m !== ModifierTag.ADVANTAGE && m !== ModifierTag.DISADVANTAGE
    )
    filteredModifiers.push(ModifierTag.FLAT)
    return {
      dice: diceValues,
      modifiers: filteredModifiers,
      customModifiers: userTags.customModifiers || [],
      traits: userTags.traits || [],
      items: userTags.items || [],
      effects: userTags.effects || [],
      organizational: userTags.organizational || [],
      rollType: userTags.rollType,
      ability: userTags.ability,
      coreStat: userTags.coreStat,
      dc: userTags.dc,
    }
  }

  return {
    dice: diceValues,
    modifiers,
    customModifiers: userTags.customModifiers || [],
    traits: userTags.traits || [],
    items: userTags.items || [],
    effects: userTags.effects || [],
    organizational: userTags.organizational || [],
    rollType: userTags.rollType,
    ability: userTags.ability,
    coreStat: userTags.coreStat,
    dc: userTags.dc,
  }
}
