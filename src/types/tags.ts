// ============================================================================
// Roll Tag System Types
// ============================================================================
// Unified tagging system for roll context, modifiers, and organization

/**
 * Roll type tags (mutually exclusive)
 */
export const RollTypeTag = {
  ABILITY_CHECK: 'ability_check',
  SAVING_THROW: 'saving_throw',
  ATTACK: 'attack',
  DAMAGE: 'damage',
  INITIATIVE: 'initiative',
} as const

export type RollTypeTag = typeof RollTypeTag[keyof typeof RollTypeTag]

/**
 * Modifier type tags
 */
export const ModifierTag = {
  ADVANTAGE: 'advantage',
  DISADVANTAGE: 'disadvantage',
  FLAT: 'flat', // Advantage + Disadvantage cancel out
  CRITICAL_SUCCESS: 'critical_success',
  CRITICAL_FAILURE: 'critical_failure',
} as const

export type ModifierTag = typeof ModifierTag[keyof typeof ModifierTag]

/**
 * Dice type tags
 */
export const DiceTag = {
  D4: 'd4',
  D6: 'd6',
  D8: 'd8',
  D10: 'd10',
  D12: 'd12',
  D20: 'd20',
  D100: 'd100',
} as const

export type DiceTag = typeof DiceTag[keyof typeof DiceTag]

/**
 * Individual die with its rolled value
 */
export interface DieRoll {
  die: DiceTag
  value: number
}

/**
 * Trait tag
 */
export interface TraitTag {
  id: string
  name: string
  isUserAdded: boolean // false if auto-detected
}

/**
 * Item tag
 */
export interface ItemTag {
  id: string
  name: string
  isUserAdded: boolean
}

/**
 * Custom effect tag
 */
export interface EffectTag {
  id: string
  name: string
  isUserAdded: boolean
}

/**
 * Custom modifier tag (e.g., +2, -1, +d4)
 */
export interface CustomModifierTag {
  label: string
  value: number | string // number for flat (+2), string for dice (+d4)
  isUserAdded?: boolean // Track if user manually added or system auto-added
}

/**
 * Organizational tags (user-defined context)
 */
export interface OrganizationalTag {
  category: string // "Quest", "Location", "NPC", etc.
  value: string
}

/**
 * Complete tag structure for a roll
 */
export interface RollTags {
  // Core roll context (mutually exclusive)
  rollType?: RollTypeTag
  ability?: string // ability name
  coreStat?: string // core stat name

  // Dice rolled
  dice: DieRoll[] // e.g., [{ die: 'd20', value: 15 }, { die: 'd4', value: 3 }]

  // Modifiers
  modifiers: ModifierTag[] // ['advantage', 'critical_success']
  customModifiers: CustomModifierTag[] // [{ label: 'Blessed', value: '+d4' }]

  // Effects (traits, items, custom effects)
  traits: TraitTag[]
  items: ItemTag[]
  effects: EffectTag[]

  // User-defined organizational tags
  organizational: OrganizationalTag[]

  // DC if applicable
  dc?: number
}

/**
 * Display labels for tag values
 */
export const TAG_DISPLAY_LABELS: Record<string, string> = {
  // Roll types
  ability_check: 'Ability Check',
  saving_throw: 'Saving Throw',
  attack: 'Attack',
  damage: 'Damage',
  initiative: 'Initiative',

  // Modifiers
  advantage: 'Advantage',
  disadvantage: 'Disadvantage',
  flat: 'Flat',
  critical_success: 'Critical Success',
  critical_failure: 'Critical Failure',

  // Dice
  d4: 'd4',
  d6: 'd6',
  d8: 'd8',
  d10: 'd10',
  d12: 'd12',
  d20: 'd20',
  d100: 'd100',

  // Core stats
  body: 'Body',
  mind: 'Mind',
  heart: 'Heart',
  soul: 'Soul',
}

/**
 * Convert storage key to display label
 */
export function getDisplayLabel(key: string): string {
  return TAG_DISPLAY_LABELS[key] || key
}

/**
 * Convert display label to storage key
 */
export function getStorageKey(label: string): string {
  const entry = Object.entries(TAG_DISPLAY_LABELS).find(
    ([_, displayLabel]) => displayLabel === label
  )
  return entry ? entry[0] : label.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Tag category for UI organization
 */
export const TagCategory = {
  ROLL_TYPE: 'roll_type',
  ABILITY: 'ability',
  CORE_STAT: 'core_stat',
  DICE: 'dice',
  MODIFIERS: 'modifiers',
  TRAITS: 'traits',
  ITEMS: 'items',
  EFFECTS: 'effects',
  CUSTOM_MODIFIERS: 'custom_modifiers',
  ORGANIZATIONAL: 'organizational',
} as const

export type TagCategory = typeof TagCategory[keyof typeof TagCategory]

/**
 * Check if a tag category is mutually exclusive
 */
export function isMutuallyExclusive(category: TagCategory): boolean {
  return [
    TagCategory.ROLL_TYPE,
    TagCategory.ABILITY,
    TagCategory.CORE_STAT,
  ].includes(category as typeof TagCategory.ROLL_TYPE | typeof TagCategory.ABILITY | typeof TagCategory.CORE_STAT)
}

/**
 * Get the total rolled value from dice
 */
export function getTotalDiceValue(dice: DieRoll[]): number {
  return dice.reduce((sum, die) => sum + die.value, 0)
}

/**
 * Get the d20 value (for crit detection)
 */
export function getD20Value(dice: DieRoll[]): number | undefined {
  return dice.find(d => d.die === DiceTag.D20)?.value
}

/**
 * Check if roll should be tagged as critical success
 */
export function isCriticalSuccess(dice: DieRoll[]): boolean {
  const d20Value = getD20Value(dice)
  return d20Value === 20
}

/**
 * Check if roll should be tagged as critical failure
 */
export function isCriticalFailure(dice: DieRoll[]): boolean {
  const d20Value = getD20Value(dice)
  return d20Value === 1
}
