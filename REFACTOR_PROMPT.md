# RPG Life Tracker - Calculation System Refactor Prompt

> **Context**: This is a comprehensive refactor prompt for the RPG Life Tracker's calculation, roll, and effect systems. Feed this to Claude Sonnet 4.5 or another AI assistant to plan and implement a more scalable, maintainable architecture.

---

## 🎯 **Objective**

Refactor the calculation and roll system to eliminate code duplication, improve scalability, and establish a clean architecture that supports unlimited customizability while maintaining D&D 5e authenticity.

---

## 📋 **Current State Analysis**

### Critical Issues to Address

#### 1. **Massive Code Duplication in Roll Logging** (🔴 CRITICAL)

**File**: [src/lib/actionLogService.ts](src/lib/actionLogService.ts)

**Problem**: `logAbilityCheck()` (lines 10-195) and `logSavingThrow()` (lines 201-383) are 173 lines of nearly identical code. In D&D 5e, ability checks and saving throws use the SAME mechanic: d20 + modifier vs DC. The only difference is context.

**Impact**:
- Bugs must be fixed in multiple places
- Features must be implemented multiple times
- Adding new roll types (attack, damage, initiative) requires copy-pasting 200+ lines each time
- Maintenance nightmare

**Current Pattern**:
```typescript
// Nearly identical functions
async function logAbilityCheck(params) {
  // 1. Fetch character data (abilities, traits, inventory, effects, daily roll)
  // 2. Find ability being used
  // 3. Calculate modifier with calculateTotalModifier()
  // 4. Apply additional modifiers
  // 5. Determine advantage/disadvantage
  // 6. Determine outcome (crit/success/fail)
  // 7. Calculate XP
  // 8. Insert action log entry
  // 9. Award XP to character
  // 10. Increment ability usage
}

async function logSavingThrow(params) {
  // EXACT SAME STEPS, only difference is:
  // - action_type: 'saving_throw'
  // - roll_type: 'saving_throw'
  // - context: 'saving_throws' instead of 'ability_checks'
}
```

#### 2. **Repetitive Effect Application Logic** (🟡 MODERATE)

**File**: [src/lib/calculations.ts](src/lib/calculations.ts:214-497)

**Problem**: The `calculateTotalModifier()` function has 280+ lines with the SAME logic repeated for:
1. Traits (lines 244-318)
2. Inventory items (lines 322-397)
3. Custom effects (lines 400-468)

**Pattern Repeated 3 Times**:
```typescript
for (const effect of effects) {
  const condition = effect.condition || 'always'
  if (!evaluateCondition(condition, abilities)) continue

  if (effect.type === 'stat_modifier' && effect.stat_modifiers) {
    for (const statMod of effect.stat_modifiers) {
      if (statMod.stat === abilityName) {
        total += statMod.modifier
        breakdown.push({ source: '...', value: statMod.modifier })
      }
    }
  }

  if (effect.type === 'advantage' && effect.affected_stats?.includes(abilityName)) {
    hasAdvantage = true
    // Complex context checking logic...
    if (shouldApplyModifier) {
      total += modifierValue
      breakdown.push({ source: '...', value: modifierValue })
    }
  }

  if (effect.type === 'disadvantage' && effect.affected_stats?.includes(abilityName)) {
    // Same complex logic again...
  }
}
```

**Why This is Wrong**: In D&D, you don't care WHERE a bonus comes from - a +2 from a magic sword is mechanically identical to a +2 from a spell. Effects should be unified.

#### 3. **No Clear Roll Result Data Structure** (🟡 MODERATE)

**Problem**: Roll data is scattered across:
- Action log entries (database records)
- XP calculation logic (in each log function)
- Outcome determination (inline if/else)
- UI display logic (in components)

**Missing**: A centralized `RollResult` type that captures the complete roll state:
```typescript
{
  d20Value: number
  modifiers: ModifierBreakdown[]
  totalValue: number
  hasAdvantage: boolean
  hasDisadvantage: boolean
  dc: number | null
  outcome: 'critical_success' | 'success' | 'failure' | 'critical_failure'
  xpAwarded: number
  context: EffectContext
}
```

#### 4. **String Literals Everywhere** (🟡 MODERATE)

**Problem**: The context type `'passive_modifier' | 'ability_checks' | 'saving_throws'` appears as string literals in dozens of places without an enum or constant.

**Risk**: Typos will silently break effect application.

---

## 🏗️ **Proposed Architecture**

### Design Principles

1. **DRY (Don't Repeat Yourself)**: One implementation per concept
2. **Single Responsibility**: Each function does ONE thing well
3. **Composition over Duplication**: Build complex behaviors from simple pieces
4. **Type Safety**: Use TypeScript enums/constants, not string literals
5. **Testability**: Pure functions that can be unit tested
6. **D&D Authenticity**: Keep mechanics true to D&D 5e while being customizable
7. **Scalability**: Adding new features shouldn't require modifying existing code

### Core Components

#### 1. **Unified Effect System**

**Goal**: Single source of truth for all effects (traits, items, custom effects, day state).

**New Type Definition**:
```typescript
// src/types/effects.ts

export enum EffectContext {
  PASSIVE_MODIFIER = 'passive_modifier',
  ABILITY_CHECKS = 'ability_checks',
  SAVING_THROWS = 'saving_throws',
  ATTACK_ROLLS = 'attack_rolls',      // Future
  DAMAGE_ROLLS = 'damage_rolls',      // Future
}

export enum EffectType {
  STAT_MODIFIER = 'stat_modifier',
  ADVANTAGE = 'advantage',
  DISADVANTAGE = 'disadvantage',
  CUSTOM = 'custom',
}

export interface Effect {
  id: string
  source: string              // "ARTIST trait", "MacBook Pro", "Caffeinated (custom)"
  sourceType: 'trait' | 'item' | 'custom' | 'day_state'
  type: EffectType
  appliesTo: EffectContext[]
  condition?: string          // e.g., "drive > 0"
  isActive: boolean           // Evaluated from condition

  // Type-specific fields
  statModifiers?: StatModifier[]     // For STAT_MODIFIER
  affectedStats?: string[]           // For ADVANTAGE/DISADVANTAGE
  flatModifier?: number              // Flat bonus with advantage/disadvantage
}

export interface AppliedEffect {
  totalModifier: number
  breakdown: ModifierBreakdown[]
  hasAdvantage: boolean
  hasDisadvantage: boolean
  activeEffects: Effect[]
}
```

**Key Functions**:
```typescript
// src/lib/effectSystem.ts

/**
 * Collect all effects from all sources
 */
export function collectEffects(params: {
  traits: Trait[]
  inventory: InventoryItem[]
  customEffects: CustomEffect[]
  dayState: DayStateInfo
  abilities: Ability[]          // Needed for condition evaluation
}): Effect[]

/**
 * Filter effects by context and evaluate conditions
 */
export function filterEffects(
  effects: Effect[],
  abilityName: string,
  context: EffectContext,
  abilities: Ability[]
): Effect[]

/**
 * Apply effects to calculate final modifier
 */
export function applyEffects(
  effects: Effect[],
  baseModifier: number,
  abilityName: string
): AppliedEffect
```

**Benefit**:
- **ONE** loop through effects instead of 3 separate loops
- Adding a new effect source (e.g., "blessings", "curses") requires NO changes to calculation logic
- Effects are first-class objects that can be inspected, logged, and tested independently

#### 2. **Unified Roll System**

**Goal**: ONE function that handles all roll types (ability checks, saving throws, attacks, damage).

**New Type Definitions**:
```typescript
// src/types/rolls.ts

export enum RollType {
  ABILITY_CHECK = 'ability_check',
  SAVING_THROW = 'saving_throw',
  ATTACK = 'attack',              // Future
  DAMAGE = 'damage',              // Future
  INITIATIVE = 'initiative',      // Future
}

export enum RollOutcome {
  CRITICAL_SUCCESS = 'critical_success',
  SUCCESS = 'success',
  FAILURE = 'failure',
  CRITICAL_FAILURE = 'critical_failure',
}

export interface RollParams {
  characterId: string
  type: RollType
  d20Value: number                    // Manually entered by user

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
  totalValue: number                  // d20 + totalModifier

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
  dayState: DayState
  activeEffects: Effect[]
}
```

**Core Roll Function**:
```typescript
// src/lib/rollSystem.ts

/**
 * Execute a roll of any type
 * This is the ONLY function that calculates roll outcomes
 */
export async function executeRoll(params: RollParams): Promise<RollResult> {
  // 1. Fetch character state (abilities, effects, day state)
  const characterState = await fetchCharacterState(params.characterId)

  // 2. Collect and filter effects
  const effects = collectEffects(characterState)
  const contextMap: Record<RollType, EffectContext> = {
    [RollType.ABILITY_CHECK]: EffectContext.ABILITY_CHECKS,
    [RollType.SAVING_THROW]: EffectContext.SAVING_THROWS,
    [RollType.ATTACK]: EffectContext.ATTACK_ROLLS,
    [RollType.DAMAGE]: EffectContext.DAMAGE_ROLLS,
  }
  const context = contextMap[params.type]
  const relevantEffects = filterEffects(effects, params.abilityName, context, characterState.abilities)

  // 3. Calculate modifiers
  const ability = params.abilityName
    ? characterState.abilities.find(a => a.ability_name === params.abilityName)
    : null
  const baseModifier = ability?.base_value || 0
  const appliedEffects = applyEffects(relevantEffects, baseModifier, params.abilityName)

  // 4. Calculate total
  const totalModifier = appliedEffects.totalModifier + (params.additionalModifier || 0)
  const totalValue = params.d20Value + totalModifier

  // 5. Determine advantage/disadvantage
  const hasAdvantage = params.manualAdvantage || appliedEffects.hasAdvantage
  const hasDisadvantage = params.manualDisadvantage || appliedEffects.hasDisadvantage

  // 6. Determine outcome
  const outcome = determineOutcome(params.d20Value, totalValue, params.dc)

  // 7. Calculate XP
  const xpMultiplier = getXPMultiplier(characterState.dayState, outcome)
  const xpAwarded = calculateXP(params.baseXP || 0, outcome, xpMultiplier)

  // 8. Build result
  return {
    rollType: params.type,
    d20Value: params.d20Value,
    abilityUsed: params.abilityName,
    baseModifier,
    additionalModifier: params.additionalModifier || 0,
    totalModifier,
    modifierBreakdown: appliedEffects.breakdown,
    totalValue,
    hasAdvantage,
    hasDisadvantage,
    advantageSources: relevantEffects.filter(e => e.type === EffectType.ADVANTAGE).map(e => e.source),
    disadvantageSources: relevantEffects.filter(e => e.type === EffectType.DISADVANTAGE).map(e => e.source),
    dc: params.dc,
    outcome,
    success: outcome === RollOutcome.CRITICAL_SUCCESS || outcome === RollOutcome.SUCCESS,
    baseXP: params.baseXP || 0,
    xpMultiplier,
    xpAwarded,
    timestamp: new Date().toISOString(),
    dayState: characterState.dayState.state,
    activeEffects: relevantEffects,
  }
}

/**
 * Log a roll to the action log and apply consequences
 */
export async function logRoll(roll: RollResult, characterId: string, notes?: string) {
  // 1. Create action log entry
  const actionLog = await createActionLogEntry(roll, characterId, notes)

  // 2. Award XP
  if (roll.xpAwarded > 0) {
    await awardXP(characterId, roll.xpAwarded)
  }

  // 3. Increment ability usage
  if (roll.abilityUsed) {
    await incrementAbilityUsage(characterId, roll.abilityUsed)
  }

  return actionLog
}
```

**Simplified Public API**:
```typescript
// src/lib/rollSystem.ts (continued)

/**
 * Log an ability check (convenience wrapper)
 */
export async function logAbilityCheck(params: Omit<RollParams, 'type'>) {
  const result = await executeRoll({ ...params, type: RollType.ABILITY_CHECK })
  return logRoll(result, params.characterId, params.description)
}

/**
 * Log a saving throw (convenience wrapper)
 */
export async function logSavingThrow(params: Omit<RollParams, 'type'>) {
  const result = await executeRoll({ ...params, type: RollType.SAVING_THROW })
  return logRoll(result, params.characterId, params.description)
}

// Future: Same pattern for attacks, damage, initiative, etc.
export async function logAttackRoll(params: Omit<RollParams, 'type'>) {
  const result = await executeRoll({ ...params, type: RollType.ATTACK })
  return logRoll(result, params.characterId, params.description)
}
```

**Benefit**:
- **195 lines** of `logAbilityCheck()` + **183 lines** of `logSavingThrow()` = **378 lines**
- **Refactored**: ~150 lines total in `executeRoll()` + `logRoll()` + small wrappers
- **50% reduction** in code
- Adding attack rolls, damage rolls, initiative rolls = **5 lines each**
- ONE place to fix bugs, ONE place to add features

#### 3. **Calculation Strategy Pattern**

**Goal**: Make XP calculation, outcome determination, and other rules customizable.

**Implementation**:
```typescript
// src/lib/strategies.ts

export type OutcomeStrategy = (d20Value: number, total: number, dc?: number) => RollOutcome

export const DEFAULT_OUTCOME_STRATEGY: OutcomeStrategy = (d20Value, total, dc) => {
  if (d20Value === 20) return RollOutcome.CRITICAL_SUCCESS
  if (d20Value === 1) return RollOutcome.CRITICAL_FAILURE
  if (dc === undefined || dc === null) return RollOutcome.SUCCESS
  return total >= dc ? RollOutcome.SUCCESS : RollOutcome.FAILURE
}

export type XPStrategy = (baseXP: number, outcome: RollOutcome, multiplier: number) => number

export const DEFAULT_XP_STRATEGY: XPStrategy = (baseXP, outcome, multiplier) => {
  if (outcome === RollOutcome.FAILURE || outcome === RollOutcome.CRITICAL_FAILURE) {
    return 0
  }
  let xp = baseXP
  if (outcome === RollOutcome.CRITICAL_SUCCESS) {
    xp *= 2
  }
  xp *= multiplier
  return xp
}

// Future: Allow users to define custom strategies
export const XP_STRATEGIES = {
  default: DEFAULT_XP_STRATEGY,
  always_award: (baseXP, outcome, multiplier) => baseXP * multiplier, // Even on failure
  high_risk: (baseXP, outcome, multiplier) => {
    // More XP for success, less for failure
    if (outcome === RollOutcome.CRITICAL_SUCCESS) return baseXP * 3 * multiplier
    if (outcome === RollOutcome.SUCCESS) return baseXP * 1.5 * multiplier
    return 0
  },
}
```

#### 4. **Effect Resolution Pipeline**

**Goal**: Clear, testable stages for resolving effects.

**Implementation**:
```typescript
// src/lib/effectPipeline.ts

export interface EffectPipeline {
  collect: (state: CharacterState) => Effect[]
  filter: (effects: Effect[], context: EffectContext, ability: string) => Effect[]
  evaluate: (effects: Effect[], abilities: Ability[]) => Effect[]
  apply: (effects: Effect[], baseModifier: number, ability: string) => AppliedEffect
}

export const createDefaultPipeline = (): EffectPipeline => ({
  collect: (state) => {
    const effects: Effect[] = []

    // Traits
    effects.push(...state.traits.map(trait => convertTraitToEffects(trait)))

    // Inventory
    effects.push(...state.inventory
      .filter(item => item.is_equipped)
      .map(item => convertItemToEffects(item)))

    // Custom effects
    effects.push(...state.customEffects.map(ce => convertCustomEffectToEffect(ce)))

    // Day state
    if (state.dayState.state !== 'normal') {
      effects.push(convertDayStateToEffect(state.dayState))
    }

    return effects
  },

  filter: (effects, context, ability) => {
    return effects.filter(effect => {
      // Must apply to this context
      if (effect.appliesTo.length > 0 && !effect.appliesTo.includes(context)) {
        return false
      }
      // Must affect this ability (or be a general modifier)
      if (effect.affectedStats && effect.affectedStats.length > 0) {
        if (!effect.affectedStats.includes(ability)) {
          return false
        }
      }
      return true
    })
  },

  evaluate: (effects, abilities) => {
    return effects.map(effect => ({
      ...effect,
      isActive: effect.condition
        ? evaluateCondition(effect.condition, abilities)
        : true
    })).filter(effect => effect.isActive)
  },

  apply: (effects, baseModifier, ability) => {
    let totalModifier = baseModifier
    const breakdown: ModifierBreakdown[] = [
      { source: `${ability} (base)`, value: baseModifier }
    ]
    let hasAdvantage = false
    let hasDisadvantage = false

    for (const effect of effects) {
      if (effect.type === EffectType.STAT_MODIFIER && effect.statModifiers) {
        const mod = effect.statModifiers.find(sm => sm.stat === ability)
        if (mod) {
          totalModifier += mod.modifier
          breakdown.push({ source: effect.source, value: mod.modifier })
        }
      }

      if (effect.type === EffectType.ADVANTAGE) {
        hasAdvantage = true
        if (effect.flatModifier) {
          totalModifier += effect.flatModifier
          breakdown.push({ source: `${effect.source} (advantage)`, value: effect.flatModifier })
        } else {
          breakdown.push({ source: `${effect.source} (advantage)`, value: 0 })
        }
      }

      if (effect.type === EffectType.DISADVANTAGE) {
        hasDisadvantage = true
        if (effect.flatModifier) {
          totalModifier += effect.flatModifier
          breakdown.push({ source: `${effect.source} (disadvantage)`, value: effect.flatModifier })
        } else {
          breakdown.push({ source: `${effect.source} (disadvantage)`, value: 0 })
        }
      }
    }

    return {
      totalModifier,
      breakdown,
      hasAdvantage,
      hasDisadvantage,
      activeEffects: effects,
    }
  }
})
```

**Benefit**:
- Each stage is independently testable
- Can swap out strategies (e.g., different condition evaluation)
- Clear flow: collect → filter → evaluate → apply

---

## 📝 **Implementation Plan**

### Phase 1: Foundation (Refactor Core Systems)

**Goal**: Eliminate duplication, establish new architecture without breaking existing functionality.

**Tasks**:

1. **Create new type definitions** ✅
   - [ ] Create `src/types/effects.ts` with `Effect`, `EffectContext`, `EffectType`, `AppliedEffect`
   - [ ] Create `src/types/rolls.ts` with `RollType`, `RollOutcome`, `RollParams`, `RollResult`
   - [ ] Export from `src/types/index.ts`

2. **Build effect system** ✅
   - [ ] Create `src/lib/effectSystem.ts`
   - [ ] Implement `collectEffects()` - gather from all sources
   - [ ] Implement `filterEffects()` - apply context and ability filtering
   - [ ] Implement `applyEffects()` - calculate modifiers
   - [ ] Add converter functions: `convertTraitToEffects()`, `convertItemToEffects()`, etc.
   - [ ] Write unit tests for effect system

3. **Build unified roll system** ✅
   - [ ] Create `src/lib/rollSystem.ts`
   - [ ] Implement `executeRoll()` - core roll calculation
   - [ ] Implement `logRoll()` - database persistence and side effects
   - [ ] Implement helper functions: `fetchCharacterState()`, `determineOutcome()`, `calculateXP()`
   - [ ] Create wrapper functions: `logAbilityCheck()`, `logSavingThrow()`
   - [ ] Write unit tests for roll system

4. **Create strategy system** ✅
   - [ ] Create `src/lib/strategies.ts`
   - [ ] Implement `DEFAULT_OUTCOME_STRATEGY`
   - [ ] Implement `DEFAULT_XP_STRATEGY`
   - [ ] Create strategy registry for future extensibility

5. **Deprecate old system** ✅
   - [ ] Mark old `calculateTotalModifier()` as `@deprecated` (keep for backward compatibility)
   - [ ] Mark old `logAbilityCheck()` and `logSavingThrow()` as `@deprecated`
   - [ ] Add JSDoc comments explaining migration path

### Phase 2: Migration (Update Components)

**Goal**: Migrate UI components to use new roll system.

**Tasks**:

1. **Update Dashboard** ✅
   - [ ] Replace old `calculateTotalModifier()` calls with new `applyEffects()`
   - [ ] Update `QuickLogForm` to use new `logAbilityCheck()` and `logSavingThrow()`
   - [ ] Test modifier display still works correctly

2. **Update ability display** ✅
   - [ ] Ensure passive modifiers use `EffectContext.PASSIVE_MODIFIER`
   - [ ] Verify `current_value` calculations are correct

3. **Update action log display** ✅
   - [ ] Ensure log entries display correctly with new breakdown format
   - [ ] Test advantage/disadvantage display

4. **Remove deprecated code** ✅
   - [ ] Delete old `calculateTotalModifier()` from `calculations.ts`
   - [ ] Delete old `logAbilityCheck()` and `logSavingThrow()` from `actionLogService.ts`
   - [ ] Remove any unused imports

### Phase 3: Enhance (New Features)

**Goal**: Add features that were difficult/impossible with old system.

**Tasks**:

1. **Add attack rolls** 🆕
   - [ ] Add `RollType.ATTACK` support to `executeRoll()`
   - [ ] Create `logAttackRoll()` wrapper
   - [ ] Add UI for attack rolls (future feature)

2. **Add damage rolls** 🆕
   - [ ] Add `RollType.DAMAGE` support
   - [ ] Create `logDamageRoll()` wrapper
   - [ ] Support damage types (physical, mental, etc.)

3. **Effect templates** 🆕
   - [ ] Create common effect presets (e.g., "Blessed +1d4", "Bane -1d4")
   - [ ] UI for applying templates to traits/items

4. **Advanced formulas** 🆕
   - [ ] Allow custom XP strategies per quest type
   - [ ] Formula editor for power users
   - [ ] Difficulty scaling based on character level

5. **Roll history API** 🆕
   - [ ] Query interface for past rolls
   - [ ] Filter by ability, outcome, date range
   - [ ] Analytics: success rate, average modifiers, XP trends

### Phase 4: Evolve (Future-Proofing)

**Goal**: Make system extensible without code changes.

**Tasks**:

1. **Effect plugin system** 🚀
   - [ ] Define `EffectPlugin` interface
   - [ ] Registry for custom effect types
   - [ ] UI for creating custom effect types

2. **Ruleset variants** 🚀
   - [ ] Abstract D&D 5e rules into a ruleset
   - [ ] Support Pathfinder 2e ruleset
   - [ ] Support fully custom rulesets
   - [ ] Ruleset switcher in settings

3. **Roll snapshots** 🚀
   - [ ] Store complete game state at roll time
   - [ ] Audit trail: "what modifiers applied at this specific moment?"
   - [ ] Retroactive analysis

---

## 🎯 **Success Criteria**

After refactor, the system should:

1. ✅ **Reduce code by 40-50%** - Eliminate duplication
2. ✅ **Single source of truth** - One place for each calculation
3. ✅ **Easy to extend** - Adding attack rolls = 5 lines of code
4. ✅ **Type-safe** - No string literals, use enums
5. ✅ **Testable** - Pure functions, clear inputs/outputs
6. ✅ **Backward compatible** - Existing logs still display correctly
7. ✅ **D&D authentic** - Maintains d20 + modifier simplicity
8. ✅ **Scalable** - Can add new effect types, roll types, strategies without refactoring

---

## 🧪 **Testing Strategy**

### Unit Tests to Write

```typescript
// src/lib/effectSystem.test.ts
describe('collectEffects', () => {
  it('should gather effects from traits, items, custom effects, and day state')
  it('should mark equipped items only')
  it('should include day state effects only when not normal')
})

describe('filterEffects', () => {
  it('should filter by context')
  it('should filter by affected stats')
  it('should include effects with empty appliesTo array')
})

describe('applyEffects', () => {
  it('should sum stat modifiers correctly')
  it('should detect advantage from multiple sources')
  it('should handle advantage + disadvantage cancellation')
  it('should create accurate breakdown')
})

// src/lib/rollSystem.test.ts
describe('executeRoll', () => {
  it('should calculate correct total for ability check')
  it('should apply day state effects')
  it('should handle critical success (nat 20)')
  it('should handle critical failure (nat 1)')
  it('should determine success vs DC correctly')
  it('should calculate XP with multipliers')
})

describe('determineOutcome', () => {
  it('should return CRITICAL_SUCCESS on nat 20')
  it('should return CRITICAL_FAILURE on nat 1')
  it('should return SUCCESS when total >= DC')
  it('should return FAILURE when total < DC')
  it('should return SUCCESS when no DC provided')
})

// src/lib/strategies.test.ts
describe('DEFAULT_XP_STRATEGY', () => {
  it('should award 0 XP on failure')
  it('should award baseXP on success')
  it('should double XP on critical success')
  it('should apply day state multiplier')
})
```

### Integration Tests

```typescript
describe('Roll System Integration', () => {
  it('should log an ability check end-to-end', async () => {
    // Setup: Create character with traits, items, custom effects
    // Execute: Log ability check
    // Assert: Correct action log entry, XP awarded, ability usage incremented
  })

  it('should apply conditional trait effects correctly', async () => {
    // Setup: ARTIST trait with "drive > 0" condition
    // Execute: Roll with drive = 5, then drive = 0
    // Assert: Modifier applies when drive > 0, doesn't when drive = 0
  })

  it('should handle advantage from multiple sources', async () => {
    // Setup: Trait + item both grant advantage
    // Execute: Roll
    // Assert: hasAdvantage = true, both sources listed
  })
})
```

---

## 📚 **Additional Considerations**

### Database Schema

**No changes required** ✅ - The refactor is purely in application code. Existing `action_log` table structure supports the new system.

### Migration Path

**Backward Compatible** ✅ - Old action logs will still display correctly. New logs will use the refined system but store in the same format.

### Performance

**Expected Improvement** 📈:
- Fewer database queries (one `fetchCharacterState()` instead of multiple)
- Fewer loops (one effect loop instead of 3)
- Better caching potential (effects can be cached per context)

### D&D Authenticity

**Preserved** 🎲:
- d20 + modifier vs DC is unchanged
- Advantage/disadvantage work identically
- Critical hits/failures on nat 20/1
- Effect stacking rules match D&D 5e

### Customizability

**Enhanced** 🔧:
- Strategy pattern allows custom XP formulas
- Effect system supports arbitrary effect types
- Context system allows fine-grained control
- Foundation for user-defined rules

---

## 🎬 **Getting Started**

### Recommended Approach

1. **Read this entire prompt** to understand the architecture
2. **Review [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md)** to understand current system
3. **Start with Phase 1, Task 1** - Create type definitions
4. **Implement incrementally** - One task at a time, with tests
5. **Keep old code running** - Don't delete until migration is complete
6. **Test thoroughly** - Each phase should have passing tests before moving on

### Key Files to Create/Modify

**New Files**:
- `src/types/effects.ts`
- `src/types/rolls.ts`
- `src/lib/effectSystem.ts`
- `src/lib/rollSystem.ts`
- `src/lib/strategies.ts`
- `src/lib/effectPipeline.ts` (optional, Phase 3)

**Files to Modify**:
- `src/types/index.ts` - Add new exports
- `src/lib/calculations.ts` - Mark functions as deprecated
- `src/lib/actionLogService.ts` - Mark functions as deprecated, then eventually delete
- `src/pages/Dashboard.tsx` - Migrate to new system
- `src/components/QuickLogForm.tsx` - Update to use new roll functions

**Files to Eventually Delete**:
- Most of `src/lib/actionLogService.ts` (keep utilities, delete log functions)
- `calculateTotalModifier()` from `src/lib/calculations.ts`

---

## 💡 **Tips for Implementation**

1. **Start small** - Get one roll type working end-to-end before adding others
2. **Test in isolation** - Unit test each function before integration
3. **Preserve behavior** - New system should produce identical results to old system
4. **Document as you go** - Add JSDoc comments explaining each function's purpose
5. **Use TypeScript strictly** - Enable strict mode, no `any` types
6. **Think in pipelines** - collect → filter → evaluate → apply is the mental model
7. **Embrace composition** - Build complex behavior from simple, reusable functions
8. **Keep D&D in mind** - If it wouldn't make sense in D&D, it probably shouldn't be in the code

---

## 🚀 **Ready to Begin?**

You now have:
- ✅ Complete analysis of current problems
- ✅ Detailed architecture for the solution
- ✅ Step-by-step implementation plan
- ✅ Testing strategy
- ✅ Success criteria

**Next Steps**:
1. Create a new git branch: `git checkout -b refactor/calculation-system`
2. Start with Phase 1, Task 1: Create type definitions
3. Commit frequently with clear messages
4. Open a PR when Phase 1 is complete for review

**Questions to consider**:
- Should we implement a feature flag to toggle between old/new systems during migration?
- Do we want to add telemetry to track which effects are most commonly used?
- Should we expose the strategy system to users via UI, or keep it code-only for now?

Good luck! This refactor will dramatically improve the maintainability and scalability of the RPG Life Tracker. 🎲✨
