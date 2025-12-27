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
import type { Trait, InventoryItem, MechanicalEffect, PassiveEffect } from '@/types'

type ActionType = 'ability_check' | 'saving_throw' | 'custom_effect'

type AbilityCheckForm = z.infer<typeof abilityCheckSchema>
type SavingThrowForm = z.infer<typeof savingThrowSchema>
type CustomEffectForm = z.infer<typeof customEffectFormSchema>

// Helper function to calculate auto-fill values for a given ability and action type
function calculateAutoFillValues(
  abilityName: string | null,
  actionType: 'ability_checks' | 'saving_throws',
  traits: Trait[],
  inventory: InventoryItem[]
): {
  hasAdvantage: boolean
  hasDisadvantage: boolean
} {
  if (!abilityName) {
    return { hasAdvantage: false, hasDisadvantage: false }
  }

  let hasAdvantage = false
  let hasDisadvantage = false

  // Check traits for applicable effects
  for (const trait of traits) {
    if (!trait.is_active || !trait.mechanical_effect) continue

    for (const effect of trait.mechanical_effect) {
      // Check if the effect applies to this action type
      const appliesToThisAction = 
        !effect.applies_to || 
        effect.applies_to.length === 0 || 
        effect.applies_to.includes(actionType)

      if (!appliesToThisAction) continue

      // Check for advantage/disadvantage on this ability
      if (effect.type === 'advantage' && effect.affected_stats?.includes(abilityName)) {
        hasAdvantage = true
      }

      if (effect.type === 'disadvantage' && effect.affected_stats?.includes(abilityName)) {
        hasDisadvantage = true
      }
    }
  }

  // Check equipped inventory items for applicable effects
  for (const item of inventory) {
    if (!item.is_equipped || !item.passive_effect) continue

    for (const effect of item.passive_effect) {
      // Check if the effect applies to this action type
      const appliesToThisAction = 
        !effect.applies_to || 
        effect.applies_to.length === 0 || 
        effect.applies_to.includes(actionType)

      if (!appliesToThisAction) continue

      // Check for advantage/disadvantage on this ability
      if (effect.type === 'advantage' && effect.affected_stats?.includes(abilityName)) {
        hasAdvantage = true
      }

      if (effect.type === 'disadvantage' && effect.affected_stats?.includes(abilityName)) {
        hasDisadvantage = true
      }
    }
  }

  return { hasAdvantage, hasDisadvantage }
}

export function QuickLogForm() {
  const [activeTab, setActiveTab] = useState<ActionType>('ability_check')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const character = useStore((state) => state.character)
  const abilities = useStore((state) => state.abilities)
  const inventory = useStore((state) => state.inventory)
  const traits = useStore((state) => state.traits)

  // Form for ability check
  const abilityCheckForm = useForm<AbilityCheckForm>({
    resolver: zodResolver(abilityCheckSchema),
    defaultValues: {
      ability_name: null,
      roll_value: undefined,
      dc: null,
      had_advantage: false,
      had_disadvantage: false,
      additional_modifier: null,
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
      had_advantage: false,
      had_disadvantage: false,
      additional_modifier: null,
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
      applies_to: [],
      affected_stats: [],
      stat_modifiers: [],
      modifier: null,
      description: null,
      effects: [],
    },
  })

  const [customEffectSubEffects, setCustomEffectSubEffects] = useState<Array<{
    type: 'stat_modifier' | 'advantage' | 'disadvantage'
    applies_to?: ('ability_checks' | 'saving_throws' | 'passive_modifier')[]
    affected_stats?: string[]
    stat_modifiers?: { stat: string; modifier: number }[]
    modifier?: number | null
  }>>([])

  const [tempStatModifiers, setTempStatModifiers] = useState<Array<{ stat: string; modifier: number }>>([])
  const [currentStatName, setCurrentStatName] = useState('')
  const [currentStatModifier, setCurrentStatModifier] = useState<number | ''>('')

  const handleAbilityCheckSubmit = async (data: AbilityCheckForm) => {
    if (!character) return

    setIsSubmitting(true)
    try {
      const result = await logAbilityCheck({
        characterId: character.id,
        abilityName: data.ability_name,
        rollValue: data.roll_value,
        dc: data.dc,
        hadAdvantage: data.had_advantage,
        hadDisadvantage: data.had_disadvantage,
        additionalModifier: data.additional_modifier,
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
        hadAdvantage: data.had_advantage,
        hadDisadvantage: data.had_disadvantage,
        additionalModifier: data.additional_modifier,
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
        appliesTo: data.applies_to,
        statModifiers: data.stat_modifiers,
        affectedStats: data.affected_stats,
        modifier: data.modifier,
        description: data.description,
        effects: data.effects,
      })

      if (result.error) {
        alert('Failed to create custom effect: ' + result.error.message)
        return
      }

      // Reload data to get the new custom effect
      await loadDataFromSupabase(character.user_id)

      alert('✅ Custom effect created! It will expire at midnight.')

      // Reset form and temp state
      customEffectForm.reset()
      setTempStatModifiers([])
      setCustomEffectSubEffects([])
      setCurrentStatName('')
      setCurrentStatModifier('')
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
              onChange={(e) => {
                // Update form value
                abilityCheckForm.setValue('ability_name', e.target.value || null)
                
                // Calculate auto-fill values
                const autoFill = calculateAutoFillValues(
                  e.target.value || null,
                  'ability_checks',
                  traits,
                  inventory
                )
                
                // Update advantage/disadvantage checkboxes only
                // Additional Modifier field is reserved for manual overrides
                abilityCheckForm.setValue('had_advantage', autoFill.hasAdvantage)
                abilityCheckForm.setValue('had_disadvantage', autoFill.hasDisadvantage)
              }}
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

          {/* Advantage/Disadvantage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Advantage/Disadvantage (Optional)
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...abilityCheckForm.register('had_advantage')}
                  className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-green-400">Advantage</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...abilityCheckForm.register('had_disadvantage')}
                  className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-red-400">Disadvantage</span>
              </label>
            </div>
          </div>

          {/* Additional Modifier */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Additional Modifier (Optional)
            </label>
            <input
              type="number"
              placeholder="+2, -1, etc."
              {...abilityCheckForm.register('additional_modifier', {
                valueAsNumber: true,
              })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
            <p className="text-xs text-text-secondary mt-1">
              Extra bonus/penalty beyond ability modifiers
            </p>
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
              onChange={(e) => {
                // Update form value
                savingThrowForm.setValue('ability_name', e.target.value || null)
                
                // Calculate auto-fill values
                const autoFill = calculateAutoFillValues(
                  e.target.value || null,
                  'saving_throws',
                  traits,
                  inventory
                )
                
                // Update advantage/disadvantage checkboxes only
                // Additional Modifier field is reserved for manual overrides
                savingThrowForm.setValue('had_advantage', autoFill.hasAdvantage)
                savingThrowForm.setValue('had_disadvantage', autoFill.hasDisadvantage)
              }}
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

          {/* Advantage/Disadvantage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Advantage/Disadvantage (Optional)
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...savingThrowForm.register('had_advantage')}
                  className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-green-400">Advantage</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...savingThrowForm.register('had_disadvantage')}
                  className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-red-400">Disadvantage</span>
              </label>
            </div>
          </div>

          {/* Additional Modifier */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Additional Modifier (Optional)
            </label>
            <input
              type="number"
              placeholder="+2, -1, etc."
              {...savingThrowForm.register('additional_modifier', {
                valueAsNumber: true,
              })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
            <p className="text-xs text-text-secondary mt-1">
              Extra bonus/penalty beyond ability modifiers
            </p>
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
              placeholder="e.g., Blessed by the Moon"
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
              onChange={(e) => {
                customEffectForm.setValue('effect_type', e.target.value as any)
                // Reset other fields when type changes
                customEffectForm.setValue('stat_modifiers', [])
                customEffectForm.setValue('affected_stats', [])
                customEffectForm.setValue('modifier', null)
                customEffectForm.setValue('applies_to', [])
                setTempStatModifiers([])
                setCustomEffectSubEffects([])
              }}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            >
              <option value="stat_modifier">Stat Modifier</option>
              <option value="advantage">Advantage</option>
              <option value="disadvantage">Disadvantage</option>
              <option value="custom">Custom (Multiple Effects)</option>
            </select>
          </div>

          {/* Stat Modifier Type */}
          {customEffectForm.watch('effect_type') === 'stat_modifier' && (
            <div className="p-4 bg-bg-tertiary rounded-md border border-border space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  When does this modifier apply?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customEffectForm.watch('applies_to')?.includes('ability_checks') || false}
                      onChange={(e) => {
                        const current = customEffectForm.getValues('applies_to') || []
                        if (e.target.checked) {
                          customEffectForm.setValue('applies_to', [...current, 'ability_checks'])
                        } else {
                          customEffectForm.setValue('applies_to', current.filter(x => x !== 'ability_checks'))
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary"
                    />
                    <span className="text-sm">Ability Checks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customEffectForm.watch('applies_to')?.includes('saving_throws') || false}
                      onChange={(e) => {
                        const current = customEffectForm.getValues('applies_to') || []
                        if (e.target.checked) {
                          customEffectForm.setValue('applies_to', [...current, 'saving_throws'])
                        } else {
                          customEffectForm.setValue('applies_to', current.filter(x => x !== 'saving_throws'))
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary"
                    />
                    <span className="text-sm">Saving Throws</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customEffectForm.watch('applies_to')?.includes('passive_modifier') || false}
                      onChange={(e) => {
                        const current = customEffectForm.getValues('applies_to') || []
                        if (e.target.checked) {
                          customEffectForm.setValue('applies_to', [...current, 'passive_modifier'])
                        } else {
                          customEffectForm.setValue('applies_to', current.filter(x => x !== 'passive_modifier'))
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary"
                    />
                    <span className="text-sm">Passive Modifier (always active)</span>
                  </label>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Leave all unchecked to apply to everything
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Add Stat Modifiers
                </label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={currentStatName}
                    onChange={(e) => setCurrentStatName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-bg-primary border border-border rounded-md text-sm"
                  >
                    <option value="">Select stat/ability...</option>
                    {abilities.map((ability) => (
                      <option key={ability.id} value={ability.ability_name}>
                        {ability.ability_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={currentStatModifier}
                    onChange={(e) => setCurrentStatModifier(e.target.value ? Number(e.target.value) : '')}
                    placeholder="+2, -1, etc."
                    className="w-24 px-3 py-2 bg-bg-primary border border-border rounded-md text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStatName && currentStatModifier !== '') {
                        const newMods = [...tempStatModifiers, { stat: currentStatName, modifier: Number(currentStatModifier) }]
                        setTempStatModifiers(newMods)
                        customEffectForm.setValue('stat_modifiers', newMods)
                        setCurrentStatName('')
                        setCurrentStatModifier('')
                      }
                    }}
                    className="px-3 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 text-sm"
                  >
                    Add
                  </button>
                </div>

                {tempStatModifiers.length > 0 && (
                  <div className="space-y-1">
                    {tempStatModifiers.map((mod, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-bg-primary rounded border border-border text-sm">
                        <span>
                          {mod.modifier > 0 ? '+' : ''}{mod.modifier} <span className="uppercase">{mod.stat}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newMods = tempStatModifiers.filter((_, i) => i !== idx)
                            setTempStatModifiers(newMods)
                            customEffectForm.setValue('stat_modifiers', newMods)
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advantage/Disadvantage Type */}
          {(customEffectForm.watch('effect_type') === 'advantage' ||
            customEffectForm.watch('effect_type') === 'disadvantage') && (
            <div className="p-4 bg-bg-tertiary rounded-md border border-border space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  When does this {customEffectForm.watch('effect_type')} apply?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customEffectForm.watch('applies_to')?.includes('ability_checks') || false}
                      onChange={(e) => {
                        const current = customEffectForm.getValues('applies_to') || []
                        if (e.target.checked) {
                          customEffectForm.setValue('applies_to', [...current, 'ability_checks'])
                        } else {
                          customEffectForm.setValue('applies_to', current.filter(x => x !== 'ability_checks'))
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary"
                    />
                    <span className="text-sm">Ability Checks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customEffectForm.watch('applies_to')?.includes('saving_throws') || false}
                      onChange={(e) => {
                        const current = customEffectForm.getValues('applies_to') || []
                        if (e.target.checked) {
                          customEffectForm.setValue('applies_to', [...current, 'saving_throws'])
                        } else {
                          customEffectForm.setValue('applies_to', current.filter(x => x !== 'saving_throws'))
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary"
                    />
                    <span className="text-sm">Saving Throws</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customEffectForm.watch('applies_to')?.includes('passive_modifier') || false}
                      onChange={(e) => {
                        const current = customEffectForm.getValues('applies_to') || []
                        if (e.target.checked) {
                          customEffectForm.setValue('applies_to', [...current, 'passive_modifier'])
                        } else {
                          customEffectForm.setValue('applies_to', current.filter(x => x !== 'passive_modifier'))
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary"
                    />
                    <span className="text-sm">Passive Modifier (always active)</span>
                  </label>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Leave all unchecked to apply to everything
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Affected Stats/Abilities
                </label>
                <div className="space-y-2">
                  {abilities.map((ability) => (
                    <label key={ability.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customEffectForm.watch('affected_stats')?.includes(ability.ability_name) || false}
                        onChange={(e) => {
                          const current = customEffectForm.getValues('affected_stats') || []
                          if (e.target.checked) {
                            customEffectForm.setValue('affected_stats', [...current, ability.ability_name])
                          } else {
                            customEffectForm.setValue('affected_stats', current.filter(x => x !== ability.ability_name))
                          }
                        }}
                        className="w-4 h-4 rounded border-border bg-bg-tertiary"
                      />
                      <span className="text-sm uppercase">{ability.ability_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Flat Modifier (Optional)
                </label>
                <input
                  type="number"
                  {...customEffectForm.register('modifier', {
                    setValueAs: (v) => v === '' || v === null ? null : Number(v)
                  })}
                  placeholder="+1, -2, etc."
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Additional bonus/penalty along with {customEffectForm.watch('effect_type')}
                </p>
              </div>
            </div>
          )}

          {/* Custom Type - Multiple Effects */}
          {customEffectForm.watch('effect_type') === 'custom' && (
            <div className="p-4 bg-bg-tertiary rounded-md border border-border space-y-3">
              <div className="text-sm text-accent-secondary mb-2">
                Create multiple effects under one custom effect (expires at midnight)
              </div>
              
              <div className="text-sm text-text-secondary">
                Custom effects allow you to combine multiple modifiers, advantage/disadvantage effects, etc. into a single temporary buff or debuff.
              </div>

              <div className="text-sm text-text-secondary italic">
                Note: Custom type with multiple sub-effects is complex. For now, use individual Stat Modifier or Advantage/Disadvantage effects.
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
              placeholder="Additional details about this effect..."
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
