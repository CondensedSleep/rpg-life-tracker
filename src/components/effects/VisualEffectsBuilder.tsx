import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PassiveModifier {
  ability: string
  value: number
}

interface ActiveModifier {
  type: string
  value?: number
}

interface VisualEffectsBuilderProps {
  passiveModifiers: PassiveModifier[]
  activeModifiers: ActiveModifier[]
  onPassiveModifiersChange: (modifiers: PassiveModifier[]) => void
  onActiveModifiersChange: (modifiers: ActiveModifier[]) => void
}

export function VisualEffectsBuilder({
  passiveModifiers,
  activeModifiers,
  onPassiveModifiersChange,
  onActiveModifiersChange
}: VisualEffectsBuilderProps) {
  const { setNodeRef: setPassiveRef, isOver: isOverPassive } = useDroppable({
    id: 'passive-effects-zone',
    data: { type: 'passive-effects' }
  })

  const { setNodeRef: setActiveRef, isOver: isOverActive } = useDroppable({
    id: 'active-effects-zone',
    data: { type: 'active-effects' }
  })

  const handlePassiveValueChange = (index: number, value: number) => {
    const updated = [...passiveModifiers]
    updated[index].value = value
    onPassiveModifiersChange(updated)
  }

  const handleActiveValueChange = (index: number, value: number) => {
    const updated = [...activeModifiers]
    updated[index].value = value
    onActiveModifiersChange(updated)
  }

  const handleDeletePassive = (index: number) => {
    onPassiveModifiersChange(passiveModifiers.filter((_, i) => i !== index))
  }

  const handleDeleteActive = (index: number) => {
    onActiveModifiersChange(activeModifiers.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Passive Modifiers Section */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          Passive Modifiers (applies when Condition is met)
        </Label>
        <div
          ref={setPassiveRef}
          className={cn(
            "min-h-[120px] border-2 border-dashed rounded-md p-4 transition-colors",
            isOverPassive ? "border-red bg-red/10" : "border-subtle"
          )}
        >
          {passiveModifiers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Drag ability tags here to create passive modifiers
            </p>
          ) : (
            <div className="space-y-3">
              {passiveModifiers.map((mod, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-card border border-subtle rounded">
                  <Badge variant="secondary" className="capitalize">
                    {mod.ability}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Value:</Label>
                    <Input
                      type="number"
                      value={mod.value}
                      onChange={(e) => handlePassiveValueChange(index, parseInt(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePassive(index)}
                    className="ml-auto h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Effects Section */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          Active Effects (applies when Context is met)
        </Label>
        <div
          ref={setActiveRef}
          className={cn(
            "min-h-[120px] border-2 border-dashed rounded-md p-4 transition-colors",
            isOverActive ? "border-red bg-red/10" : "border-subtle"
          )}
        >
          {activeModifiers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Drag effect tags here (Advantage, +d4, Active Modifier, etc.)
            </p>
          ) : (
            <div className="space-y-3">
              {activeModifiers.map((mod, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-card border border-subtle rounded">
                  <Badge 
                    variant="secondary"
                    className={cn(
                      mod.type === 'ADVANTAGE' && "border-emerald-500 text-emerald-700",
                      mod.type === 'DISADVANTAGE' && "border-orange-500 text-orange-700",
                      mod.type === 'STAT_MODIFIER' && "border-pink-500 text-pink-700",
                      mod.type.startsWith('BONUS_') && "border-purple-500 text-purple-700"
                    )}
                  >
                    {mod.type === 'ADVANTAGE' && 'Advantage'}
                    {mod.type === 'DISADVANTAGE' && 'Disadvantage'}
                    {mod.type === 'STAT_MODIFIER' && 'Active Modifier'}
                    {mod.type === 'BONUS_D4' && '+d4'}
                    {mod.type === 'BONUS_D6' && '+d6'}
                    {mod.type === 'BONUS_D8' && '+d8'}
                    {mod.type === 'BONUS_D10' && '+d10'}
                    {mod.type === 'BONUS_D12' && '+d12'}
                  </Badge>

                  {mod.type === 'STAT_MODIFIER' && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Value:</Label>
                      <Input
                        type="number"
                        value={mod.value || 0}
                        onChange={(e) => handleActiveValueChange(index, parseInt(e.target.value) || 0)}
                        className="w-20 h-8"
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteActive(index)}
                    className="ml-auto h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
