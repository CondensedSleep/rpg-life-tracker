import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DraggableTagProps {
  id: string
  label: string
  category: string
  color?: string
}

function DraggableTag({ id, label, category, color }: DraggableTagProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: 'tag', category, label }
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "inline-block cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <Badge 
        variant="outline" 
        className={cn(
          "px-3 py-1 text-sm font-medium border-2 hover:shadow-md transition-shadow",
          color
        )}
      >
        {label}
      </Badge>
    </div>
  )
}

export function TagPalette() {
  const rollTypes = [
    { id: 'tag-ability_check', label: 'Ability Check' },
    { id: 'tag-saving_throw', label: 'Saving Throw' },
    { id: 'tag-attack', label: 'Attack' },
    { id: 'tag-damage', label: 'Damage' },
    { id: 'tag-initiative', label: 'Initiative' }
  ]

  const coreStats = [
    { id: 'tag-body', label: 'Body' },
    { id: 'tag-mind', label: 'Mind' },
    { id: 'tag-heart', label: 'Heart' },
    { id: 'tag-soul', label: 'Soul' }
  ]

  const abilities = [
    { id: 'tag-nutrition', label: 'Nutrition' },
    { id: 'tag-strength', label: 'Strength' },
    { id: 'tag-agility', label: 'Agility' },
    { id: 'tag-sex', label: 'Sex' },
    { id: 'tag-language', label: 'Language' },
    { id: 'tag-literature', label: 'Literature' },
    { id: 'tag-research', label: 'Research' },
    { id: 'tag-openness', label: 'Openness' },
    { id: 'tag-empathy', label: 'Empathy' },
    { id: 'tag-love', label: 'Love' },
    { id: 'tag-expression', label: 'Expression' },
    { id: 'tag-drive', label: 'Drive' },
    { id: 'tag-mindfulness', label: 'Mindfulness' },
    { id: 'tag-nature', label: 'Nature' },
    { id: 'tag-creation', label: 'Creation' },
    { id: 'tag-honesty', label: 'Honesty' }
  ]

  const operators = [
    { id: 'op-and', label: 'AND', color: 'border-blue-500 text-blue-700' },
    { id: 'op-or', label: 'OR', color: 'border-green-500 text-green-700' },
    { id: 'op-not', label: 'NOT', color: 'border-red-500 text-red-700' }
  ]

  const effectTags = [
    { id: 'effect-advantage', label: 'Advantage', color: 'border-emerald-500 text-emerald-700' },
    { id: 'effect-disadvantage', label: 'Disadvantage', color: 'border-orange-500 text-orange-700' },
    { id: 'effect-d4', label: '+d4', color: 'border-purple-500 text-purple-700' },
    { id: 'effect-d6', label: '+d6', color: 'border-purple-500 text-purple-700' },
    { id: 'effect-d8', label: '+d8', color: 'border-purple-500 text-purple-700' },
    { id: 'effect-d10', label: '+d10', color: 'border-purple-500 text-purple-700' },
    { id: 'effect-d12', label: '+d12', color: 'border-purple-500 text-purple-700' },
    { id: 'effect-active-modifier', label: 'Active Modifier', color: 'border-pink-500 text-pink-700' }
  ]

  return (
    <div className="space-y-4 p-4 bg-card border-2 border-subtle rounded">
      <h3 className="text-sm font-bold text-primary">Tag Palette</h3>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-secondary mb-2">Roll Types</p>
          <div className="flex flex-wrap gap-2">
            {rollTypes.map(tag => (
              <DraggableTag key={tag.id} id={tag.id} label={tag.label} category="rollType" />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-secondary mb-2">Core Stats</p>
          <div className="flex flex-wrap gap-2">
            {coreStats.map(tag => (
              <DraggableTag key={tag.id} id={tag.id} label={tag.label} category="coreStat" />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-secondary mb-2">Abilities</p>
          <div className="flex flex-wrap gap-2">
            {abilities.map(tag => (
              <DraggableTag key={tag.id} id={tag.id} label={tag.label} category="ability" />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-secondary mb-2">Logical Operators</p>
          <div className="flex flex-wrap gap-2">
            {operators.map(tag => (
              <DraggableTag key={tag.id} id={tag.id} label={tag.label} category="operator" color={tag.color} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-secondary mb-2">Effect Tags</p>
          <div className="flex flex-wrap gap-2">
            {effectTags.map(tag => (
              <DraggableTag key={tag.id} id={tag.id} label={tag.label} category="effect" color={tag.color} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
