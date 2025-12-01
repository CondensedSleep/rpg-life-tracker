import type {
  Ability,
  CoreStat,
  CoreStatName,
  CalculatedModifier,
  ModifierBreakdown,
  Trait,
  InventoryItem,
  DayState,
} from '@/types'

// ============================================================================
// XP and Leveling Calculations
// ============================================================================

/**
 * Calculate the total XP required to reach the next level
 * Formula:
 * - Level 1 → 2: 10 XP
 * - Level 2 → 3: 10 + (5 * 2) = 20 XP
 * - Level 3 → 4: 20 + (5 * 3) = 35 XP
 * - Level 4 → 5: 35 + (5 * 4) = 55 XP
 */
export function calculateXPToNextLevel(currentLevel: number): number {
  if (currentLevel === 1) return 10

  let totalXP = 10 // Base XP for level 2
  for (let level = 2; level <= currentLevel; level++) {
    totalXP += 5 * level
  }
  return totalXP
}

// ============================================================================
// Core Stat Calculations
// ============================================================================

/**
 * Calculate a core stat's current value based on ability deltas
 * Core stat value = base_value + SUM(ability delta from initial)
 */
export function calculateCoreStat(
  baseValue: number,
  abilities: Array<{ initial: number; current: number }>
): number {
  const totalDelta = abilities.reduce((sum, ability) => {
    return sum + (ability.current - ability.initial)
  }, 0)

  return baseValue + totalDelta
}

/**
 * Calculate D&D-style modifier from stat value
 * Formula: floor((statValue - 10) / 2)
 */
export function calculateModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2)
}

/**
 * Group abilities by their core stat
 */
export function groupAbilitiesByCoreStat(abilities: Ability[]) {
  return abilities.reduce(
    (acc, ability) => {
      if (!acc[ability.core_stat]) {
        acc[ability.core_stat] = []
      }
      acc[ability.core_stat].push(ability)
      return acc
    },
    {} as Record<CoreStatName, Ability[]>
  )
}

/**
 * Recalculate all core stats based on current abilities
 */
export function recalculateCoreStats(
  coreStats: Record<CoreStatName, CoreStat>,
  abilities: Ability[]
): Record<CoreStatName, CoreStat> {
  const groupedAbilities = groupAbilitiesByCoreStat(abilities)

  const updatedStats = { ...coreStats }

  for (const statName of Object.keys(coreStats) as CoreStatName[]) {
    const stat = coreStats[statName]
    const statAbilities = groupedAbilities[statName] || []

    const newValue = calculateCoreStat(
      stat.base_value,
      statAbilities.map((a) => ({
        initial: a.initial_value,
        current: a.current_value,
      }))
    )

    updatedStats[statName] = {
      ...stat,
      current_value: newValue,
      modifier: calculateModifier(newValue),
    }
  }

  return updatedStats
}

// ============================================================================
// Hit Dice Calculations
// ============================================================================

/**
 * Calculate maximum hit dice based on body stat value
 * Formula: ceil(bodyStatValue / 2.5)
 */
export function calculateMaxHitDice(bodyStatValue: number): number {
  return Math.ceil(bodyStatValue / 2.5)
}

/**
 * Determine exhaustion level based on current hit dice and days at zero
 */
export function calculateExhaustionLevel(
  currentHD: number,
  daysAtZero: number
): number {
  if (currentHD > 0) return 0
  if (daysAtZero >= 5) return 3
  if (daysAtZero >= 3) return 2
  if (daysAtZero >= 1) return 1
  return 0
}

// ============================================================================
// Modifier Calculation Engine
// ============================================================================

/**
 * Evaluate a condition string (simplified)
 * Examples: "drive > 0", "nutrition > 0", "always"
 */
function evaluateCondition(
  condition: string,
  abilities: Ability[]
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
 * Calculate total modifier for an ability with all effects applied
 */
export function calculateTotalModifier(
  abilityName: string,
  baseModifier: number,
  abilities: Ability[],
  traits: Trait[],
  inventory: InventoryItem[],
  dayState: {
    state: DayState
    affectedStats?: CoreStatName[]
    selectedStat?: CoreStatName
  }
): CalculatedModifier {
  const breakdown: ModifierBreakdown[] = []
  let total = baseModifier
  let hasAdvantage = false
  let hasDisadvantage = false

  // Start with base ability modifier
  breakdown.push({
    source: `${abilityName} (base)`,
    value: baseModifier,
  })

  // Get the ability to find its core stat
  const ability = abilities.find((a) => a.ability_name === abilityName)
  const coreStat = ability?.core_stat

  // Apply trait modifiers
  for (const trait of traits) {
    if (!trait.is_active || !trait.mechanical_effect) continue

    const effect = trait.mechanical_effect
    const condition = effect.condition || 'always'

    if (!evaluateCondition(condition, abilities)) continue

    // Check if this trait affects this ability
    const affectsAbility =
      effect.stat === abilityName ||
      effect.stats?.includes(abilityName) ||
      (coreStat && (effect.stat === coreStat || effect.stats?.includes(coreStat)))

    if (affectsAbility && effect.modifier) {
      total += effect.modifier
      breakdown.push({
        source: `${trait.trait_name} (${trait.trait_type})`,
        value: effect.modifier,
      })
    }
  }

  // Apply inventory passive effects
  for (const item of inventory) {
    if (!item.is_equipped || !item.passive_effect) continue

    const effect = item.passive_effect
    const condition = effect.condition || 'always'

    if (!evaluateCondition(condition, abilities)) continue

    // Check if this item affects this ability
    const affectsAbility = effect.stat === abilityName || (coreStat && effect.stat === coreStat)

    if (affectsAbility) {
      if (effect.modifier) {
        total += effect.modifier
        breakdown.push({
          source: `${item.item_name} (${item.item_type})`,
          value: effect.modifier,
        })
      }

      if (effect.type === 'advantage') {
        hasAdvantage = true
        breakdown.push({
          source: `${item.item_name} (advantage)`,
          value: 0,
        })
      }

      if (effect.type === 'disadvantage') {
        hasDisadvantage = true
        breakdown.push({
          source: `${item.item_name} (disadvantage)`,
          value: 0,
        })
      }
    }
  }

  // Apply day state effects
  if (dayState.state === 'difficult' && coreStat) {
    if (dayState.affectedStats?.includes(coreStat)) {
      hasDisadvantage = true
      breakdown.push({
        source: 'Difficult Terrain',
        value: 0,
      })
    }
  }

  if (dayState.state === 'inspiration' && coreStat) {
    if (dayState.selectedStat === coreStat) {
      hasAdvantage = true
      breakdown.push({
        source: 'Inspiration Day',
        value: 0,
      })
    }
  }

  return {
    total,
    breakdown,
    hasAdvantage,
    hasDisadvantage,
  }
}

/**
 * Determine day state from daily roll value
 */
export function determineDayState(rollValue: number): DayState {
  if (rollValue === 20) return 'critical'
  if (rollValue >= 16) return 'inspiration'
  if (rollValue <= 5) return 'difficult'
  return 'normal'
}

/**
 * Calculate XP multiplier based on day state
 */
export function getXPMultiplier(dayState: DayState): number {
  return dayState === 'critical' ? 2 : 1
}
