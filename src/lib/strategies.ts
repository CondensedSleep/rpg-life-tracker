// ============================================================================
// Roll Strategy System
// ============================================================================
// Customizable strategies for outcome determination and XP calculation
// Part of the calculation system refactor

import type { RollOutcome } from '@/types/rolls'
import { RollOutcome as RollOutcomeValues } from '@/types/rolls'
import type { DayState } from '@/types'

/**
 * Strategy for determining roll outcome based on d20 value, total, and DC
 */
export type OutcomeStrategy = (
  d20Value: number,
  total: number,
  dc?: number
) => RollOutcome

/**
 * Default D&D 5e outcome determination
 * - Natural 20 is always a critical success
 * - Natural 1 is always a critical failure
 * - If DC is provided, total >= DC is success
 * - If no DC is provided, always success (passive check)
 */
export const DEFAULT_OUTCOME_STRATEGY: OutcomeStrategy = (d20Value, total, dc) => {
  if (d20Value === 20) return RollOutcomeValues.CRITICAL_SUCCESS
  if (d20Value === 1) return RollOutcomeValues.CRITICAL_FAILURE
  if (dc === undefined || dc === null) return RollOutcomeValues.SUCCESS
  return total >= dc ? RollOutcomeValues.SUCCESS : RollOutcomeValues.FAILURE
}

/**
 * Strategy for calculating XP based on outcome and multipliers
 */
export type XPStrategy = (
  baseXP: number,
  outcome: RollOutcome,
  dayStateMultiplier: number
) => number

/**
 * Default XP calculation strategy
 * - Critical success: double base XP
 * - Success: base XP
 * - Failure/Critical failure: 0 XP
 * - Apply day state multiplier (critical day = 2x XP)
 */
export const DEFAULT_XP_STRATEGY: XPStrategy = (baseXP, outcome, dayStateMultiplier) => {
  if (outcome === RollOutcomeValues.FAILURE || outcome === RollOutcomeValues.CRITICAL_FAILURE) {
    return 0
  }

  let xp = baseXP

  if (outcome === RollOutcomeValues.CRITICAL_SUCCESS) {
    xp *= 2
  }

  xp *= dayStateMultiplier

  return Math.floor(xp)
}

/**
 * Get XP multiplier based on day state
 * - Critical: 2x XP
 * - Normal/Difficult/Inspiration: 1x XP
 */
export function getXPMultiplier(dayState: DayState): number {
  return dayState === 'critical' ? 2 : 1
}

/**
 * Determine roll outcome using the default strategy
 */
export function determineOutcome(
  d20Value: number,
  total: number,
  dc?: number,
  strategy: OutcomeStrategy = DEFAULT_OUTCOME_STRATEGY
): RollOutcome {
  return strategy(d20Value, total, dc)
}

/**
 * Calculate XP using the default strategy
 */
export function calculateXP(
  baseXP: number,
  outcome: RollOutcome,
  dayStateMultiplier: number,
  strategy: XPStrategy = DEFAULT_XP_STRATEGY
): number {
  return strategy(baseXP, outcome, dayStateMultiplier)
}

/**
 * Registry of XP strategies for future extensibility
 * Users can define custom strategies for different play styles
 */
export const XP_STRATEGIES = {
  default: DEFAULT_XP_STRATEGY,

  /**
   * Always award XP strategy - even on failures
   * Good for encouraging experimentation and risk-taking
   */
  always_award: (baseXP: number, outcome: RollOutcome, dayStateMultiplier: number) => {
    let xp = baseXP

    if (outcome === RollOutcomeValues.CRITICAL_SUCCESS) {
      xp *= 2
    } else if (outcome === RollOutcomeValues.SUCCESS) {
      xp *= 1
    } else if (outcome === RollOutcomeValues.FAILURE) {
      xp *= 0.5 // Half XP on failure
    } else if (outcome === RollOutcomeValues.CRITICAL_FAILURE) {
      xp *= 0.25 // Quarter XP on critical failure
    }

    xp *= dayStateMultiplier
    return Math.floor(xp)
  },

  /**
   * High risk/high reward strategy
   * More XP for success, less for failure
   */
  high_risk: (baseXP: number, outcome: RollOutcome, dayStateMultiplier: number) => {
    if (outcome === RollOutcomeValues.CRITICAL_SUCCESS) {
      return Math.floor(baseXP * 3 * dayStateMultiplier)
    }
    if (outcome === RollOutcomeValues.SUCCESS) {
      return Math.floor(baseXP * 1.5 * dayStateMultiplier)
    }
    return 0
  },
}
