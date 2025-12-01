import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createCharacterSlice, type CharacterState } from './characterSlice'
import { createGameStateSlice, type GameStateState } from './gameStateSlice'

// Combined store type
export type StoreState = CharacterState & GameStateState

// Create the store with all slices
export const useStore = create<StoreState>()(
  devtools(
    (...a) => ({
      ...createCharacterSlice(...a),
      ...createGameStateSlice(...a),
    }),
    { name: 'RPG Life Tracker Store' }
  )
)

// Convenience selectors
export const useCharacter = () => useStore((state) => state.character)
export const useCoreStats = () => useStore((state) => state.coreStats)
export const useAbilities = () => useStore((state) => state.abilities)
export const useTraits = () => useStore((state) => state.traits)
export const useInventory = () => useStore((state) => state.inventory)
export const useDailyRoll = () => useStore((state) => state.dailyRoll)
export const useHitDice = () => useStore((state) => state.hitDice)
export const useInspirationTokens = () => useStore((state) => state.inspirationTokens)
