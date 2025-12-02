import { supabase } from '../supabase'

/**
 * Migration Script: Convert single effect objects to arrays
 *
 * This script migrates the database schema for traits and inventory items
 * from storing single effect objects to arrays of effects.
 *
 * Before: { mechanical_effect: { type: "advantage", ... } }
 * After:  { mechanical_effect: [{ type: "advantage", ... }] }
 */

interface MigrationResult {
  success: boolean
  traitsUpdated: number
  inventoryUpdated: number
  errors: string[]
}

export async function migrateEffectsToArrays(): Promise<MigrationResult> {
  // Check if migration has already been run
  const migrationKey = 'rpg_life_tracker_effects_migration_v1'
  const migrationComplete = localStorage.getItem(migrationKey)

  if (migrationComplete === 'true') {
    console.log('✅ Effects migration already completed, skipping...')
    return {
      success: true,
      traitsUpdated: 0,
      inventoryUpdated: 0,
      errors: [],
    }
  }

  const result: MigrationResult = {
    success: true,
    traitsUpdated: 0,
    inventoryUpdated: 0,
    errors: [],
  }

  console.log('🔄 Starting effects migration...')

  try {
    // ========================================================================
    // MIGRATE TRAITS
    // ========================================================================
    console.log('📝 Migrating traits...')

    const { data: traits, error: traitsError } = await supabase
      .from('traits')
      .select('*')

    if (traitsError) {
      result.errors.push(`Error fetching traits: ${traitsError.message}`)
      result.success = false
      return result
    }

    if (traits && traits.length > 0) {
      for (const trait of traits) {
        // Check if mechanical_effect exists and is not already an array
        if (trait.mechanical_effect && !Array.isArray(trait.mechanical_effect)) {
          const { error: updateError } = await supabase
            .from('traits')
            .update({
              mechanical_effect: [trait.mechanical_effect],
            })
            .eq('id', trait.id)

          if (updateError) {
            result.errors.push(
              `Error updating trait ${trait.id}: ${updateError.message}`
            )
          } else {
            result.traitsUpdated++
            console.log(`  ✓ Migrated trait: ${trait.trait_name}`)
          }
        }
      }
    }

    console.log(`✅ Traits migration complete: ${result.traitsUpdated} updated`)

    // ========================================================================
    // MIGRATE INVENTORY ITEMS
    // ========================================================================
    console.log('📦 Migrating inventory items...')

    const { data: items, error: itemsError } = await supabase
      .from('inventory')
      .select('*')

    if (itemsError) {
      result.errors.push(`Error fetching inventory: ${itemsError.message}`)
      result.success = false
      return result
    }

    if (items && items.length > 0) {
      for (const item of items) {
        // Check if passive_effect exists and is not already an array
        if (item.passive_effect && !Array.isArray(item.passive_effect)) {
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              passive_effect: [item.passive_effect],
            })
            .eq('id', item.id)

          if (updateError) {
            result.errors.push(
              `Error updating item ${item.id}: ${updateError.message}`
            )
          } else {
            result.inventoryUpdated++
            console.log(`  ✓ Migrated item: ${item.item_name}`)
          }
        }
      }
    }

    console.log(
      `✅ Inventory migration complete: ${result.inventoryUpdated} updated`
    )

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n📊 Migration Summary:')
    console.log(`  - Traits updated: ${result.traitsUpdated}`)
    console.log(`  - Inventory items updated: ${result.inventoryUpdated}`)
    console.log(`  - Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.error('\n❌ Errors encountered:')
      result.errors.forEach((error) => console.error(`  - ${error}`))
      result.success = false
    } else {
      console.log('\n✨ Migration completed successfully!')
      // Mark migration as complete
      localStorage.setItem('rpg_life_tracker_effects_migration_v1', 'true')
    }
  } catch (error) {
    result.success = false
    result.errors.push(`Unexpected error: ${error}`)
    console.error('❌ Migration failed:', error)
  }

  return result
}

// Export a function to run the migration manually
export async function runMigration() {
  console.log('Starting manual migration...\n')
  const result = await migrateEffectsToArrays()
  return result
}
