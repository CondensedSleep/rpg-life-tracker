import type { StateCreator } from 'zustand'
import type {
  Character,
  CoreStat,
  Ability,
  Trait,
  InventoryItem,
  CoreStatName,
  CoreStatsMap,
  AbilitiesByCoreStat,
} from '@/types'
import { recalculateCoreStats, calculateXPToNextLevel } from '@/lib/calculations'

export interface CharacterState {
  // Data
  character: Character | null
  coreStats: CoreStatsMap | null
  abilities: Ability[]
  traits: Trait[]
  inventory: InventoryItem[]

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  setCharacter: (character: Character) => void
  setCoreStats: (stats: CoreStat[]) => void
  setAbilities: (abilities: Ability[]) => void
  setTraits: (traits: Trait[]) => void
  setInventory: (inventory: InventoryItem[]) => void

  // Character actions
  addXP: (amount: number) => void
  levelUp: (abilityName: string) => void

  // Ability actions
  incrementAbilityUsage: (abilityName: string) => void
  updateAbilityValue: (abilityName: string, newValue: number) => void

  // Trait actions
  addTrait: (trait: Trait) => void
  updateTrait: (traitId: string, updates: Partial<Trait>) => void
  removeTrait: (traitId: string) => void

  // Inventory actions
  addItem: (item: InventoryItem) => void
  updateItem: (itemId: string, updates: Partial<InventoryItem>) => void
  removeItem: (itemId: string) => void

  // Computed values
  getAbilitiesByCoreStat: () => AbilitiesByCoreStat
  getCoreStatValue: (statName: CoreStatName) => number | null
  getCoreStatModifier: (statName: CoreStatName) => number | null
}

export const createCharacterSlice: StateCreator<CharacterState> = (set, get) => ({
  // Initial state
  character: null,
  coreStats: null,
  abilities: [],
  traits: [],
  inventory: [],
  isLoading: false,
  error: null,

  // Setters
  setCharacter: (character) => set({ character }),

  setCoreStats: (stats) => {
    const statsMap: CoreStatsMap = {
      body: stats.find((s) => s.stat_name === 'body')!,
      mind: stats.find((s) => s.stat_name === 'mind')!,
      heart: stats.find((s) => s.stat_name === 'heart')!,
      soul: stats.find((s) => s.stat_name === 'soul')!,
    }
    set({ coreStats: statsMap })
  },

  setAbilities: (abilities) => {
    set({ abilities })
    // Recalculate core stats when abilities change
    const { coreStats } = get()
    if (coreStats) {
      const updated = recalculateCoreStats(coreStats, abilities)
      set({ coreStats: updated })
    }
  },

  setTraits: (traits) => set({ traits }),
  setInventory: (inventory) => set({ inventory }),

  // Character actions
  addXP: (amount) => {
    const { character } = get()
    if (!character) return

    const newXP = character.current_xp + amount
    set({
      character: {
        ...character,
        current_xp: newXP,
      },
    })
  },

  levelUp: (abilityName) => {
    const { character, abilities } = get()
    if (!character) return

    const newLevel = character.level + 1
    const newXPToNext = calculateXPToNextLevel(newLevel)

    // Calculate excess XP to carry over
    const excessXP = Math.max(0, character.current_xp - character.xp_to_next_level)

    // Update character level and carry over excess XP
    set({
      character: {
        ...character,
        level: newLevel,
        xp_to_next_level: newXPToNext,
        current_xp: excessXP,
      },
    })

    // Update selected ability
    const updatedAbilities = abilities.map((ability) => {
      if (ability.ability_name === abilityName) {
        return {
          ...ability,
          current_value: ability.current_value + 1,
          times_used_this_level: 0, // Reset after level up
        }
      }
      // Reset all abilities' usage counters
      return {
        ...ability,
        times_used_this_level: 0,
      }
    })

    get().setAbilities(updatedAbilities)
  },

  // Ability actions
  incrementAbilityUsage: (abilityName) => {
    const { abilities } = get()
    const updated = abilities.map((ability) =>
      ability.ability_name === abilityName
        ? {
            ...ability,
            times_used_this_level: ability.times_used_this_level + 1,
            total_times_used: ability.total_times_used + 1,
          }
        : ability
    )
    get().setAbilities(updated)
  },

  updateAbilityValue: (abilityName, newValue) => {
    const { abilities } = get()
    const updated = abilities.map((ability) =>
      ability.ability_name === abilityName
        ? { ...ability, current_value: newValue }
        : ability
    )
    get().setAbilities(updated)
  },

  // Trait actions
  addTrait: (trait) => {
    const { traits } = get()
    set({ traits: [...traits, trait] })
  },

  updateTrait: (traitId, updates) => {
    const { traits } = get()
    set({
      traits: traits.map((trait) =>
        trait.id === traitId ? { ...trait, ...updates } : trait
      ),
    })
  },

  removeTrait: (traitId) => {
    const { traits } = get()
    set({ traits: traits.filter((trait) => trait.id !== traitId) })
  },

  // Inventory actions
  addItem: (item) => {
    const { inventory } = get()
    set({ inventory: [...inventory, item] })
  },

  updateItem: (itemId, updates) => {
    const { inventory } = get()
    set({
      inventory: inventory.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    })
  },

  removeItem: (itemId) => {
    const { inventory } = get()
    set({ inventory: inventory.filter((item) => item.id !== itemId) })
  },

  // Computed values
  getAbilitiesByCoreStat: () => {
    const { abilities } = get()
    const grouped: AbilitiesByCoreStat = {
      body: [],
      mind: [],
      heart: [],
      soul: [],
    }

    abilities.forEach((ability) => {
      grouped[ability.core_stat].push(ability)
    })

    return grouped
  },

  getCoreStatValue: (statName) => {
    const { coreStats } = get()
    return coreStats?.[statName]?.current_value ?? null
  },

  getCoreStatModifier: (statName) => {
    const { coreStats } = get()
    return coreStats?.[statName]?.modifier ?? null
  },
})
