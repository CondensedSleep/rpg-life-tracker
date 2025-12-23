import { supabase } from './supabase'
import type { Ability, Trait, InventoryItem, CustomEffect, DayState } from '@/types'
import { calculateTotalModifier } from './calculations'
import { getTodayLocalDate } from './dateUtils'

// ============================================================================
// ABILITY CHECK
// ============================================================================

export async function logAbilityCheck(params: {
  characterId: string
  abilityName?: string | null
  rollValue: number
  dc?: number | null
  hadAdvantage?: boolean | null
  hadDisadvantage?: boolean | null
  additionalModifier?: number | null
  description?: string | null
  xpGained?: number | null
  taggedItems?: string[] | null
}) {
  const {
    characterId,
    abilityName,
    rollValue,
    dc,
    hadAdvantage: manualAdvantage,
    hadDisadvantage: manualDisadvantage,
    additionalModifier,
    description,
    xpGained,
    taggedItems,
  } = params

  // Fetch necessary data for calculations
  const { data: abilities } = await supabase
    .from('abilities')
    .select('*')
    .eq('character_id', characterId)

  const { data: traits } = await supabase
    .from('traits')
    .select('*')
    .eq('character_id', characterId)

  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)

  const { data: customEffects } = await supabase
    .from('custom_effects')
    .select('*')
    .eq('character_id', characterId)
    .gt('expires_at', new Date().toISOString())

  const { data: dailyRoll } = await supabase
    .from('daily_rolls')
    .select('*')
    .eq('character_id', characterId)
    .eq('roll_date', getTodayLocalDate())
    .maybeSingle()

  if (!abilities || !traits || !inventory) {
    return { data: null, error: new Error('Failed to fetch character data') }
  }

  // Find the ability being used
  const ability = abilityName
    ? abilities.find(a => a.ability_name === abilityName)
    : null

  // Calculate modifier
  const modifierCalc = ability
    ? calculateTotalModifier(
        ability.ability_name,
        ability.base_value,
        abilities,
        traits,
        inventory,
        customEffects || [],
        {
          state: dailyRoll?.day_state || 'normal',
          affectedStats: dailyRoll?.affected_stats || [],
          selectedStat: dailyRoll?.affected_stats?.[0],
        }
      )
    : { total: 0, hasAdvantage: false, hasDisadvantage: false }

  // Include additional modifier from form
  const baseModifier = modifierCalc.total
  const modifier = baseModifier + (additionalModifier || 0)
  const totalResult = rollValue + modifier

  // Build modifier breakdown for display
  const modifierBreakdown: Array<{ label: string; value: number }> = []
  if (abilityName || baseModifier !== 0) {
    modifierBreakdown.push({ label: abilityName || 'Base', value: baseModifier })
  }
  if (additionalModifier !== null && additionalModifier !== undefined) {
    modifierBreakdown.push({ label: 'Additional Modifier', value: additionalModifier })
  }

  // Merge calculated advantage/disadvantage with manual overrides
  const hasAdvantage = manualAdvantage || modifierCalc.hasAdvantage
  const hasDisadvantage = manualDisadvantage || modifierCalc.hasDisadvantage

  // Determine outcome
  let outcome: 'success' | 'failed' | 'critical_success' | 'critical_failure' | null = null
  if (rollValue === 20) {
    outcome = 'critical_success'
  } else if (rollValue === 1) {
    outcome = 'critical_failure'
  } else if (dc !== null && dc !== undefined) {
    outcome = totalResult >= dc ? 'success' : 'failed'
  } else {
    // No DC means automatic success
    outcome = 'success'
  }

  // Calculate final XP
  let finalXP = 0
  if (outcome === 'success' || outcome === 'critical_success') {
    if (outcome === 'critical_success' && xpGained) {
      finalXP = xpGained * 2
    } else if (xpGained) {
      finalXP = xpGained
    }
  }

  // Create action log entry
  const { data: actionLog, error: logError } = await supabase
    .from('action_log')
    .insert([{
      character_id: characterId,
      action_date: getTodayLocalDate(),
      action_time: new Date().toISOString(),
      action_type: 'skill_check',
      roll_type: 'skill_check',
      ability_used: abilityName,
      roll_value: rollValue,
      modifier_value: modifier,
      modifier_breakdown: modifierBreakdown.length > 0 ? modifierBreakdown : null,
      total_value: totalResult,
      difficulty_class: dc,
      had_advantage: hasAdvantage,
      had_disadvantage: hasDisadvantage,
      success: outcome === 'success' || outcome === 'critical_success',
      xp_awarded: finalXP > 0 ? finalXP : null,
      notes: description,
    }])
    .select()
    .single()

  if (logError) {
    return { data: null, error: logError }
  }

  // Award XP to character if any
  if (finalXP > 0) {
    const { data: character } = await supabase
      .from('characters')
      .select('current_xp')
      .eq('id', characterId)
      .single()

    if (character) {
      await supabase
        .from('characters')
        .update({ current_xp: character.current_xp + finalXP })
        .eq('id', characterId)
    }
  }

  // Increment ability usage if ability was specified
  if (ability) {
    await supabase
      .from('abilities')
      .update({
        times_used_this_level: ability.times_used_this_level + 1,
        total_times_used: ability.total_times_used + 1,
      })
      .eq('id', ability.id)
  }

  return {
    data: {
      ...actionLog,
      outcome,
      finalXP,
    },
    error: null,
  }
}

// ============================================================================
// SAVING THROW
// ============================================================================

export async function logSavingThrow(params: {
  characterId: string
  abilityName?: string | null
  rollValue: number
  dc?: number | null
  hadAdvantage?: boolean | null
  hadDisadvantage?: boolean | null
  additionalModifier?: number | null
  description?: string | null
  xpGained?: number | null
  taggedItems?: string[] | null
}) {
  const {
    characterId,
    abilityName,
    rollValue,
    dc,
    hadAdvantage: manualAdvantage,
    hadDisadvantage: manualDisadvantage,
    additionalModifier,
    description,
    xpGained,
    taggedItems,
  } = params

  // Fetch necessary data (same as ability check)
  const { data: abilities } = await supabase
    .from('abilities')
    .select('*')
    .eq('character_id', characterId)

  const { data: traits } = await supabase
    .from('traits')
    .select('*')
    .eq('character_id', characterId)

  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)

  const { data: customEffects } = await supabase
    .from('custom_effects')
    .select('*')
    .eq('character_id', characterId)
    .gt('expires_at', new Date().toISOString())

  const { data: dailyRoll } = await supabase
    .from('daily_rolls')
    .select('*')
    .eq('character_id', characterId)
    .eq('roll_date', getTodayLocalDate())
    .maybeSingle()

  if (!abilities || !traits || !inventory) {
    return { data: null, error: new Error('Failed to fetch character data') }
  }

  const ability = abilityName
    ? abilities.find(a => a.ability_name === abilityName)
    : null

  const modifierCalc = ability
    ? calculateTotalModifier(
        ability.ability_name,
        ability.base_value,
        abilities,
        traits,
        inventory,
        customEffects || [],
        {
          state: dailyRoll?.day_state || 'normal',
          affectedStats: dailyRoll?.affected_stats || [],
          selectedStat: dailyRoll?.affected_stats?.[0],
        }
      )
    : { total: 0, hasAdvantage: false, hasDisadvantage: false }

  // Include additional modifier from form
  const baseModifier = modifierCalc.total
  const modifier = baseModifier + (additionalModifier || 0)
  const totalResult = rollValue + modifier

  // Build modifier breakdown for display
  const modifierBreakdown: Array<{ label: string; value: number }> = []
  if (abilityName || baseModifier !== 0) {
    modifierBreakdown.push({ label: abilityName || 'Base', value: baseModifier })
  }
  if (additionalModifier !== null && additionalModifier !== undefined) {
    modifierBreakdown.push({ label: 'Additional Modifier', value: additionalModifier })
  }

  // Merge calculated advantage/disadvantage with manual overrides
  const hasAdvantage = manualAdvantage || modifierCalc.hasAdvantage
  const hasDisadvantage = manualDisadvantage || modifierCalc.hasDisadvantage

  // Determine outcome
  let outcome: 'success' | 'failed' | 'critical_success' | 'critical_failure' | null = null
  if (rollValue === 20) {
    outcome = 'critical_success'
  } else if (rollValue === 1) {
    outcome = 'critical_failure'
  } else if (dc !== null && dc !== undefined) {
    outcome = totalResult >= dc ? 'success' : 'failed'
  } else {
    outcome = 'success'
  }

  // Calculate final XP
  let finalXP = 0
  if (outcome === 'success' || outcome === 'critical_success') {
    if (outcome === 'critical_success' && xpGained) {
      finalXP = xpGained * 2
    } else if (xpGained) {
      finalXP = xpGained
    }
  }

  // Create action log entry
  const { data: actionLog, error: logError } = await supabase
    .from('action_log')
    .insert([{
      character_id: characterId,
      action_date: getTodayLocalDate(),
      action_time: new Date().toISOString(),
      action_type: 'saving_throw',
      roll_type: 'saving_throw',
      ability_used: abilityName,
      roll_value: rollValue,
      modifier_value: modifier,
      modifier_breakdown: modifierBreakdown.length > 0 ? modifierBreakdown : null,
      total_value: totalResult,
      difficulty_class: dc,
      had_advantage: hasAdvantage,
      had_disadvantage: hasDisadvantage,
      success: outcome === 'success' || outcome === 'critical_success',
      xp_awarded: finalXP > 0 ? finalXP : null,
      notes: description,
    }])
    .select()
    .single()

  if (logError) {
    return { data: null, error: logError }
  }

  // Award XP
  if (finalXP > 0) {
    const { data: character } = await supabase
      .from('characters')
      .select('current_xp')
      .eq('id', characterId)
      .single()

    if (character) {
      await supabase
        .from('characters')
        .update({ current_xp: character.current_xp + finalXP })
        .eq('id', characterId)
    }
  }

  // Increment ability usage
  if (ability) {
    await supabase
      .from('abilities')
      .update({
        times_used_this_level: ability.times_used_this_level + 1,
        total_times_used: ability.total_times_used + 1,
      })
      .eq('id', ability.id)
  }

  return {
    data: {
      ...actionLog,
      outcome,
      finalXP,
    },
    error: null,
  }
}

// ============================================================================
// CUSTOM EFFECT
// ============================================================================

export async function createCustomEffect(params: {
  characterId: string
  effectName: string
  effectType: 'stat_modifier' | 'advantage' | 'disadvantage' | 'custom'
  statModifiers?: { stat: string; modifier: number }[] | null
  affectedStats?: string[] | null
  modifier?: number | null
  description?: string | null
}) {
  const {
    characterId,
    effectName,
    effectType,
    statModifiers,
    affectedStats,
    modifier,
    description,
  } = params

  // Calculate expires_at (midnight tonight in local timezone)
  const today = new Date()
  const midnight = new Date(today)
  midnight.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('custom_effects')
    .insert([{
      character_id: characterId,
      effect_name: effectName,
      effect_type: effectType,
      stat_modifiers: statModifiers,
      affected_stats: affectedStats,
      modifier,
      description,
      expires_at: midnight.toISOString(),
    }])
    .select()
    .single()

  return { data, error }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getActiveCustomEffects(characterId: string) {
  const { data, error } = await supabase
    .from('custom_effects')
    .select('*')
    .eq('character_id', characterId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function deleteCustomEffect(effectId: string) {
  const { error } = await supabase
    .from('custom_effects')
    .delete()
    .eq('id', effectId)

  return { error }
}

export async function cleanupExpiredEffects(characterId: string) {
  const { error } = await supabase
    .from('custom_effects')
    .delete()
    .eq('character_id', characterId)
    .lt('expires_at', new Date().toISOString())

  return { error }
}
