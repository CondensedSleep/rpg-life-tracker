import { useStore } from '@/store'
import {
  INITIAL_CHARACTER,
  INITIAL_CORE_STATS,
  INITIAL_ABILITIES,
  INITIAL_TRAITS,
  INITIAL_INVENTORY,
} from './seedData'

/**
 * Load seed data into the Zustand store
 * This is used for single-user mode before Supabase is fully configured
 */
export function loadSeedData() {
  const store = useStore.getState()

  // Load character
  store.setCharacter(INITIAL_CHARACTER)

  // Load core stats
  store.setCoreStats(INITIAL_CORE_STATS)

  // Load abilities (this will also trigger core stat recalculation)
  store.setAbilities(INITIAL_ABILITIES)

  // Load traits
  store.setTraits(INITIAL_TRAITS)

  // Load inventory
  store.setInventory(INITIAL_INVENTORY)

  // Initialize hit dice based on body stat
  const bodyStatValue = store.getCoreStatValue('body')
  if (bodyStatValue !== null) {
    const maxHD = Math.ceil(bodyStatValue / 2.5)
    store.setHitDice({
      id: crypto.randomUUID(),
      character_id: INITIAL_CHARACTER.id,
      max_hit_dice: maxHD,
      current_hit_dice: maxHD,
      exhaustion_level: 0,
      days_at_zero: 0,
      last_long_rest: null,
      updated_at: new Date().toISOString(),
    })
  }

  // Initialize inspiration tokens
  store.setInspirationTokens({
    id: crypto.randomUUID(),
    character_id: INITIAL_CHARACTER.id,
    token_count: 0,
    updated_at: new Date().toISOString(),
  })

  console.log('✅ Seed data loaded successfully!')
}
