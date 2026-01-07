// ============================================================================
// Unified Effect System
// ============================================================================
// Single source of truth for all effects from traits, items, custom effects, and day state
// Part of the calculation system refactor to eliminate code duplication

import type {
  Effect,
  EffectSourceType,
  ModifierBreakdown,
  AppliedEffect,
  EffectCollectionState,
} from '@/types/effects'
import { EffectContext, EffectType } from '@/types/effects'
import type { ContextNode } from '@/types/contextExpressions'
import { matchesContext } from '@/types/contextExpressions'
import { supabase } from './supabase'

/**
 * Evaluate a condition string (simplified)
 * Examples: "drive > 0", "nutrition > 0", "always"
 */
export function evaluateCondition(
  condition: string,
  abilities: Array<{ ability_name: string; current_value: number }>
): boolean {
  if (condition === 'always') return true

  // Parse simple conditions like "drive > 0"
  const match = condition.match(/(\w+)\s*([><=!]+)\s*(-?\d+)/)
  if (!match) return false

  const [, abilityName, operator, valueStr] = match
  const targetValue = parseInt(valueStr, 10)

  const ability = abilities.find((a) => a.ability_name.toLowerCase() === abilityName.toLowerCase())
  if (!ability) return false

  const currentValue = ability.current_value

  switch (operator) {
    case '>':
      return currentValue > targetValue
    case '>=':
      return currentValue >= targetValue
    case '<':
      return currentValue < targetValue
    case '<=':
      return currentValue <= targetValue
    case '==':
    case '=':
      return currentValue === targetValue
    case '!=':
      return currentValue !== targetValue
    default:
      return false
  }
}

/**
 * Convert a trait's mechanical effects to unified Effect objects
 */
function convertTraitToEffects(trait: EffectCollectionState['traits'][0]): Effect[] {
  if (!trait.mechanical_effect || trait.mechanical_effect.length === 0) {
    return []
  }

  return trait.mechanical_effect.map((effect, index) => {
    const effectType = effect.type as keyof typeof EffectType
    return {
      id: `${trait.id}-${index}`,
      source: `${trait.trait_name} (${trait.trait_type})`,
      sourceType: 'trait' as EffectSourceType,
      type: EffectType[effectType] || EffectType.CUSTOM,
      appliesTo: (effect.applies_to || []).map((ctx) => {
        const contextKey = ctx.toUpperCase().replace(/_/g, '_') as keyof typeof EffectContext
        return EffectContext[contextKey] || ctx
      }) as EffectContext[],
      condition: effect.condition,
      isActive: trait.is_active,
      statModifiers: effect.stat_modifiers,
      affectedStats: effect.affected_stats,
      flatModifier: effect.modifier,
    }
  })
}

/**
 * Convert an inventory item's passive effects to unified Effect objects
 */
function convertItemToEffects(item: EffectCollectionState['inventory'][0]): Effect[] {
  if (!item.is_equipped || !item.passive_effect || item.passive_effect.length === 0) {
    return []
  }

  return item.passive_effect.map((effect, index) => {
    const effectType = effect.type as keyof typeof EffectType
    return {
      id: `${item.id}-${index}`,
      source: item.item_name,
      sourceType: 'item' as EffectSourceType,
      type: EffectType[effectType] || EffectType.CUSTOM,
      appliesTo: (effect.applies_to || []).map((ctx) => {
        const contextKey = ctx.toUpperCase().replace(/_/g, '_') as keyof typeof EffectContext
        return EffectContext[contextKey] || ctx
      }) as EffectContext[],
      condition: effect.condition,
      isActive: true, // Items are always active when equipped
      statModifiers: effect.stat_modifiers,
      affectedStats: effect.affected_stats,
      flatModifier: effect.modifier,
    }
  })
}

/**
 * Convert a custom effect to a unified Effect object
 */
function convertCustomEffectToEffect(customEffect: EffectCollectionState['customEffects'][0]): Effect[] {
  const effects: Effect[] = []

  // Handle custom effects with 'effects' array (multiple sub-effects)
  if (customEffect.effect_type === 'custom' && customEffect.effects) {
    customEffect.effects.forEach((subEffect, index) => {
      const effectType = subEffect.type as keyof typeof EffectType
      effects.push({
        id: `${customEffect.id}-${index}`,
        source: `${customEffect.effect_name} (custom)`,
        sourceType: 'custom' as EffectSourceType,
        type: EffectType[effectType] || EffectType.CUSTOM,
        appliesTo: (subEffect.applies_to || []).map((ctx) => {
          const contextKey = ctx.toUpperCase().replace(/_/g, '_') as keyof typeof EffectContext
          return EffectContext[contextKey] || ctx
        }) as EffectContext[],
        condition: undefined, // Custom effects don't have conditions
        isActive: true,
        statModifiers: subEffect.stat_modifiers,
        affectedStats: subEffect.affected_stats,
        flatModifier: subEffect.modifier,
      })
    })
  } else {
    // Handle simple custom effects
    const effectType = customEffect.effect_type as keyof typeof EffectType
    effects.push({
      id: customEffect.id,
      source: `${customEffect.effect_name} (custom)`,
      sourceType: 'custom' as EffectSourceType,
      type: EffectType[effectType] || EffectType.CUSTOM,
      appliesTo: (customEffect.applies_to || []).map((ctx) => {
        const contextKey = ctx.toUpperCase().replace(/_/g, '_') as keyof typeof EffectContext
        return EffectContext[contextKey] || ctx
      }) as EffectContext[],
      condition: undefined,
      isActive: true,
      statModifiers: customEffect.stat_modifiers,
      affectedStats: customEffect.affected_stats,
      flatModifier: customEffect.modifier,
    })
  }

  return effects
}

/**
 * Convert day state to a unified Effect object
 */
function convertDayStateToEffect(dayState: EffectCollectionState['dayState']): Effect | null {
  if (dayState.state === 'normal') {
    return null
  }

  if (dayState.state === 'difficult' && dayState.affected_stat) {
    return {
      id: 'day-state-difficult',
      source: 'Difficult Terrain (day state)',
      sourceType: 'day_state' as EffectSourceType,
      type: EffectType.DISADVANTAGE,
      appliesTo: [EffectContext.ABILITY_CHECKS, EffectContext.SAVING_THROWS],
      condition: undefined,
      isActive: true,
      statModifiers: undefined,
      affectedStats: [dayState.affected_stat],
      flatModifier: 0,
    }
  }

  if (dayState.state === 'inspiration' && dayState.affected_stat) {
    return {
      id: 'day-state-inspiration',
      source: 'Inspiration (day state)',
      sourceType: 'day_state' as EffectSourceType,
      type: EffectType.ADVANTAGE,
      appliesTo: [EffectContext.ABILITY_CHECKS, EffectContext.SAVING_THROWS],
      condition: undefined,
      isActive: true,
      statModifiers: undefined,
      affectedStats: [dayState.affected_stat],
      flatModifier: 0,
    }
  }

  // 'critical' doesn't add effects, just XP multiplier (handled in roll system)
  return null
}

/**
 * Collect all effects from all sources
 * This is the SINGLE PLACE where effects are gathered
 */
export function collectEffects(state: EffectCollectionState): Effect[] {
  const effects: Effect[] = []

  // Collect from traits
  for (const trait of state.traits) {
    effects.push(...convertTraitToEffects(trait))
  }

  // Collect from inventory
  for (const item of state.inventory) {
    effects.push(...convertItemToEffects(item))
  }

  // Collect from custom effects
  for (const customEffect of state.customEffects) {
    effects.push(...convertCustomEffectToEffect(customEffect))
  }

  // Collect from day state
  const dayStateEffect = convertDayStateToEffect(state.dayState)
  if (dayStateEffect) {
    effects.push(dayStateEffect)
  }

  return effects
}

/**
 * Collect effects from unified effects table
 * NEW: Queries the unified effects system instead of separate tables
 */
export async function collectUnifiedEffects(
  characterId: string,
  currentRollTags?: {
    rollType?: string
    ability?: string
    coreStat?: string
    organizational?: { category: string; value: string }[]
  }
): Promise<Effect[]> {
  const { data: effectsData, error } = await supabase
    .from('effects')
    .select('*')
    .eq('character_id', characterId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching unified effects:', error)
    return []
  }

  if (!effectsData || effectsData.length === 0) {
    return []
  }

  const effects: Effect[] = []

  for (const dbEffect of effectsData) {
    // Check if context expression matches current roll tags (for active modifiers)
    const contextMatches = currentRollTags 
      ? matchesContext(dbEffect.context_expression, currentRollTags)
      : true // No tags provided = collect all effects

    // Convert active modifiers to Effect objects
    if (dbEffect.active_modifiers && dbEffect.active_modifiers.length > 0) {
      for (const activeMod of dbEffect.active_modifiers) {
        if (activeMod.type === 'advantage') {
          effects.push({
            id: `${dbEffect.id}-active-adv`,
            source: dbEffect.name,
            sourceType: dbEffect.effect_type as EffectSourceType,
            type: EffectType.ADVANTAGE,
            appliesTo: [], // Will be filtered by context expression
            condition: dbEffect.condition || undefined,
            isActive: contextMatches,
            statModifiers: undefined,
            affectedStats: [], // Applies to any ability in matching context
            flatModifier: activeMod.value || 0,
            contextExpression: dbEffect.context_expression
          })
        } else if (activeMod.type === 'disadvantage') {
          effects.push({
            id: `${dbEffect.id}-active-dis`,
            source: dbEffect.name,
            sourceType: dbEffect.effect_type as EffectSourceType,
            type: EffectType.DISADVANTAGE,
            appliesTo: [],
            condition: dbEffect.condition || undefined,
            isActive: contextMatches,
            statModifiers: undefined,
            affectedStats: [],
            flatModifier: activeMod.value || 0,
            contextExpression: dbEffect.context_expression
          })
        } else if (activeMod.type === 'bonus') {
          effects.push({
            id: `${dbEffect.id}-active-bonus`,
            source: dbEffect.name,
            sourceType: dbEffect.effect_type as EffectSourceType,
            type: EffectType.STAT_MODIFIER,
            appliesTo: [],
            condition: dbEffect.condition || undefined,
            isActive: contextMatches,
            statModifiers: undefined,
            affectedStats: [],
            flatModifier: activeMod.value || 0,
            contextExpression: dbEffect.context_expression
          })
        }
      }
    }

    // Passive modifiers are handled separately by abilityCalculations.ts
    // They don't participate in roll calculations, only in ability.current_value updates
  }

  return effects
}

/**
 * Filter effects by context and ability, then evaluate conditions
 * Returns only active effects that apply to the given context and ability
 */
export function filterEffects(
  effects: Effect[],
  abilityName: string,
  context: EffectContext,
  abilities: Array<{ ability_name: string; current_value: number; base_value: number }>
): Effect[] {
  return effects
    .filter((effect) => {
      // Must be active (condition already evaluated or no condition)
      if (!effect.isActive) {
        return false
      }

      // Re-evaluate condition if it exists (for items and custom effects)
      if (effect.condition && effect.sourceType !== 'trait') {
        const isConditionMet = evaluateCondition(effect.condition, abilities)
        if (!isConditionMet) {
          return false
        }
      }

      // Must apply to this context (empty appliesTo means applies to all)
      if (effect.appliesTo.length > 0 && !effect.appliesTo.includes(context)) {
        return false
      }

      // For STAT_MODIFIER type, check if any stat modifier targets this ability
      if (effect.type === EffectType.STAT_MODIFIER && effect.statModifiers) {
        const hasMatchingStat = effect.statModifiers.some(
          (sm) => sm.stat === abilityName
        )
        if (!hasMatchingStat) {
          return false
        }
      }

      // For ADVANTAGE/DISADVANTAGE, check affected stats
      if (
        (effect.type === EffectType.ADVANTAGE || effect.type === EffectType.DISADVANTAGE) &&
        effect.affectedStats &&
        effect.affectedStats.length > 0
      ) {
        if (!effect.affectedStats.includes(abilityName)) {
          return false
        }
      }

      return true
    })
}

/**
 * Apply effects to calculate final modifier
 * This is the SINGLE PLACE where modifiers are calculated from effects
 */
export function applyEffects(
  effects: Effect[],
  baseModifier: number,
  abilityName: string
): AppliedEffect {
  let totalModifier = baseModifier
  const breakdown: ModifierBreakdown[] = [
    { source: `${abilityName} (base)`, value: baseModifier }
  ]
  let hasAdvantage = false
  let hasDisadvantage = false
  const advantageSources: string[] = []
  const disadvantageSources: string[] = []

  console.log('📊 applyEffects called with:', {
    effectsCount: effects.length,
    baseModifier,
    abilityName,
  })

  for (const effect of effects) {
    console.log('Processing effect:', {
      source: effect.source,
      type: effect.type,
      statModifiers: effect.statModifiers,
      affectedStats: effect.affectedStats,
      flatModifier: effect.flatModifier,
    })

    if (effect.type === EffectType.STAT_MODIFIER && effect.statModifiers) {
      const mod = effect.statModifiers.find((sm) => sm.stat === abilityName)
      console.log('  STAT_MODIFIER check:', { mod, abilityName })
      if (mod) {
        totalModifier += mod.modifier
        breakdown.push({ source: effect.source, value: mod.modifier })
        console.log('  ✅ Added modifier:', mod.modifier)
      }
    }

    if (effect.type === EffectType.ADVANTAGE) {
      console.log('  ADVANTAGE detected!')
      hasAdvantage = true
      advantageSources.push(effect.source)
      if (effect.flatModifier) {
        totalModifier += effect.flatModifier
        breakdown.push({ source: `${effect.source} (advantage)`, value: effect.flatModifier })
      } else {
        breakdown.push({ source: `${effect.source} (advantage)`, value: 0 })
      }
    }

    if (effect.type === EffectType.DISADVANTAGE) {
      console.log('  DISADVANTAGE detected!')
      hasDisadvantage = true
      disadvantageSources.push(effect.source)
      if (effect.flatModifier) {
        totalModifier += effect.flatModifier
        breakdown.push({ source: `${effect.source} (disadvantage)`, value: effect.flatModifier })
      } else {
        breakdown.push({ source: `${effect.source} (disadvantage)`, value: 0 })
      }
    }

    // Handle CUSTOM effects (for traits/items that don't fit standard types)
    if (effect.type === EffectType.CUSTOM) {
      console.log('  CUSTOM effect detected!')
      console.log('  → affectedStats:', effect.affectedStats)
      console.log('  → abilityName:', abilityName)
      
      // Check if this custom effect applies to the current ability
      let appliesHere = false
      
      // If it has affectedStats, check if current ability is in the list
      if (effect.affectedStats && effect.affectedStats.length > 0) {
        appliesHere = effect.affectedStats.includes(abilityName)
        console.log('  → appliesHere (via affectedStats):', appliesHere)
      } else if (effect.statModifiers && effect.statModifiers.length > 0) {
        // If it has statModifiers, check if current ability is targeted
        appliesHere = effect.statModifiers.some(sm => sm.stat === abilityName)
        console.log('  → appliesHere (via statModifiers):', appliesHere)
      }
      
      if (!appliesHere) {
        console.log('  → Skipping: does not apply to this ability')
        continue
      }
      
      // Grant advantage if affectedStats match
      if (effect.affectedStats && effect.affectedStats.includes(abilityName)) {
        console.log('  → Granting advantage (affectedStats match)')
        hasAdvantage = true
        advantageSources.push(effect.source)
      }
      
      // Add flat modifier if present
      if (effect.flatModifier) {
        console.log('  → Adding flat modifier:', effect.flatModifier)
        totalModifier += effect.flatModifier
        breakdown.push({ source: effect.source, value: effect.flatModifier })
      }
    }
  }

  console.log('📊 applyEffects result:', {
    totalModifier,
    hasAdvantage,
    hasDisadvantage,
    breakdownCount: breakdown.length,
  })

  return {
    totalModifier,
    breakdown,
    hasAdvantage,
    hasDisadvantage,
    advantageSources,
    disadvantageSources,
    activeEffects: effects,
  }
}
