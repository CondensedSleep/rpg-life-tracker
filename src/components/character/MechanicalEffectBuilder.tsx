import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { TraitFormValues } from '@/lib/validations'
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
import { Plus, Trash2 } from 'lucide-react'

interface MechanicalEffectBuilderProps {
  form: UseFormReturn<TraitFormValues>
}

// All available abilities grouped by core stat
const ABILITIES = [
  // Body
  'nutrition', 'strength', 'agility', 'sex',
  // Mind
  'language', 'literature', 'research', 'openness',
  // Heart
  'empathy', 'love', 'expression', 'drive',
  // Soul
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
      stat: '',
      modifier: 0,
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
                    onValueChange={(value) =>
                      form.setValue(`mechanical_effect.${index}.type`, value as any)
                    }
                  >
                    <SelectTrigger id={`effect-type-${index}`}>
                      <SelectValue placeholder="Select effect type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stat_modifier">Stat Modifier</SelectItem>
                      <SelectItem value="advantage">Advantage</SelectItem>
                      <SelectItem value="disadvantage">Disadvantage</SelectItem>
                      <SelectItem value="rest">Rest Bonus</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Affected Stat (single or multiple) */}
                <div>
                  <Label htmlFor={`affected-stat-${index}`}>Affected Stat(s)</Label>
                  <Input
                    id={`affected-stat-${index}`}
                    placeholder="e.g., creation, expression (comma-separated)"
                    {...form.register(`mechanical_effect.${index}.stat`)}
                    onChange={(e) => {
                      const value = e.target.value
                      // If contains comma, split into array for stats field
                      if (value.includes(',')) {
                        const stats = value.split(',').map((s) => s.trim())
                        form.setValue(`mechanical_effect.${index}.stats`, stats)
                        form.setValue(`mechanical_effect.${index}.stat`, undefined)
                      } else {
                        form.setValue(`mechanical_effect.${index}.stat`, value)
                        form.setValue(`mechanical_effect.${index}.stats`, undefined)
                      }
                    }}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Available abilities: {ABILITIES.join(', ')}
                  </p>
                </div>

                {/* Modifier Value (for stat_modifier type) */}
                {effectType === 'stat_modifier' && (
                  <div>
                    <Label htmlFor={`modifier-${index}`}>Modifier Value</Label>
                    <Input
                      id={`modifier-${index}`}
                      type="number"
                      placeholder="e.g., 2 or -2"
                      {...form.register(`mechanical_effect.${index}.modifier`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                )}

                {/* Condition */}
                <div>
                  <Label htmlFor={`condition-${index}`}>Condition (Optional)</Label>
                  <Input
                    id={`condition-${index}`}
                    placeholder="e.g., drive > 0"
                    {...form.register(`mechanical_effect.${index}.condition`)}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    When this condition is true, the effect applies
                  </p>
                </div>

                {/* Custom Description (for custom type) */}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
