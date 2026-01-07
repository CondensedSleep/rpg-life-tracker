import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

const ABILITIES = [
  'nutrition', 'strength', 'agility', 'sex',
  'language', 'literature', 'research', 'openness',
  'empathy', 'love', 'expression', 'drive',
  'mindfulness', 'nature', 'creation', 'honesty'
]

interface PassiveModifier {
  ability: string
  value: number
}

interface PassiveModifiersBuilderProps {
  value: PassiveModifier[]
  onChange: (modifiers: PassiveModifier[]) => void
}

export function PassiveModifiersBuilder({ value, onChange }: PassiveModifiersBuilderProps) {
  const [newAbility, setNewAbility] = useState<string>('')
  const [newValue, setNewValue] = useState<string>('')

  function addModifier() {
    if (!newAbility || !newValue) return

    const modifier: PassiveModifier = {
      ability: newAbility,
      value: parseInt(newValue, 10) || 0
    }

    onChange([...value, modifier])
    setNewAbility('')
    setNewValue('')
  }

  function removeModifier(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateModifier(index: number, field: 'ability' | 'value', newFieldValue: string) {
    const updated = [...value]
    if (field === 'ability') {
      updated[index] = { ...updated[index], ability: newFieldValue }
    } else {
      updated[index] = { ...updated[index], value: parseInt(newFieldValue, 10) || 0 }
    }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Passive modifiers are always-on ability bonuses (when condition is met)
      </div>

      {/* Existing Modifiers */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((modifier, index) => (
            <div key={index} className="flex items-center gap-2 bg-secondary/50 rounded p-2">
              <Select
                value={modifier.ability}
                onValueChange={(v) => updateModifier(index, 'ability', v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABILITIES.map(ability => (
                    <SelectItem key={ability} value={ability}>
                      {ability}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={modifier.value}
                onChange={(e) => updateModifier(index, 'value', e.target.value)}
                className="w-20"
                placeholder="±0"
              />

              <Badge variant={modifier.value >= 0 ? 'default' : 'destructive'} className="ml-2">
                {modifier.value >= 0 ? '+' : ''}{modifier.value}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeModifier(index)}
                className="h-8 w-8 p-0 ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Modifier */}
      <div className="flex gap-2">
        <Select value={newAbility} onValueChange={setNewAbility}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select ability..." />
          </SelectTrigger>
          <SelectContent>
            {ABILITIES.map(ability => (
              <SelectItem key={ability} value={ability}>
                {ability}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="±0"
          className="w-24"
        />

        <Button onClick={addModifier} disabled={!newAbility || !newValue} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
          No passive modifiers - this effect doesn't modify ability values
        </p>
      )}
    </div>
  )
}
