import { UseFormReturn } from 'react-hook-form'
import type { TraitFormValues } from '@/lib/validations'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const effectType = form.watch('mechanical_effect.type')

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-bg-tertiary">
      <h3 className="font-semibold">Mechanical Effect (Optional)</h3>

      {/* Effect Type */}
      <div>
        <Label htmlFor="effect-type">Effect Type</Label>
        <Select
          value={effectType || ''}
          onValueChange={(value) => {
            if (value === 'none') {
              form.setValue('mechanical_effect', null)
            } else {
              form.setValue('mechanical_effect.type', value as any)
            }
          }}
        >
          <SelectTrigger id="effect-type">
            <SelectValue placeholder="Select effect type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Effect</SelectItem>
            <SelectItem value="stat_modifier">Stat Modifier</SelectItem>
            <SelectItem value="advantage">Advantage</SelectItem>
            <SelectItem value="disadvantage">Disadvantage</SelectItem>
            <SelectItem value="rest">Rest Bonus</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show additional fields based on type */}
      {effectType && effectType !== 'none' && (
        <>
          {/* Affected Stat (single or multiple) */}
          <div>
            <Label htmlFor="affected-stat">Affected Stat(s)</Label>
            <Input
              id="affected-stat"
              placeholder="e.g., creation, expression (comma-separated)"
              {...form.register('mechanical_effect.stat')}
              onChange={(e) => {
                const value = e.target.value
                // If contains comma, split into array for stats field
                if (value.includes(',')) {
                  const stats = value.split(',').map(s => s.trim())
                  form.setValue('mechanical_effect.stats', stats)
                  form.setValue('mechanical_effect.stat', undefined)
                } else {
                  form.setValue('mechanical_effect.stat', value)
                  form.setValue('mechanical_effect.stats', undefined)
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
              <Label htmlFor="modifier">Modifier Value</Label>
              <Input
                id="modifier"
                type="number"
                placeholder="e.g., 2 or -2"
                {...form.register('mechanical_effect.modifier', {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}

          {/* Condition */}
          <div>
            <Label htmlFor="condition">Condition (Optional)</Label>
            <Input
              id="condition"
              placeholder="e.g., drive > 0"
              {...form.register('mechanical_effect.condition')}
            />
            <p className="text-xs text-text-secondary mt-1">
              When this condition is true, the effect applies
            </p>
          </div>

          {/* Custom Description (for custom type) */}
          {effectType === 'custom' && (
            <div>
              <Label htmlFor="effect-description">Effect Description</Label>
              <Input
                id="effect-description"
                placeholder="Describe the custom effect"
                {...form.register('mechanical_effect.description')}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
