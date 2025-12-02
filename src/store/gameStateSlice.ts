import type { StateCreator } from 'zustand'
import type { DailyRoll, HitDice, InspirationTokens, DayState, CoreStatName } from '@/types'
import { determineDayState } from '@/lib/calculations'
import { getTodayLocalDate } from '@/lib/dateUtils'

export interface GameStateState {
  // Data
  dailyRoll: DailyRoll | null
  hitDice: HitDice | null
  inspirationTokens: InspirationTokens | null

  // Actions
  setDailyRoll: (roll: DailyRoll) => void
  setHitDice: (hitDice: HitDice) => void
  setInspirationTokens: (tokens: InspirationTokens) => void

  // Daily roll actions
  recordDailyRoll: (rollValue: number, affectedStats?: CoreStatName[], selectedStat?: CoreStatName) => void
  getTodaysDayState: () => DayState | null

  // Hit dice actions
  spendHitDie: () => void
  regainHitDice: (amount: number) => void
  takeLongRest: () => void

  // Inspiration actions
  useInspirationToken: () => void
  gainInspirationToken: () => void
}

export const createGameStateSlice: StateCreator<GameStateState> = (set, get) => ({
  // Initial state
  dailyRoll: null,
  hitDice: null,
  inspirationTokens: null,

  // Setters
  setDailyRoll: (roll) => set({ dailyRoll: roll }),
  setHitDice: (hitDice) => set({ hitDice }),
  setInspirationTokens: (tokens) => set({ inspirationTokens: tokens }),

  // Daily roll actions
  recordDailyRoll: (rollValue, affectedStats, _selectedStat) => {
    const dayState = determineDayState(rollValue)
    const today = getTodayLocalDate()

    // This would normally be persisted to Supabase
    // For now, just update local state
    set({
      dailyRoll: {
        id: crypto.randomUUID(),
        character_id: '', // Would be set from character state
        roll_date: today,
        roll_value: rollValue,
        day_state: dayState,
        affected_stats: affectedStats ?? null,
      },
    })
  },

  getTodaysDayState: () => {
    const { dailyRoll } = get()
    const today = new Date().toISOString().split('T')[0]

    if (!dailyRoll || dailyRoll.roll_date !== today) {
      return null
    }

    return dailyRoll.day_state
  },

  // Hit dice actions
  spendHitDie: () => {
    const { hitDice } = get()
    if (!hitDice || hitDice.current_hit_dice <= 0) return

    set({
      hitDice: {
        ...hitDice,
        current_hit_dice: hitDice.current_hit_dice - 1,
        days_at_zero: hitDice.current_hit_dice === 1 ? hitDice.days_at_zero + 1 : hitDice.days_at_zero,
        updated_at: new Date().toISOString(),
      },
    })
  },

  regainHitDice: (amount) => {
    const { hitDice } = get()
    if (!hitDice) return

    const newCurrent = Math.min(hitDice.current_hit_dice + amount, hitDice.max_hit_dice)

    set({
      hitDice: {
        ...hitDice,
        current_hit_dice: newCurrent,
        days_at_zero: newCurrent > 0 ? 0 : hitDice.days_at_zero,
        updated_at: new Date().toISOString(),
      },
    })
  },

  takeLongRest: () => {
    const { hitDice } = get()
    if (!hitDice) return

    set({
      hitDice: {
        ...hitDice,
        current_hit_dice: hitDice.max_hit_dice,
        exhaustion_level: 0,
        days_at_zero: 0,
        last_long_rest: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      },
    })
  },

  // Inspiration actions
  useInspirationToken: () => {
    const { inspirationTokens } = get()
    if (!inspirationTokens || inspirationTokens.token_count <= 0) return

    set({
      inspirationTokens: {
        ...inspirationTokens,
        token_count: inspirationTokens.token_count - 1,
        updated_at: new Date().toISOString(),
      },
    })
  },

  gainInspirationToken: () => {
    const { inspirationTokens } = get()
    if (!inspirationTokens) return

    set({
      inspirationTokens: {
        ...inspirationTokens,
        token_count: inspirationTokens.token_count + 1,
        updated_at: new Date().toISOString(),
      },
    })
  },
})
