import { useState, memo } from 'react'
import { ChevronRight, ChevronDown, CheckCircle2, Circle } from 'lucide-react'
import type { Quest, QuestTreeNode } from '@/types'

interface QuestTreeDisplayProps {
  tree: QuestTreeNode[]
  quests: Quest[]
  onToggleNode?: (nodeId: string) => void
}

export function QuestTreeDisplay({ tree, quests, onToggleNode }: QuestTreeDisplayProps) {
  if (!tree || tree.length === 0) {
    return null
  }

  return (
    <div className="mt-4 pt-4 border-t border-subtle space-y-1">
      {tree.map((node) => (
        <TreeNodeDisplay
          key={node.id}
          node={node}
          depth={0}
          quests={quests}
          onToggleNode={onToggleNode}
        />
      ))}
    </div>
  )
}

interface TreeNodeDisplayProps {
  node: QuestTreeNode
  depth: number
  quests: Quest[]
  onToggleNode?: (nodeId: string) => void
}

const TreeNodeDisplay = memo(function TreeNodeDisplay({ node, depth, quests, onToggleNode }: TreeNodeDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const indentStyle = { paddingLeft: `${depth * 20}px` }

  // Get quest name if this is a quest reference
  const referencedQuest = node.type === 'quest' && node.text
    ? quests.find(q => q.id === node.text)
    : null

  const displayText = node.type === 'text'
    ? node.text
    : referencedQuest?.quest_name || '(Quest not found)'

  // For quest nodes, use the actual quest's completion state
  // For text nodes, use the node's own completed state
  const isCompleted = node.type === 'quest' && referencedQuest
    ? (referencedQuest.quest_type === 'recurring' 
        ? referencedQuest.times_completed > 0 
        : referencedQuest.is_completed)
    : (node.completed || false)
  
  // For recurring quests, show the completion count
  const completionCount = node.type === 'quest' && referencedQuest?.quest_type === 'recurring'
    ? referencedQuest.times_completed
    : undefined
  
  // If this is a MAIN quest reference, merge its quest_tree as children
  const effectiveChildren = node.type === 'quest' && referencedQuest?.quest_type === 'main' && referencedQuest.quest_tree
    ? [...(node.children || []), ...referencedQuest.quest_tree]
    : node.children
  
  const hasEffectiveChildren = effectiveChildren && effectiveChildren.length > 0

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 group py-1" style={indentStyle}>
        {/* Expand/Collapse Button */}
        {hasEffectiveChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-card-secondary corner-clip-sm"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-secondary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-secondary" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Checkbox */}
        <button
          type="button"
          onClick={() => {
            // For quest nodes, pass the quest ID from the text field
            // For text nodes, pass the node id
            const idToPass = node.type === 'quest' ? node.text : node.id
            onToggleNode?.(idToPass || '')
          }}
          className="flex-shrink-0 hover:opacity-80 transition-opacity relative"
          disabled={!onToggleNode}
        >
          {/* Show completion count badge for recurring quests */}
          {completionCount !== undefined && completionCount > 0 ? (
            <div className="relative">
              <Circle className="w-4 h-4 text-secondary" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-primary">
                {completionCount}
              </span>
            </div>
          ) : isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green" />
          ) : (
            <Circle className="w-4 h-4 text-secondary" />
          )}
        </button>

        {/* Node Content */}
        <div className="flex items-center gap-2 flex-1">
          {node.type === 'quest' && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-red/10 text-red corner-clip-sm">
              Quest
            </span>
          )}
          <span className={`text-sm ${isCompleted ? 'text-secondary line-through' : 'text-primary'}`}>
            {displayText}
          </span>
        </div>
      </div>

      {/* Render Children */}
      {isExpanded && hasEffectiveChildren && (
        <div className="space-y-1">
          {effectiveChildren!.map((child) => (
            <TreeNodeDisplay
              key={child.id}
              node={child}
              depth={depth + 1}
              quests={quests}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      )}
    </div>
  )
})
