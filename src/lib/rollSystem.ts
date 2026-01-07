// ============================================================================
// Unified Roll System
// ============================================================================
// Single implementation for all roll types (ability checks, saving throws, attacks, damage)
// Eliminates 369+ lines of duplicate code from logAbilityCheck and logSavingThrow

import { supabase } from './supabase'
import type { Ability, DayState } from '@/types'
import type {
  RollParams,
  RollResult,
  ActionLogEntry,
} from '@/types/rolls'
import { RollType, RollOutcome } from '@/types/rolls'
import type { EffectCollectionState, Effect } from '@/types/effects'
import { EffectContext } from '@/types/effects'
import { collectEffects, filterEffects, applyEffects } from './effectSystem'
import { determineOutcome, calculateXP, getXPMultiplier } from './strategies'
import { getTodayLocalDate } from './dateUtils'

/**
 * Fetch all character state needed for roll calculation
 * Single database query point to reduce duplication
 */
async function fetchCharacterState(characterId: string): Promise<{
  abilities: Ability[]
  traits: EffectCollectionState['traits']
  inventory: EffectCollectionState['inventory']
  customEffects: EffectCollectionState['customEffects']
  dayState: EffectCollectionState['dayState']
  dayStateValue: DayState
}> {
  // Fetch abilities
  const { data: abilities, error: abilitiesError } = await supabase
    .from('abilities')
    .select('*')
    .eq('character_id', characterId)

  if (abilitiesError) throw abilitiesError
  if (!abilities) throw new Error('No abilities found for character')

  // Fetch traits
  const { data: traits, error: traitsError } = await supabase
    .from('traits')
    .select('*')
    .eq('character_id', characterId)

  if (traitsError) throw traitsError

  // Fetch inventory
  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)

  if (inventoryError) throw inventoryError

  // Fetch custom effects (only active ones)
  const { data: customEffects, error: customEffectsError } = await supabase
    .from('custom_effects')
    .select('*')
    .eq('character_id', characterId)
    .gt('expires_at', new Date().toISOString())

  if (customEffectsError) throw customEffectsError

  // Fetch daily roll for day state
  const { data: dailyRoll, error: dailyRollError } = await supabase
    .from('daily_rolls')
    .select('*')
    .eq('character_id', characterId)
    .eq('roll_date', getTodayLocalDate())
    .single()

  if (dailyRollError && dailyRollError.code !== 'PGRST116') {
    throw dailyRollError
  }

  const dayState: DayState = dailyRoll?.day_state || 'normal'
  const affectedStat = dailyRoll?.affected_stat

  return {
    abilities: abilities as Ability[],
    traits: (traits || []).map(t => ({
      ...t,
      trait_type: t.trait_type || '',
      mechanical_effect: t.mechanical_effect || undefined,
    })),
    inventory: (inventory || []).map(i => ({
      ...i,
      passive_effect: i.passive_effect || undefined,
    })),
    customEffects: (customEffects || []).map(ce => ({
      ...ce,
      applies_to: ce.applies_to || undefined,
      affected_stats: ce.affected_stats || undefined,
      stat_modifiers: ce.stat_modifiers || undefined,
      effects: ce.effects || undefined,
    })),
    dayState: {
      state: dayState as string,
      affected_stat: affectedStat,
    },
    dayStateValue: dayState,
  }
}

/**
 * Map RollType to EffectContext
 */
function getRollContext(rollType: RollType): EffectContext {
  const contextMap: Record<RollType, EffectContext> = {
    [RollType.ABILITY_CHECK]: EffectContext.ABILITY_CHECKS,
    [RollType.SAVING_THROW]: EffectContext.SAVING_THROWS,
    [RollType.ATTACK]: EffectContext.ATTACK_ROLLS,
    [RollType.DAMAGE]: EffectContext.DAMAGE_ROLLS,
    [RollType.INITIATIVE]: EffectContext.ABILITY_CHECKS, // Initiative uses ability checks
  }
  return contextMap[rollType]
}

/**
 * Map RollType to action type for database
 */
function getActionType(rollType: RollType): string {
  const actionTypeMap: Record<RollType, string> = {
    [RollType.ABILITY_CHECK]: 'skill_check',
    [RollType.SAVING_THROW]: 'saving_throw',
    [RollType.ATTACK]: 'attack',
    [RollType.DAMAGE]: 'damage',
    [RollType.INITIATIVE]: 'skill_check',
  }
  return actionTypeMap[rollType]
}

/**
 * Execute a roll of any type
 * This is the SINGLE FUNCTION that calculates roll outcomes
 */
export async function executeRoll(params: RollParams): Promise<RollResult> {
  // 1. Fetch character state
  const state = await fetchCharacterState(params.characterId)

  // 2. Collect all effects
  const allEffects = collectEffects(state)

  // 3. Get context for this roll type
  const context = getRollContext(params.type)

  // 4. Find the ability being used (if applicable)
  const ability = params.abilityName
    ? state.abilities.find((a) => a.ability_name === params.abilityName)
    : null

  const baseModifier = ability?.base_value || 0

  // 5. Filter and apply effects for this ability and context
  let appliedEffects
  let relevantEffects: Effect[] = []
  if (params.abilityName) {
    relevantEffects = filterEffects(allEffects, params.abilityName, context, state.abilities)
    console.log('🔍 Effect filtering:', {
      totalCollected: allEffects.length,
      afterFilter: relevantEffects.length,
      abilityName: params.abilityName,
      context,
    })
    console.log('Relevant effects:', relevantEffects.map(e => ({
      source: e.source,
      type: e.type,
      statModifiers: e.statModifiers,
      affectedStats: e.affectedStats,
    })))
    appliedEffects = applyEffects(relevantEffects, baseModifier, params.abilityName)
    console.log('Applied effects result:', appliedEffects)
  } else {
    // No ability specified - no modifiers
    appliedEffects = {
      totalModifier: 0,
      breakdown: [],
      hasAdvantage: false,
      hasDisadvantage: false,
      advantageSources: [],
      disadvantageSources: [],
      activeEffects: [],
    }
  }

  // 6. Apply additional modifier from params
  const additionalModifier = params.additionalModifier || 0
  const totalModifier = appliedEffects.totalModifier + additionalModifier

  if (additionalModifier !== 0) {
    appliedEffects.breakdown.push({
      source: 'Additional modifier',
      value: additionalModifier,
    })
  }

  // 7. Calculate total value
  const totalValue = params.d20Value + totalModifier

  // 8. Merge manual advantage/disadvantage with calculated
  const hasAdvantage = params.manualAdvantage || appliedEffects.hasAdvantage
  const hasDisadvantage = params.manualDisadvantage || appliedEffects.hasDisadvantage

  if (params.manualAdvantage && !appliedEffects.hasAdvantage) {
    appliedEffects.advantageSources.push('Manual override')
  }
  if (params.manualDisadvantage && !appliedEffects.hasDisadvantage) {
    appliedEffects.disadvantageSources.push('Manual override')
  }

  // 9. Determine outcome
  const outcome = determineOutcome(params.d20Value, totalValue, params.dc)
  const success = outcome === RollOutcome.CRITICAL_SUCCESS || outcome === RollOutcome.SUCCESS

  // 10. Calculate XP
  const dayStateMultiplier = getXPMultiplier(state.dayStateValue)
  const xpAwarded = calculateXP(params.baseXP || 0, outcome, dayStateMultiplier)

  // 11. Build result
  return {
    rollType: params.type,
    d20Value: params.d20Value,
    abilityUsed: params.abilityName,
    baseModifier,
    additionalModifier,
    totalModifier,
    modifierBreakdown: appliedEffects.breakdown,
    totalValue,
    hasAdvantage,
    hasDisadvantage,
    advantageSources: appliedEffects.advantageSources,
    disadvantageSources: appliedEffects.disadvantageSources,
    dc: params.dc,
    outcome,
    success,
    baseXP: params.baseXP || 0,
    xpMultiplier: dayStateMultiplier,
    xpAwarded,
    timestamp: new Date().toISOString(),
    dayState: state.dayState.state,
    activeEffects: relevantEffects,
  }
}

/**
 * Log a roll to the action log and apply consequences
 * This is the SINGLE FUNCTION that persists roll results
 */
export async function logRoll(
  roll: RollResult,
  characterId: string,
  notes?: string
): Promise<ActionLogEntry> {
  const today = getTodayLocalDate()
  const now = new Date().toISOString()

  // 1. Create action log entry
  const actionLogEntry: ActionLogEntry = {
    character_id: characterId,
    action_date: today,
    action_time: now,
    action_type: getActionType(roll.rollType),
    roll_type: getActionType(roll.rollType),
    ability_used: roll.abilityUsed,
    roll_value: roll.d20Value,
    modifier_value: roll.totalModifier,
    modifier_breakdown: roll.modifierBreakdown.map((b) => ({
      label: b.source,
      value: b.value,
    })),
    total_value: roll.totalValue,
    difficulty_class: roll.dc,
    had_advantage: roll.hasAdvantage,
    had_disadvantage: roll.hasDisadvantage,
    success: roll.success,
    xp_awarded: roll.xpAwarded,
    notes: notes,
  }

  const { data: insertedLog, error: logError } = await supabase
    .from('action_log')
    .insert(actionLogEntry)
    .select()
    .single()

  if (logError) throw logError

  // 2. Award XP if any
  if (roll.xpAwarded > 0) {
    const { error: xpError } = await supabase.rpc('award_xp', {
      char_id: characterId,
      xp_amount: roll.xpAwarded,
    })

    if (xpError) throw xpError
  }

  // 3. Increment ability usage if applicable
  if (roll.abilityUsed) {
    // Fetch current values first
    const { data: abilityData } = await supabase
      .from('abilities')
      .select('times_used_this_level, total_times_used')
      .eq('character_id', characterId)
      .eq('ability_name', roll.abilityUsed)
      .single()

    if (abilityData) {
      const { error: abilityError } = await supabase
        .from('abilities')
        .update({
          times_used_this_level: abilityData.times_used_this_level + 1,
          total_times_used: abilityData.total_times_used + 1,
        })
        .eq('character_id', characterId)
        .eq('ability_name', roll.abilityUsed)

      if (abilityError) throw abilityError
    }
  }

  return insertedLog
}

// ============================================================================
// Public API - Convenience Wrappers
// ============================================================================

/**
 * Log an ability check
 * Convenience wrapper that replaces the old 195-line logAbilityCheck function
 */
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
}): Promise<{ data: any; error: any }> {
  try {
    const rollParams: RollParams = {
      characterId: params.characterId,
      type: RollType.ABILITY_CHECK,
      d20Value: params.rollValue,
      abilityName: params.abilityName || undefined,
      dc: params.dc || undefined,
      additionalModifier: params.additionalModifier || undefined,
      manualAdvantage: params.hadAdvantage || undefined,
      manualDisadvantage: params.hadDisadvantage || undefined,
      baseXP: params.xpGained || undefined,
      description: params.description || undefined,
    }

    const result = await executeRoll(rollParams)
    const actionLog = await logRoll(result, params.characterId, params.description || undefined)

    return {
      data: {
        ...actionLog,
        outcome: result.outcome,
        finalXP: result.xpAwarded,
        total_value: result.totalValue,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error logging ability check:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Log a saving throw
 * Convenience wrapper that replaces the old 183-line logSavingThrow function
 */
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
}): Promise<{ data: any; error: any }> {
  try {
    const rollParams: RollParams = {
      characterId: params.characterId,
      type: RollType.SAVING_THROW,
      d20Value: params.rollValue,
      abilityName: params.abilityName || undefined,
      dc: params.dc || undefined,
      additionalModifier: params.additionalModifier || undefined,
      manualAdvantage: params.hadAdvantage || undefined,
      manualDisadvantage: params.hadDisadvantage || undefined,
      baseXP: params.xpGained || undefined,
      description: params.description || undefined,
    }

    const result = await executeRoll(rollParams)
    const actionLog = await logRoll(result, params.characterId, params.description || undefined)

    return {
      data: {
        ...actionLog,
        outcome: result.outcome,
        finalXP: result.xpAwarded,
        total_value: result.totalValue,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error logging saving throw:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

// Future: Adding new roll types is trivial
/**
 * Log an attack roll (future feature)
 */
export async function logAttackRoll(params: {
  characterId: string
  abilityName?: string | null
  rollValue: number
  dc?: number | null
  additionalModifier?: number | null
  description?: string | null
  xpGained?: number | null
}): Promise<ActionLogEntry> {
  const rollParams: RollParams = {
    characterId: params.characterId,
    type: RollType.ATTACK,
    d20Value: params.rollValue,
    abilityName: params.abilityName || undefined,
    dc: params.dc || undefined,
    additionalModifier: params.additionalModifier || undefined,
    baseXP: params.xpGained || undefined,
    description: params.description || undefined,
  }

  const result = await executeRoll(rollParams)
  return logRoll(result, params.characterId, params.description || undefined)
}
