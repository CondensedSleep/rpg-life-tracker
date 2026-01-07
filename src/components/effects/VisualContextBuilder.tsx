import { useState, useMemo, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ChevronRight } from 'lucide-react'
import type { ContextNode } from '@/types/contextExpressions'
import { cn } from '@/lib/utils'

interface VisualContextBuilderProps {
  value: ContextNode | null
  onChange: (expression: ContextNode | null) => void
}

interface TreeNodeProps {
  node: ContextNode
  onUpdate: (node: ContextNode) => void
  onDelete: () => void
  depth: number
  path: string
}

function TreeNode({ node, onUpdate, onDelete, depth, path }: TreeNodeProps) {
  const [showChildren, setShowChildren] = useState(true)
  
  // Use stable ID based on node path instead of random
  const nodeId = useMemo(() => `context-node-${path}`, [path])
  
  // Memoize drop data to prevent re-renders
  const dropData = useMemo(() => ({ 
    type: 'context-container' as const, 
    node 
  }), [node])
  
  const { setNodeRef, isOver } = useDroppable({
    id: nodeId,
    data: dropData
  })

  const isOperator = node.operator !== undefined
  const isTag = node.tag !== undefined

  // Memoize handlers to prevent re-renders
  const handleUpdateChild = useCallback((index: number, updatedChild: ContextNode) => {
    if (!node.children) return
    const newChildren = [...node.children]
    newChildren[index] = updatedChild
    onUpdate({ ...node, children: newChildren })
  }, [node, onUpdate])

  const handleDeleteChild = useCallback((index: number) => {
    if (!node.children) return
    const newChildren = node.children.filter((_, i) => i !== index)
    onUpdate({ ...node, children: newChildren.length > 0 ? newChildren : undefined })
  }, [node, onUpdate])

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "border-2 rounded-md p-3 transition-colors",
        isOver ? "border-red bg-red/10" : "border-subtle",
        depth > 0 && "ml-6 mt-2"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {(node.children && node.children.length > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowChildren(!showChildren)}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", showChildren && "rotate-90")} />
          </Button>
        )}

        {isOperator && (
          <Badge 
            variant="secondary"
            className={cn(
              "font-bold",
              node.operator === 'AND' && "border-blue-500 text-blue-700",
              node.operator === 'OR' && "border-green-500 text-green-700",
              node.operator === 'NOT' && "border-red-500 text-red-700"
            )}
          >
            {node.operator}
          </Badge>
        )}

        {isTag && (
          <Badge variant="outline" className="font-medium">
            {node.tag?.category}: {node.tag?.value}
          </Badge>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 w-6 p-0 ml-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showChildren && node.children && node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child, index) => (
            <TreeNode
              key={`${path}-${index}`}
              node={child}
              onUpdate={(updated) => handleUpdateChild(index, updated)}
              onDelete={() => handleDeleteChild(index)}
              depth={depth + 1}
              path={`${path}-${index}`}
            />
          ))}
        </div>
      )}

      {isOver && (
        <div className="mt-2 text-xs text-muted-foreground">
          Drop here to add as child
        </div>
      )}
    </div>
  )
}

export function VisualContextBuilder({ value, onChange }: VisualContextBuilderProps) {
  const dropData = useMemo(() => ({ type: 'context-root' as const }), [])
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'context-root',
    data: dropData
  })

  return (
    <div className="space-y-2">
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[120px] border-2 border-dashed rounded-md p-4 transition-colors bg-card",
          isOver ? "border-red bg-red/10" : "border-subtle",
          !value && "flex items-center justify-center"
        )}
      >
        {!value ? (
          <p className="text-sm text-muted-foreground">
            Drag tags and operators here to build context expression
          </p>
        ) : (
          <TreeNode
            node={value}
            onUpdate={onChange}
            onDelete={() => onChange(null)}
            depth={0}
            path="root"
          />
        )}
      </div>

      {value && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(null)}
        >
          Clear All
        </Button>
      )}
    </div>
  )
}
