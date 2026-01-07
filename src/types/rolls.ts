// ============================================================================
// Roll System Type Definitions
// ============================================================================
// Unified roll types for ability checks, saving throws, attacks, and damage
// Part of the calculation system refactor to eliminate code duplication

import type { ModifierBreakdown, Effect } from './effects'
import type { RollTags } from './tags'

/**
 * Type of roll being performed
 */
export const RollType = {
  ABILITY_CHECK: 'ability_check',
  SAVING_THROW: 'saving_throw',
  ATTACK: 'attack',
  DAMAGE: 'damage',
  INITIATIVE: 'initiative',
} as const

export type RollType = typeof RollType[keyof typeof RollType]

/**
 * Outcome of a roll
 */
export const RollOutcome = {
  CRITICAL_SUCCESS: 'critical_success',
  SUCCESS: 'success',
  FAILURE: 'failure',
  CRITICAL_FAILURE: 'critical_failure',
} as const

export type RollOutcome = typeof RollOutcome[keyof typeof RollOutcome]

/**
 * Parameters for executing a roll
 */
export interface RollParams {
  characterId: string
  type: RollType
  d20Value: number // Manually entered by user

  // Optional fields
  abilityName?: string
  dc?: number
  additionalModifier?: number
  manualAdvantage?: boolean
  manualDisadvantage?: boolean
  baseXP?: number
  description?: string
  tags?: string[]
}

/**
 * Complete result of a roll with all calculated values
 */
export interface RollResult {
  // Input
  rollType: RollType
  d20Value: number
  abilityUsed?: string

  // Calculated
  baseModifier: number
  additionalModifier: number
  totalModifier: number
  modifierBreakdown: ModifierBreakdown[]
  totalValue: number // d20 + totalModifier

  // Advantage/Disadvantage
  hasAdvantage: boolean
  hasDisadvantage: boolean
  advantageSources: string[]
  disadvantageSources: string[]

  // Outcome
  dc?: number
  outcome: RollOutcome
  success: boolean

  // Rewards
  baseXP: number
  xpMultiplier: number
  xpAwarded: number

  // Context
  timestamp: string
  dayState: string
  activeEffects: Effect[]
}

/**
 * Action log entry format (for database insertion)
 */
export interface ActionLogEntry {
  character_id: string
  action_date: string
  action_time: string
  action_type: string // Maps from RollType
  roll_type: string // Maps from RollType
  ability_used?: string
  roll_value: number
  modifier_value: number
  modifier_breakdown: Array<{ label: string; value: number }>
  total_value: number
  difficulty_class?: number
  had_advantage: boolean
  had_disadvantage: boolean
  success: boolean
  xp_awarded: number
  tags?: RollTags // New: structured tags for the roll
  notes?: string
}
