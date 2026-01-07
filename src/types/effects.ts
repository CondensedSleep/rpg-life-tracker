// ============================================================================
// Effect System Type Definitions
// ============================================================================
// Unified effect types for traits, inventory items, custom effects, and day state
// Part of the calculation system refactor to eliminate code duplication

import type { ContextNode } from './contextExpressions'

/**
 * Context in which an effect can apply
 * Determines when an effect's modifiers are active
 */
export const EffectContext = {
  PASSIVE_MODIFIER: 'passive_modifier',
  ABILITY_CHECKS: 'ability_checks',
  SAVING_THROWS: 'saving_throws',
  ATTACK_ROLLS: 'attack_rolls',
  DAMAGE_ROLLS: 'damage_rolls',
} as const

export type EffectContext = typeof EffectContext[keyof typeof EffectContext]

/**
 * Type of effect being applied
 */
export const EffectType = {
  STAT_MODIFIER: 'stat_modifier',
  ADVANTAGE: 'advantage',
  DISADVANTAGE: 'disadvantage',
  CUSTOM: 'custom',
} as const

export type EffectType = typeof EffectType[keyof typeof EffectType]

/**
 * Source type for an effect
 */
export type EffectSourceType = 'trait' | 'item' | 'custom' | 'day_state' | 'blessing' | 'curse'

/**
 * Individual stat modifier
 */
export interface StatModifier {
  stat: string
  modifier: number
}

/**
 * Unified effect representation
 * Normalizes effects from all sources (traits, items, custom effects, day state)
 */
export interface Effect {
  id: string
  source: string // Display name: "ARTIST trait", "MacBook Pro", "Caffeinated (custom)"
  sourceType: EffectSourceType
  type: EffectType
  appliesTo: EffectContext[] // Empty array means applies to all contexts
  condition?: string // e.g., "drive > 0"
  isActive: boolean // Evaluated from condition

  // Type-specific fields
  statModifiers?: StatModifier[] // For STAT_MODIFIER
  affectedStats?: string[] // For ADVANTAGE/DISADVANTAGE
  flatModifier?: number // Flat bonus with advantage/disadvantage
  
  // NEW: Context expression for unified effects
  contextExpression?: ContextNode | null
}

/**
 * Breakdown of where a modifier comes from
 */
export interface ModifierBreakdown {
  source: string
  value: number
}

/**
 * Result of applying effects to a base modifier
 */
export interface AppliedEffect {
  totalModifier: number
  breakdown: ModifierBreakdown[]
  hasAdvantage: boolean
  hasDisadvantage: boolean
  advantageSources: string[]
  disadvantageSources: string[]
  activeEffects: Effect[]
}

/**
 * Character state needed for effect collection
 */
export interface EffectCollectionState {
  traits: Array<{
    id: string
    trait_name: string
    trait_type: string
    is_active: boolean
    mechanical_effect?: Array<{
      type: string
      applies_to?: string[]
      stat_modifiers?: StatModifier[]
      affected_stats?: string[]
      modifier?: number
      condition?: string
    }>
  }>
  inventory: Array<{
    id: string
    item_name: string
    is_equipped: boolean
    passive_effect?: Array<{
      type: string
      applies_to?: string[]
      stat_modifiers?: StatModifier[]
      affected_stats?: string[]
      modifier?: number
      condition?: string
    }>
  }>
  customEffects: Array<{
    id: string
    effect_name: string
    effect_type: string
    applies_to?: string[]
    affected_stats?: string[]
    stat_modifiers?: StatModifier[]
    modifier?: number
    effects?: Array<{
      type: string
      applies_to?: string[]
      stat_modifiers?: StatModifier[]
      affected_stats?: string[]
      modifier?: number
    }>
  }>
  dayState: {
    state: string // 'difficult' | 'normal' | 'inspiration' | 'critical'
    affected_stat?: string
  }
  abilities: Array<{
    ability_name: string
    base_value: number
    current_value: number
  }>
}
