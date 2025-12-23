import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { TraitFormValues } from '@/lib/validations'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MechanicalEffectBuilderProps {
  form: UseFormReturn<TraitFormValues>
}

// All available abilities
const ABILITIES = [
  'nutrition', 'strength', 'agility', 'sex',
  'language', 'literature', 'research', 'openness',
  'empathy', 'love', 'expression', 'drive',
  'mindfulness', 'nature', 'creation', 'honesty',
]

export function MechanicalEffectBuilder({ form }: MechanicalEffectBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'mechanical_effect',
  })

  const addEffect = () => {
    append({
      type: 'stat_modifier',
      stat_modifiers: [],
      affected_stats: [],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Mechanical Effects (Optional)</h3>
        <Button type="button" size="sm" variant="outline" onClick={addEffect}>
          <Plus className="w-4 h-4 mr-1" />
          Add Effect
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-text-secondary p-4 border border-border rounded-lg bg-bg-tertiary">
          No effects added. Click "Add Effect" to add mechanical effects to this trait.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const effectType = form.watch(`mechanical_effect.${index}.type`)
            const affectedStats = form.watch(`mechanical_effect.${index}.affected_stats`) || []
            const statModifiers = form.watch(`mechanical_effect.${index}.stat_modifiers`) || []
            const appliesTo = form.watch(`mechanical_effect.${index}.applies_to`) || []

            return (
              <div
                key={field.id}
                className="space-y-4 p-4 border border-border rounded-lg bg-bg-tertiary frosted-sm"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Effect {index + 1}</h4>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Effect Type */}
                <div>
                  <Label htmlFor={`effect-type-${index}`}>Effect Type</Label>
                  <Select
                    value={effectType || ''}
                    onValueChange={(value) => {
                      form.setValue(`mechanical_effect.${index}.type`, value as any)
                      // Reset fields when type changes
                      form.setValue(`mechanical_effect.${index}.stat_modifiers`, [])
                      form.setValue(`mechanical_effect.${index}.affected_stats`, [])
                      form.setValue(`mechanical_effect.${index}.modifier`, undefined)
                    }}
                  >
                    <SelectTrigger id={`effect-type-${index}`}>
                      <SelectValue placeholder="Select effect type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stat_modifier">Stat Modifier</SelectItem>
                      <SelectItem value="advantage">Advantage</SelectItem>
                      <SelectItem value="disadvantage">Disadvantage</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Applies To - Show for stat_modifier, advantage, and disadvantage */}
                {(effectType === 'stat_modifier' || effectType === 'advantage' || effectType === 'disadvantage') && (
                  <div className="space-y-2">
                    <Label>Applies To (Optional - defaults to all)</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`applies-ability-checks-${index}`}
                          checked={appliesTo.includes('ability_checks')}
                          onCheckedChange={(checked) => {
                            const current = appliesTo || []
                            if (checked) {
                              form.setValue(`mechanical_effect.${index}.applies_to`, [...current, 'ability_checks'])
                            } else {
                              form.setValue(`mechanical_effect.${index}.applies_to`, current.filter((v: string) => v !== 'ability_checks'))
                            }
                          }}
                        />
                        <label
                          htmlFor={`applies-ability-checks-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Ability Checks
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`applies-saving-throws-${index}`}
                          checked={appliesTo.includes('saving_throws')}
                          onCheckedChange={(checked) => {
                            const current = appliesTo || []
                            if (checked) {
                              form.setValue(`mechanical_effect.${index}.applies_to`, [...current, 'saving_throws'])
                            } else {
                              form.setValue(`mechanical_effect.${index}.applies_to`, current.filter((v: string) => v !== 'saving_throws'))
                            }
                          }}
                        />
                        <label
                          htmlFor={`applies-saving-throws-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Saving Throws
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`applies-passive-modifier-${index}`}
                          checked={appliesTo.includes('passive_modifier')}
                          onCheckedChange={(checked) => {
                            const current = appliesTo || []
                            if (checked) {
                              form.setValue(`mechanical_effect.${index}.applies_to`, [...current, 'passive_modifier'])
                            } else {
                              form.setValue(`mechanical_effect.${index}.applies_to`, current.filter((v: string) => v !== 'passive_modifier'))
                            }
                          }}
                        />
                        <label
                          htmlFor={`applies-passive-modifier-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Passive Ability Modifier
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary">
                      If no options selected, effect applies to all roll types
                    </p>
                  </div>
                )}

                {/* STAT MODIFIER TYPE */}
                {effectType === 'stat_modifier' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Stat Modifiers (Required)</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const current = statModifiers || []
                          form.setValue(`mechanical_effect.${index}.stat_modifiers`, [
                            ...current,
                            { stat: '', modifier: 0 },
                          ])
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Stat
                      </Button>
                    </div>

                    {statModifiers.length === 0 ? (
                      <p className="text-xs text-text-secondary italic">
                        No stat modifiers added. Click "Add Stat" to add modifiers.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {statModifiers.map((_, modIndex) => (
                          <div key={modIndex} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs">Stat</Label>
                              <Select
                                value={form.watch(`mechanical_effect.${index}.stat_modifiers.${modIndex}.stat`) || ''}
                                onValueChange={(value) =>
                                  form.setValue(`mechanical_effect.${index}.stat_modifiers.${modIndex}.stat`, value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ABILITIES.map((ability) => (
                                    <SelectItem key={ability} value={ability}>
                                      {ability}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-24">
                              <Label className="text-xs">Modifier</Label>
                              <Input
                                type="number"
                                placeholder="±#"
                                {...form.register(`mechanical_effect.${index}.stat_modifiers.${modIndex}.modifier`, {
                                  valueAsNumber: true,
                                })}
                              />
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const current = form.getValues(`mechanical_effect.${index}.stat_modifiers`) || []
                                form.setValue(
                                  `mechanical_effect.${index}.stat_modifiers`,
                                  current.filter((_, i) => i !== modIndex)
                                )
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ADVANTAGE / DISADVANTAGE TYPE */}
                {(effectType === 'advantage' || effectType === 'disadvantage') && (
                  <div className="space-y-3">
                    <div>
                      <Label>Affected Stats (Required)</Label>
                      <div className="mt-2 space-y-2">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            const current = affectedStats || []
                            if (!current.includes(value)) {
                              form.setValue(`mechanical_effect.${index}.affected_stats`, [...current, value])
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stat to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {ABILITIES.filter((a) => !affectedStats.includes(a)).map((ability) => (
                              <SelectItem key={ability} value={ability}>
                                {ability}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {affectedStats.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {affectedStats.map((stat: string, statIndex: number) => (
                              <Badge key={statIndex} variant="secondary" className="gap-1">
                                {stat}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = form.getValues(`mechanical_effect.${index}.affected_stats`) || []
                                    form.setValue(
                                      `mechanical_effect.${index}.affected_stats`,
                                      current.filter((_, i) => i !== statIndex)
                                    )
                                  }}
                                  className="ml-1 hover:text-accent-primary"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`modifier-${index}`}>Flat Modifier (Optional)</Label>
                      <Input
                        id={`modifier-${index}`}
                        type="number"
                        placeholder="e.g., +2 or -1"
                        {...form.register(`mechanical_effect.${index}.modifier`, {
                          setValueAs: (v) => v === '' || v === null ? undefined : Number(v),
                        })}
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        Additional modifier beyond advantage/disadvantage
                      </p>
                    </div>
                  </div>
                )}

                {/* CUSTOM TYPE */}
                {effectType === 'custom' && (
                  <div>
                    <Label htmlFor={`effect-description-${index}`}>
                      Effect Description
                    </Label>
                    <Input
                      id={`effect-description-${index}`}
                      placeholder="Describe the custom effect"
                      {...form.register(`mechanical_effect.${index}.description`)}
                    />
                  </div>
                )}

                {/* Condition (for all types except custom) */}
                {effectType && effectType !== 'custom' && (
                  <div>
                    <Label htmlFor={`condition-${index}`}>
                      Condition <span className="text-text-secondary">(determines if trait is active)</span>
                    </Label>
                    <Input
                      id={`condition-${index}`}
                      placeholder="e.g., drive > 0, always"
                      {...form.register(`mechanical_effect.${index}.condition`)}
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Trait is active when this condition is true. Use "always" for traits that are always active, or expressions like "drive &gt; 0"
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
