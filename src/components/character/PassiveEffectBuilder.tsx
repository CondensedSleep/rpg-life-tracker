import type { UseFormReturn } from 'react-hook-form'
import type { InventoryFormValues } from '@/lib/validations'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const effectType = form.watch('passive_effect.type')

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-bg-tertiary">
      <h3 className="font-semibold">Passive Effect (Optional)</h3>

      {/* Effect Type */}
      <div>
        <Label htmlFor="passive-effect-type">Effect Type</Label>
        <Select
          value={effectType || ''}
          onValueChange={(value) => {
            if (value === 'none') {
              form.setValue('passive_effect', null)
            } else {
              form.setValue('passive_effect.type', value as any)
            }
          }}
        >
          <SelectTrigger id="passive-effect-type">
            <SelectValue placeholder="Select effect type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Effect</SelectItem>
            <SelectItem value="advantage">Advantage</SelectItem>
            <SelectItem value="disadvantage">Disadvantage</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show additional fields based on type */}
      {effectType && effectType !== 'none' && (
        <>
          {/* Affected Stat */}
          <div>
            <Label htmlFor="passive-stat">Affected Stat</Label>
            <Select
              value={form.watch('passive_effect.stat') || ''}
              onValueChange={(value) => form.setValue('passive_effect.stat', value)}
            >
              <SelectTrigger id="passive-stat">
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
              <Label htmlFor="passive-modifier">Modifier Value (Optional)</Label>
              <Input
                id="passive-modifier"
                type="number"
                placeholder="e.g., -1"
                {...form.register('passive_effect.modifier', {
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
            <Label htmlFor="passive-condition">Condition (Optional)</Label>
            <Input
              id="passive-condition"
              placeholder="e.g., nutrition > 0"
              {...form.register('passive_effect.condition')}
            />
            <p className="text-xs text-text-secondary mt-1">
              When this condition is true, the effect applies
            </p>
          </div>

          {/* Custom Description */}
          {effectType === 'custom' && (
            <div>
              <Label htmlFor="passive-description">Effect Description</Label>
              <Input
                id="passive-description"
                placeholder="Describe the custom effect"
                {...form.register('passive_effect.description')}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
