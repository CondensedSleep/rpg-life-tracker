import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useStore } from '@/store'
import {
  abilityCheckSchema,
  savingThrowSchema,
  customEffectFormSchema,
} from '@/lib/validations'
import {
  logAbilityCheck,
  logSavingThrow,
  createCustomEffect,
} from '@/lib/actionLogService'
import { loadDataFromSupabase } from '@/lib/loadSeedData'
import type { z } from 'zod'

type ActionType = 'ability_check' | 'saving_throw' | 'custom_effect'

type AbilityCheckForm = z.infer<typeof abilityCheckSchema>
type SavingThrowForm = z.infer<typeof savingThrowSchema>
type CustomEffectForm = z.infer<typeof customEffectFormSchema>

export function QuickLogForm() {
  const [activeTab, setActiveTab] = useState<ActionType>('ability_check')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const character = useStore((state) => state.character)
  const abilities = useStore((state) => state.abilities)
  const inventory = useStore((state) => state.inventory)

  // Form for ability check
  const abilityCheckForm = useForm<AbilityCheckForm>({
    resolver: zodResolver(abilityCheckSchema),
    defaultValues: {
      ability_name: null,
      roll_value: undefined,
      dc: null,
      description: null,
      xp_gained: null,
      tagged_items: [],
    },
  })

  // Form for saving throw
  const savingThrowForm = useForm<SavingThrowForm>({
    resolver: zodResolver(savingThrowSchema),
    defaultValues: {
      ability_name: null,
      roll_value: undefined,
      dc: null,
      description: null,
      xp_gained: null,
      tagged_items: [],
    },
  })

  // Form for custom effect
  const customEffectForm = useForm<CustomEffectForm>({
    resolver: zodResolver(customEffectFormSchema),
    defaultValues: {
      effect_name: '',
      effect_type: 'stat_modifier',
      affected_stats: [],
      stat_modifiers: [],
      modifier: null,
      description: null,
    },
  })

  const handleAbilityCheckSubmit = async (data: AbilityCheckForm) => {
    if (!character) return

    setIsSubmitting(true)
    try {
      const result = await logAbilityCheck({
        characterId: character.id,
        abilityName: data.ability_name,
        rollValue: data.roll_value,
        dc: data.dc,
        description: data.description,
        xpGained: data.xp_gained,
        taggedItems: data.tagged_items,
      })

      if (result.error) {
        alert('Failed to log ability check: ' + result.error.message)
        return
      }

      // Reload data to get updated XP and ability usage
      await loadDataFromSupabase(character.user_id)

      // Show success message with outcome
      const outcomeText =
        result.data?.outcome === 'critical_success'
          ? '🎉 Critical Success!'
          : result.data?.outcome === 'success'
            ? '✅ Success!'
            : result.data?.outcome === 'critical_failure'
              ? '💥 Critical Failure!'
              : '❌ Failed'

      alert(
        `${outcomeText}\n\nRoll: ${data.roll_value}\nTotal: ${result.data?.total_value}\n${result.data?.finalXP ? `XP Gained: ${result.data.finalXP}` : ''}`
      )

      // Reset form
      abilityCheckForm.reset()
    } catch (error) {
      console.error('Error logging ability check:', error)
      alert('An error occurred while logging the ability check')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSavingThrowSubmit = async (data: SavingThrowForm) => {
    if (!character) return

    setIsSubmitting(true)
    try {
      const result = await logSavingThrow({
        characterId: character.id,
        abilityName: data.ability_name,
        rollValue: data.roll_value,
        dc: data.dc,
        description: data.description,
        xpGained: data.xp_gained,
        taggedItems: data.tagged_items,
      })

      if (result.error) {
        alert('Failed to log saving throw: ' + result.error.message)
        return
      }

      // Reload data to get updated XP and ability usage
      await loadDataFromSupabase(character.user_id)

      // Show success message with outcome
      const outcomeText =
        result.data?.outcome === 'critical_success'
          ? '🎉 Critical Success!'
          : result.data?.outcome === 'success'
            ? '✅ Success!'
            : result.data?.outcome === 'critical_failure'
              ? '💥 Critical Failure!'
              : '❌ Failed'

      alert(
        `${outcomeText}\n\nRoll: ${data.roll_value}\nTotal: ${result.data?.total_value}\n${result.data?.finalXP ? `XP Gained: ${result.data.finalXP}` : ''}`
      )

      // Reset form
      savingThrowForm.reset()
    } catch (error) {
      console.error('Error logging saving throw:', error)
      alert('An error occurred while logging the saving throw')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCustomEffectSubmit = async (data: CustomEffectForm) => {
    if (!character) return

    setIsSubmitting(true)
    try {
      const result = await createCustomEffect({
        characterId: character.id,
        effectName: data.effect_name,
        effectType: data.effect_type,
        statModifiers: data.stat_modifiers,
        affectedStats: data.affected_stats,
        modifier: data.modifier,
        description: data.description,
      })

      if (result.error) {
        alert('Failed to create custom effect: ' + result.error.message)
        return
      }

      // Reload data to get the new custom effect
      await loadDataFromSupabase(character.user_id)

      alert('✅ Custom effect created! It will expire at midnight.')

      // Reset form
      customEffectForm.reset()
    } catch (error) {
      console.error('Error creating custom effect:', error)
      alert('An error occurred while creating the custom effect')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
      <h2 className="text-xl font-bold mb-4">Quick Log</h2>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('ability_check')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ability_check'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Ability Check
        </button>
        <button
          onClick={() => setActiveTab('saving_throw')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'saving_throw'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Saving Throw
        </button>
        <button
          onClick={() => setActiveTab('custom_effect')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'custom_effect'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Custom Effect
        </button>
      </div>

      {/* Ability Check Form */}
      {activeTab === 'ability_check' && (
        <form
          onSubmit={abilityCheckForm.handleSubmit(handleAbilityCheckSubmit)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Ability (Optional)
            </label>
            <select
              {...abilityCheckForm.register('ability_name')}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            >
              <option value="">None</option>
              {abilities.map((ability) => (
                <option key={ability.id} value={ability.ability_name}>
                  {ability.ability_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Roll Value (1-20) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                {...abilityCheckForm.register('roll_value', {
                  valueAsNumber: true,
                })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
              />
              {abilityCheckForm.formState.errors.roll_value && (
                <p className="text-red-500 text-sm mt-1">
                  {abilityCheckForm.formState.errors.roll_value.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                DC (Optional)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                {...abilityCheckForm.register('dc', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              XP Reward (Optional)
            </label>
            <input
              type="number"
              min="0"
              {...abilityCheckForm.register('xp_gained', {
                valueAsNumber: true,
              })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (Optional)
            </label>
            <textarea
              {...abilityCheckForm.register('description')}
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Logging...' : 'Log Ability Check'}
          </button>
        </form>
      )}

      {/* Saving Throw Form */}
      {activeTab === 'saving_throw' && (
        <form
          onSubmit={savingThrowForm.handleSubmit(handleSavingThrowSubmit)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Ability (Optional)
            </label>
            <select
              {...savingThrowForm.register('ability_name')}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            >
              <option value="">None</option>
              {abilities.map((ability) => (
                <option key={ability.id} value={ability.ability_name}>
                  {ability.ability_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Roll Value (1-20) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                {...savingThrowForm.register('roll_value', {
                  valueAsNumber: true,
                })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
              />
              {savingThrowForm.formState.errors.roll_value && (
                <p className="text-red-500 text-sm mt-1">
                  {savingThrowForm.formState.errors.roll_value.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                DC (Optional)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                {...savingThrowForm.register('dc', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              XP Reward (Optional)
            </label>
            <input
              type="number"
              min="0"
              {...savingThrowForm.register('xp_gained', {
                valueAsNumber: true,
              })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (Optional)
            </label>
            <textarea
              {...savingThrowForm.register('description')}
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Logging...' : 'Log Saving Throw'}
          </button>
        </form>
      )}

      {/* Custom Effect Form */}
      {activeTab === 'custom_effect' && (
        <form
          onSubmit={customEffectForm.handleSubmit(handleCustomEffectSubmit)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Effect Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...customEffectForm.register('effect_name')}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
            {customEffectForm.formState.errors.effect_name && (
              <p className="text-red-500 text-sm mt-1">
                {customEffectForm.formState.errors.effect_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Effect Type <span className="text-red-500">*</span>
            </label>
            <select
              {...customEffectForm.register('effect_type')}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            >
              <option value="stat_modifier">Stat Modifier</option>
              <option value="advantage">Advantage</option>
              <option value="disadvantage">Disadvantage</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {customEffectForm.watch('effect_type') === 'stat_modifier' && (
            <div className="p-4 bg-bg-tertiary rounded-md border border-border">
              <p className="text-sm text-text-secondary mb-2">
                Add stat modifiers (e.g., +2 to Athletics, -1 to Stealth)
              </p>
              <div className="space-y-2">
                {/* Dynamic stat modifier fields */}
                <div className="text-sm text-text-secondary">
                  Coming soon: Dynamic stat modifier inputs
                </div>
              </div>
            </div>
          )}

          {(customEffectForm.watch('effect_type') === 'advantage' ||
            customEffectForm.watch('effect_type') === 'disadvantage') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Affected Stats
              </label>
              <div className="text-sm text-text-secondary">
                Coming soon: Multi-select for affected stats
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (Optional)
            </label>
            <textarea
              {...customEffectForm.register('description')}
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Custom Effect'}
          </button>
        </form>
      )}
    </div>
  )
}
