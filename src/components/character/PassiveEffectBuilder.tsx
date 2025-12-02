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
import { Plus, Trash2 } from 'lucide-react'

interface PassiveEffectBuilderProps {
  form: UseFormReturn<InventoryFormValues>
}

// All available abilities
const ABILITIES = [
  'nutrition',
  'strength',
  'agility',
  'sex',
  'language',
  'literature',
  'research',
  'openness',
  'empathy',
  'love',
  'expression',
  'drive',
  'mindfulness',
  'nature',
  'creation',
  'honesty',
]

export function PassiveEffectBuilder({ form }: PassiveEffectBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'passive_effect',
  })

  const addEffect = () => {
    append({
      type: 'advantage',
      stat: '',
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
                    onValueChange={(value) =>
                      form.setValue(`passive_effect.${index}.type`, value as any)
                    }
                  >
                    <SelectTrigger id={`passive-effect-type-${index}`}>
                      <SelectValue placeholder="Select effect type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advantage">Advantage</SelectItem>
                      <SelectItem value="disadvantage">Disadvantage</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Affected Stat */}
                <div>
                  <Label htmlFor={`passive-stat-${index}`}>Affected Stat</Label>
                  <Select
                    value={form.watch(`passive_effect.${index}.stat`) || ''}
                    onValueChange={(value) =>
                      form.setValue(`passive_effect.${index}.stat`, value)
                    }
                  >
                    <SelectTrigger id={`passive-stat-${index}`}>
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

                {/* Modifier Value (optional for advantage/disadvantage) */}
                {effectType !== 'custom' && (
                  <div>
                    <Label htmlFor={`passive-modifier-${index}`}>
                      Modifier Value (Optional)
                    </Label>
                    <Input
                      id={`passive-modifier-${index}`}
                      type="number"
                      placeholder="e.g., -1"
                      {...form.register(`passive_effect.${index}.modifier`, {
                        valueAsNumber: true,
                      })}
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Additional modifier beyond advantage/disadvantage
                    </p>
                  </div>
                )}

                {/* Condition */}
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

                {/* Custom Description */}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
