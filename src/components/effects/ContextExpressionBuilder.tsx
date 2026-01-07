import { useState } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Plus, GripVertical } from 'lucide-react'
import type { ContextNode, LogicalOperator, TagReference } from '@/types/contextExpressions'
import { CONTEXT_PRESETS, expressionToString, validateContextExpression } from '@/types/contextExpressions'

// Available tags for building expressions
const ROLL_TYPES = ['ability_check', 'saving_throw', 'attack', 'damage', 'initiative']
const CORE_STATS = ['body', 'mind', 'heart', 'soul']
const ABILITIES = [
  'nutrition', 'strength', 'agility', 'sex',
  'language', 'literature', 'research', 'openness',
  'empathy', 'love', 'expression', 'drive',
  'mindfulness', 'nature', 'creation', 'honesty'
]

interface ContextExpressionBuilderProps {
  value: ContextNode | null
  onChange: (expression: ContextNode | null) => void
}

interface ExpressionItem {
  id: string
  type: 'tag' | 'operator'
  tag?: TagReference
  operator?: LogicalOperator
}

function SortableItem({ item, onRemove }: { item: ExpressionItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1">
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {item.type === 'tag' && item.tag && (
        <Badge variant="outline" className="font-mono">
          {item.tag.value}
        </Badge>
      )}
      {item.type === 'operator' && item.operator && (
        <Badge variant="secondary" className="font-bold">
          {item.operator}
        </Badge>
      )}
      <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 ml-auto">
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function ContextExpressionBuilder({ value, onChange }: ContextExpressionBuilderProps) {
  const [items, setItems] = useState<ExpressionItem[]>(() => flattenExpression(value))
  const [newTagCategory, setNewTagCategory] = useState<'rollType' | 'coreStat' | 'ability'>('rollType')
  const [newTagValue, setNewTagValue] = useState<string>('')
  const [validationError, setValidationError] = useState<string>('')

  // Flatten expression tree to linear array for UI
  function flattenExpression(node: ContextNode | null): ExpressionItem[] {
    if (!node) return []
    
    const items: ExpressionItem[] = []
    
    if (node.tag) {
      items.push({
        id: crypto.randomUUID(),
        type: 'tag',
        tag: node.tag
      })
    } else if (node.operator && node.children) {
      // For simple flat expressions, alternate children with operator
      for (let i = 0; i < node.children.length; i++) {
        const childItems = flattenExpression(node.children[i])
        items.push(...childItems)
        
        // Add operator between children (not after last child)
        if (i < node.children.length - 1) {
          items.push({
            id: crypto.randomUUID(),
            type: 'operator',
            operator: node.operator
          })
        }
      }
    }
    
    return items
  }

  // Rebuild expression tree from linear array
  function rebuildExpression(items: ExpressionItem[]): ContextNode | null {
    if (items.length === 0) return null
    if (items.length === 1 && items[0].type === 'tag' && items[0].tag) {
      return { tag: items[0].tag }
    }

    // Find dominant operator (OR > AND > NOT)
    const hasOr = items.some(item => item.type === 'operator' && item.operator === 'OR')
    const hasAnd = items.some(item => item.type === 'operator' && item.operator === 'AND')
    const hasNot = items.some(item => item.type === 'operator' && item.operator === 'NOT')
    
    const dominantOperator: LogicalOperator = hasOr ? 'OR' : hasAnd ? 'AND' : 'NOT'
    
    // Split by dominant operator
    const children: ContextNode[] = []
    let currentGroup: ExpressionItem[] = []
    
    for (const item of items) {
      if (item.type === 'operator' && item.operator === dominantOperator) {
        if (currentGroup.length > 0) {
          const child = rebuildExpression(currentGroup)
          if (child) children.push(child)
          currentGroup = []
        }
      } else {
        currentGroup.push(item)
      }
    }
    
    // Don't forget last group
    if (currentGroup.length > 0) {
      const child = rebuildExpression(currentGroup)
      if (child) children.push(child)
    }
    
    if (children.length === 0) return null
    if (children.length === 1) return children[0]
    
    return { operator: dominantOperator, children }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)
      
      const newExpression = rebuildExpression(newItems)
      const validation = validateContextExpression(newExpression || { tag: { category: 'rollType', value: 'ability_check' } })
      if (validation.valid) {
        setValidationError('')
        onChange(newExpression)
      } else {
        setValidationError(validation.error || '')
      }
    }
  }

  function addTag() {
    if (!newTagValue) return

    const newItem: ExpressionItem = {
      id: crypto.randomUUID(),
      type: 'tag',
      tag: { category: newTagCategory, value: newTagValue }
    }

    const newItems = [...items, newItem]
    setItems(newItems)
    
    const newExpression = rebuildExpression(newItems)
    onChange(newExpression)
    setNewTagValue('')
  }

  function addOperator(operator: LogicalOperator) {
    const newItem: ExpressionItem = {
      id: crypto.randomUUID(),
      type: 'operator',
      operator
    }

    const newItems = [...items, newItem]
    setItems(newItems)
    
    const newExpression = rebuildExpression(newItems)
    onChange(newExpression)
  }

  function removeItem(id: string) {
    const newItems = items.filter(item => item.id !== id)
    setItems(newItems)
    
    const newExpression = rebuildExpression(newItems)
    onChange(newExpression)
  }

  function loadPreset(presetKey: string) {
    const preset = CONTEXT_PRESETS[presetKey]
    if (preset) {
      onChange(preset.expression)
      setItems(flattenExpression(preset.expression))
      setValidationError('')
    }
  }

  function clear() {
    setItems([])
    onChange(null)
    setValidationError('')
  }

  const availableTagValues = newTagCategory === 'rollType' ? ROLL_TYPES :
                             newTagCategory === 'coreStat' ? CORE_STATS :
                             ABILITIES

  return (
    <div className="space-y-3">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">Quick Presets:</span>
        {Object.entries(CONTEXT_PRESETS).map(([key, preset]) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => loadPreset(key)}
            className="h-7 text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Current Expression Display */}
      <div className="rounded-md border bg-muted/50 p-3 min-h-[60px]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">
            No context - applies to all rolls
          </p>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {items.map(item => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {value && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {expressionToString(value)}
          </p>
        )}
        {validationError && (
          <p className="text-xs text-destructive mt-2">{validationError}</p>
        )}
      </div>

      {/* Add Tag Controls */}
      <div className="flex gap-2">
        <Select value={newTagCategory} onValueChange={(v: any) => setNewTagCategory(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rollType">Roll Type</SelectItem>
            <SelectItem value="coreStat">Core Stat</SelectItem>
            <SelectItem value="ability">Ability</SelectItem>
          </SelectContent>
        </Select>

        <Select value={newTagValue} onValueChange={setNewTagValue}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select tag..." />
          </SelectTrigger>
          <SelectContent>
            {availableTagValues.map(value => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={addTag} disabled={!newTagValue} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Tag
        </Button>
      </div>

      {/* Operator Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => addOperator('AND')} variant="outline" size="sm" className="flex-1">
          AND
        </Button>
        <Button onClick={() => addOperator('OR')} variant="outline" size="sm" className="flex-1">
          OR
        </Button>
        <Button onClick={() => addOperator('NOT')} variant="outline" size="sm" className="flex-1">
          NOT
        </Button>
        <Button onClick={clear} variant="ghost" size="sm">
          Clear
        </Button>
      </div>
    </div>
  )
}
