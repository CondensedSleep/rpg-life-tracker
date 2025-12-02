import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { InventoryFormValues } from '@/lib/validations'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PassiveEffectBuilderProps {
  form: UseFormReturn<InventoryFormValues>
}

// All available abilities
const ABILITIES = [
  'nutrition', 'strength', 'agility', 'sex',
  'language', 'literature', 'research', 'openness',
  'empathy', 'love', 'expression', 'drive',
  'mindfulness', 'nature', 'creation', 'honesty',
]

export function PassiveEffectBuilder({ form }: PassiveEffectBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'passive_effect',
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
        <h3 className="font-semibold">Passive Effects (Optional)</h3>
        <Button type="button" size="sm" variant="outline" onClick={addEffect}>
          <Plus className="w-4 h-4 mr-1" />
          Add Effect
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-text-secondary p-4 border border-border rounded-lg bg-bg-tertiary">
          No effects added. Click "Add Effect" to add passive effects to this item.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const effectType = form.watch(`passive_effect.${index}.type`)
            const affectedStats = form.watch(`passive_effect.${index}.affected_stats`) || []
            const statModifiers = form.watch(`passive_effect.${index}.stat_modifiers`) || []

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
                  <Label htmlFor={`passive-effect-type-${index}`}>Effect Type</Label>
                  <Select
                    value={effectType || ''}
                    onValueChange={(value) => {
                      form.setValue(`passive_effect.${index}.type`, value as any)
                      // Reset fields when type changes
                      form.setValue(`passive_effect.${index}.stat_modifiers`, [])
                      form.setValue(`passive_effect.${index}.affected_stats`, [])
                      form.setValue(`passive_effect.${index}.modifier`, undefined)
                    }}
                  >
                    <SelectTrigger id={`passive-effect-type-${index}`}>
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
                          form.setValue(`passive_effect.${index}.stat_modifiers`, [
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
                                value={form.watch(`passive_effect.${index}.stat_modifiers.${modIndex}.stat`) || ''}
                                onValueChange={(value) =>
                                  form.setValue(`passive_effect.${index}.stat_modifiers.${modIndex}.stat`, value)
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
                                {...form.register(`passive_effect.${index}.stat_modifiers.${modIndex}.modifier`, {
                                  valueAsNumber: true,
                                })}
                              />
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const current = form.getValues(`passive_effect.${index}.stat_modifiers`) || []
                                form.setValue(
                                  `passive_effect.${index}.stat_modifiers`,
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
                              form.setValue(`passive_effect.${index}.affected_stats`, [...current, value])
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
                                    const current = form.getValues(`passive_effect.${index}.affected_stats`) || []
                                    form.setValue(
                                      `passive_effect.${index}.affected_stats`,
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
                      <Label htmlFor={`passive-modifier-${index}`}>Flat Modifier (Optional)</Label>
                      <Input
                        id={`passive-modifier-${index}`}
                        type="number"
                        placeholder="e.g., +2 or -1"
                        {...form.register(`passive_effect.${index}.modifier`, {
                          valueAsNumber: true,
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
                    <Label htmlFor={`passive-description-${index}`}>
                      Effect Description
                    </Label>
                    <Input
                      id={`passive-description-${index}`}
                      placeholder="Describe the custom effect"
                      {...form.register(`passive_effect.${index}.description`)}
                    />
                  </div>
                )}

                {/* Condition (for all types except custom) */}
                {effectType && effectType !== 'custom' && (
                  <div>
                    <Label htmlFor={`passive-condition-${index}`}>
                      Condition (Optional)
                    </Label>
                    <Input
                      id={`passive-condition-${index}`}
                      placeholder="e.g., nutrition > 0"
                      {...form.register(`passive_effect.${index}.condition`)}
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      When this condition is true, the effect applies
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
