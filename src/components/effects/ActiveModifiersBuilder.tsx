import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

type ActiveModifierType = 'advantage' | 'disadvantage' | 'bonus'

interface ActiveModifier {
  type: ActiveModifierType
  value?: number  // Only for 'bonus' type
}

interface ActiveModifiersBuilderProps {
  value: ActiveModifier[]
  onChange: (modifiers: ActiveModifier[]) => void
}

export function ActiveModifiersBuilder({ value, onChange }: ActiveModifiersBuilderProps) {
  const [bonusValue, setBonusValue] = useState<string>('')

  const hasAdvantage = value.some(m => m.type === 'advantage')
  const hasDisadvantage = value.some(m => m.type === 'disadvantage')
  const bonuses = value.filter(m => m.type === 'bonus')

  function toggleAdvantage() {
    if (hasAdvantage) {
      onChange(value.filter(m => m.type !== 'advantage'))
    } else {
      onChange([...value, { type: 'advantage' }])
    }
  }

  function toggleDisadvantage() {
    if (hasDisadvantage) {
      onChange(value.filter(m => m.type !== 'disadvantage'))
    } else {
      onChange([...value, { type: 'disadvantage' }])
    }
  }

  function addBonus() {
    const val = parseInt(bonusValue, 10)
    if (isNaN(val) || val === 0) return

    onChange([...value, { type: 'bonus', value: val }])
    setBonusValue('')
  }

  function removeBonus(index: number) {
    const bonusIndex = value.findIndex((m, i) => m.type === 'bonus' && 
      value.slice(0, i + 1).filter(x => x.type === 'bonus').length === index + 1
    )
    if (bonusIndex !== -1) {
      onChange(value.filter((_, i) => i !== bonusIndex))
    }
  }

  // Check for conflicts
  const hasConflict = hasAdvantage && hasDisadvantage

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Active modifiers apply during rolls when context matches
      </div>

      {/* Advantage/Disadvantage Toggle */}
      <div className="flex gap-2">
        <Button
          variant={hasAdvantage ? 'default' : 'outline'}
          size="sm"
          onClick={toggleAdvantage}
          className="flex-1"
        >
          {hasAdvantage ? '✓ ' : ''}Advantage
        </Button>
        <Button
          variant={hasDisadvantage ? 'destructive' : 'outline'}
          size="sm"
          onClick={toggleDisadvantage}
          className="flex-1"
        >
          {hasDisadvantage ? '✓ ' : ''}Disadvantage
        </Button>
      </div>

      {/* Conflict Warning */}
      {hasConflict && (
        <div className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
          ⚠️ Both advantage and disadvantage are active - they will cancel each other out per D&D rules
        </div>
      )}

      {/* Bonus Modifiers */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Numeric Bonuses</div>
        
        {bonuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bonuses.map((bonus, index) => (
              <div key={index} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                <Badge variant={bonus.value && bonus.value >= 0 ? 'default' : 'destructive'}>
                  {bonus.value && bonus.value >= 0 ? '+' : ''}{bonus.value || 0}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBonus(index)}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="number"
            value={bonusValue}
            onChange={(e) => setBonusValue(e.target.value)}
            placeholder="±0"
            className="w-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addBonus()
              }
            }}
          />
          <Button onClick={addBonus} disabled={!bonusValue || bonusValue === '0'} size="sm">
            Add Bonus
          </Button>
        </div>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
          No active modifiers - this effect doesn't affect rolls
        </p>
      )}

      {/* Summary */}
      {value.length > 0 && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Summary:</strong> This effect grants
          {hasAdvantage && ' advantage'}
          {hasAdvantage && hasDisadvantage && ' and'}
          {hasDisadvantage && ' disadvantage'}
          {bonuses.length > 0 && (hasAdvantage || hasDisadvantage) && ', plus'}
          {bonuses.length > 0 && ` ${bonuses.map(b => (b.value && b.value >= 0 ? '+' : '') + (b.value || 0)).join(', ')}`}
          {' when context matches'}
        </div>
      )}
    </div>
  )
}
