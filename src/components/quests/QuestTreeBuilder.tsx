import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronRight, ChevronDown } from 'lucide-react'
import type { Quest, QuestTreeNode } from '@/types'

interface QuestTreeBuilderProps {
  tree: QuestTreeNode[]
  onChange: (tree: QuestTreeNode[]) => void
  availableQuests: Quest[]
}

export function QuestTreeBuilder({ tree, onChange, availableQuests }: QuestTreeBuilderProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tree.map((node, index) => (
          <TreeNode
            key={node.id || index}
            node={node}
            depth={0}
            availableQuests={availableQuests}
            onUpdate={(updatedNode) => {
              const newTree = [...tree]
              newTree[index] = updatedNode
              onChange(newTree)
            }}
            onDelete={() => {
              onChange(tree.filter((_, i) => i !== index))
            }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onChange([
              ...tree,
              {
                type: 'text',
                id: crypto.randomUUID(),
                text: '',
                completed: false,
                children: [],
              },
            ])
          }}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Text Node
        </button>

        <button
          type="button"
          onClick={() => {
            onChange([
              ...tree,
              {
                type: 'quest',
                id: crypto.randomUUID(),
                text: '',
                completed: false,
                children: [],
              },
            ])
          }}
          className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Quest Reference
        </button>
      </div>
    </div>
  )
}

interface TreeNodeProps {
  node: QuestTreeNode
  depth: number
  availableQuests: Quest[]
  onUpdate: (node: QuestTreeNode) => void
  onDelete: () => void
}

function TreeNode({ node, depth, availableQuests, onUpdate, onDelete }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  const indentStyle = { paddingLeft: `${depth * 24}px` }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 group" style={indentStyle}>
        {/* Expand/Collapse Button */}
        {node.children && node.children.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}

        {/* Drag Handle */}
        <div className="mt-2 p-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Node Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-2">
            {/* Type Badge */}
            <span
              className={`mt-2 px-2 py-1 text-xs font-semibold rounded ${
                node.type === 'text'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {node.type === 'text' ? 'Text' : 'Quest'}
            </span>

            {/* Input/Select Field */}
            {node.type === 'text' ? (
              <input
                type="text"
                value={node.text || ''}
                onChange={(e) => {
                  onUpdate({ ...node, text: e.target.value })
                }}
                placeholder="Enter text node content..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <select
                value={node.text || ''}
                onChange={(e) => {
                  onUpdate({ ...node, text: e.target.value })
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a quest...</option>
                {availableQuests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.quest_name}
                  </option>
                ))}
              </select>
            )}

            {/* Delete Button */}
            <button
              type="button"
              onClick={onDelete}
              className="mt-1 p-2 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Add Child Buttons */}
          <div className="flex gap-2 ml-16">
            <button
              type="button"
              onClick={() => {
                const newChild: QuestTreeNode = {
                  type: 'text',
                  id: crypto.randomUUID(),
                  text: '',
                  completed: false,
                  children: [],
                }
                onUpdate({
                  ...node,
                  children: [...(node.children || []), newChild],
                })
              }}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Child Text
            </button>

            <button
              type="button"
              onClick={() => {
                const newChild: QuestTreeNode = {
                  type: 'quest',
                  id: crypto.randomUUID(),
                  text: '',
                  completed: false,
                  children: [],
                }
                onUpdate({
                  ...node,
                  children: [...(node.children || []), newChild],
                })
              }}
              className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Child Quest
            </button>
          </div>
        </div>
      </div>

      {/* Render Children */}
      {isExpanded && hasChildren && (
        <div className="space-y-2">
          {node.children!.map((child, index) => (
            <TreeNode
              key={child.id || index}
              node={child}
              depth={depth + 1}
              availableQuests={availableQuests}
              onUpdate={(updatedChild) => {
                const newChildren = [...(node.children || [])]
                newChildren[index] = updatedChild
                onUpdate({ ...node, children: newChildren })
              }}
              onDelete={() => {
                onUpdate({
                  ...node,
                  children: (node.children || []).filter((_, i) => i !== index),
                })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
