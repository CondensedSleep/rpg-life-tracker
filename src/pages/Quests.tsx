import { useState, useMemo, useCallback, memo } from 'react'
import { useStore } from '@/store'
import { Plus, CheckSquare, Square, Trash2 } from 'lucide-react'
import { QuestForm } from '@/components/quests/QuestForm'
import { QuestTreeDisplay } from '@/components/quests/QuestTreeDisplay'
import type { Quest } from '@/types'

export function Quests() {
  const quests = useStore((state) => state.quests)
  const [showQuestForm, setShowQuestForm] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)

  // Filter and sort quests by type (memoized for performance)
  const sideQuests = useMemo(
    () => quests
      .filter(q => q.quest_type === 'side' && !q.parent_quest_id)
      .sort((a, b) => (a.is_completed === b.is_completed) ? 0 : a.is_completed ? 1 : -1),
    [quests]
  )
  
  const recurringQuests = useMemo(
    () => quests
      .filter(q => q.quest_type === 'recurring' && !q.parent_quest_id)
      .sort((a, b) => (a.is_completed === b.is_completed) ? 0 : a.is_completed ? 1 : -1),
    [quests]
  )
  
  const mainQuests = useMemo(
    () => quests
      .filter(q => q.quest_type === 'main' && !q.parent_quest_id)
      .sort((a, b) => (a.is_completed === b.is_completed) ? 0 : a.is_completed ? 1 : -1),
    [quests]
  )
  
  // Shared delete handler
  const handleDeleteQuest = useCallback(async (quest: Quest) => {
    if (confirm(`Delete quest "${quest.quest_name}"?`)) {
      const { deleteQuest } = await import('@/lib/supabaseService')
      await deleteQuest(quest.id)
      useStore.getState().removeQuest(quest.id)
    }
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header with Create Quest button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Quests</h1>
        <button
          onClick={() => {
            setEditingQuest(null)
            setShowQuestForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-red text-white corner-clip-sm hover:bg-accent-red/90 shadow-hard active:shadow-none active:translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Quest
        </button>
      </div>

      {/* Two-column top section: Side Quests | Recurring Quests */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Side Quests */}
        <div className="p-6 bg-bg-card corner-clip shadow-card">
          <h2 className="text-2xl font-bold mb-4">Side Quests</h2>
          <div className="space-y-2">
            {sideQuests.length === 0 ? (
              <p className="text-text-secondary text-sm">No side quests yet</p>
            ) : (
              sideQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onEdit={() => {
                    setEditingQuest(quest)
                    setShowQuestForm(true)
                  }}
                  onDelete={() => handleDeleteQuest(quest)}
                />
              ))
            )}
          </div>
        </div>

        {/* Recurring Quests */}
        <div className="p-6 bg-bg-card corner-clip shadow-card">
          <h2 className="text-2xl font-bold mb-4">Recurring Quests</h2>
          <div className="space-y-2">
            {recurringQuests.length === 0 ? (
              <p className="text-text-secondary text-sm">No recurring quests yet</p>
            ) : (
              recurringQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onEdit={() => {
                    setEditingQuest(quest)
                    setShowQuestForm(true)
                  }}
                  onDelete={() => handleDeleteQuest(quest)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full-width bottom section: Main Quests */}
      <div className="p-6 bg-bg-card corner-clip shadow-card">
        <h2 className="text-2xl font-bold mb-4">Main Quests</h2>
        <div className="space-y-3">
          {mainQuests.length === 0 ? (
            <p className="text-text-secondary text-sm">No main quests yet</p>
          ) : (
            mainQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onEdit={() => {
                  setEditingQuest(quest)
                  setShowQuestForm(true)
                }}
                onDelete={() => handleDeleteQuest(quest)}
              />
            ))
          )}
        </div>
      </div>

      {/* Quest Form Modal */}
      {showQuestForm && (
        <QuestForm
          quest={editingQuest}
          onClose={() => {
            setShowQuestForm(false)
            setEditingQuest(null)
          }}
        />
      )}
    </div>
  )
}

// Consolidated XP award function
async function awardXP(characterId: string, amount: number) {
  const character = useStore.getState().character
  if (!character) return
  
  const { supabase } = await import('@/lib/supabase')
  const newCurrentXp = character.current_xp + amount
  
  await supabase
    .from('characters')
    .update({ current_xp: newCurrentXp })
    .eq('id', characterId)
  
  // Update local state without full reload
  useStore.getState().setCharacter({ ...character, current_xp: newCurrentXp })
}

// Text node toggle function (for quest trees)
function toggleTextNodeInTree(tree: Quest['quest_tree'], nodeId: string): Quest['quest_tree'] {
  if (!tree) return tree
  return tree.map(node => {
    if (node.id === nodeId) {
      return { ...node, completed: !node.completed }
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: toggleTextNodeInTree(node.children, nodeId) }
    }
    return node
  })
}

// Helper function to handle quest completion/toggle
async function handleQuestToggle(quest: Quest) {
  const character = useStore.getState().character
  if (!character) return

  const { supabase } = await import('@/lib/supabase')
  const { updateQuest: updateQuestDb } = await import('@/lib/supabaseService')
  const isRecurring = quest.quest_type === 'recurring'
  const isCompleted = quest.is_completed

  if (isRecurring) {
    // For recurring quests, increment times_completed
    const newTimesCompleted = quest.times_completed + 1
    
    const { data: updatedQuest } = await updateQuestDb(quest.id, {
      times_completed: newTimesCompleted,
    })

    if (updatedQuest) {
      useStore.getState().updateQuest(quest.id, updatedQuest)
    }

    // Award XP to character
    await awardXP(character.id, quest.xp_reward)

    // Check progression milestones
    let shouldReloadAbilities = false
    if (quest.progression_milestone) {
      for (const milestone of quest.progression_milestone) {
        if (newTimesCompleted % milestone.every === 0) {
          shouldReloadAbilities = true
          // Award ability increase
          const { data: ability } = await supabase
            .from('ability_values')
            .select('*')
            .eq('character_id', character.id)
            .eq('ability_name', milestone.ability)
            .single()

          if (ability) {
            await supabase
              .from('ability_values')
              .update({ base_value: ability.base_value + milestone.gain })
              .eq('id', ability.id)
          }
        }
      }
      
      // Reload abilities if milestones were hit
      if (shouldReloadAbilities) {
        const { data: abilities } = await supabase
          .from('ability_values')
          .select('*')
          .eq('character_id', character.id)
        
        if (abilities) {
          useStore.getState().setAbilities(abilities)
        }
      }
    }
  } else {
    // For side/main quests, toggle completion
    const newIsCompleted = !isCompleted
    
    const { data: updatedQuest } = await updateQuestDb(quest.id, {
      is_completed: newIsCompleted,
      completed_at: newIsCompleted ? new Date().toISOString() : null,
      times_completed: newIsCompleted ? quest.times_completed + 1 : quest.times_completed,
    })

    if (updatedQuest) {
      useStore.getState().updateQuest(quest.id, updatedQuest)
    }

    // Award XP if completing
    if (newIsCompleted) {
      await awardXP(character.id, quest.xp_reward)
    }
  }
}

// Quest Card Component (memoized for performance)
const QuestCard = memo(function QuestCard({ quest, onEdit, onDelete }: { quest: Quest; onEdit: () => void; onDelete: () => void }) {
  const quests = useStore((state) => state.quests)
  const character = useStore((state) => state.character)
  const isCompleted = quest.is_completed
  const isRecurring = quest.quest_type === 'recurring'
  const isMainQuest = quest.quest_type === 'main'

  const handleToggle = useCallback(() => handleQuestToggle(quest), [quest])

  return (
    <div
      className={`p-4 corner-clip-sm border transition-all ${
        isCompleted
          ? 'bg-bg-card-secondary/50 border-border-subtle/50 opacity-60'
          : 'bg-bg-card-secondary border-border-subtle hover:border-accent-red/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox or Tickbox */}
        <button
          className="mt-0.5 flex-shrink-0"
          onClick={handleToggle}
        >
          {isRecurring ? (
            <div className="flex items-center justify-center w-6 h-6 corner-clip-sm border-2 border-accent-red bg-bg-card text-xs font-bold text-accent-red">
              {quest.times_completed}
            </div>
          ) : isCompleted ? (
            <CheckSquare className="w-6 h-6 text-accent-red" />
          ) : (
            <Square className="w-6 h-6 text-text-secondary hover:text-accent-red transition-colors" />
          )}
        </button>

        {/* Quest Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold ${isCompleted ? 'line-through' : ''}`}>
                {quest.quest_name}
              </h3>
              {quest.core_stat.map((stat) => (
                <span
                  key={stat}
                  className="text-xs px-2 py-0.5 corner-clip-sm bg-accent-red/10 text-accent-red uppercase"
                >
                  {stat}
                </span>
              ))}
              <span className="text-xs px-2 py-0.5 corner-clip-sm bg-accent-green/10 text-accent-green">
                {quest.xp_reward} XP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                className="text-xs px-2 py-1 text-text-secondary hover:text-accent-red transition-colors"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-text-secondary hover:text-accent-red transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {quest.description && (
            <p className="text-sm text-text-secondary mt-2">{quest.description}</p>
          )}

          {/* Render quest tree for MAIN quests */}
          {isMainQuest && quest.quest_tree && quest.quest_tree.length > 0 && (
            <QuestTreeDisplay
              tree={quest.quest_tree}
              quests={quests}
              onToggleNode={async (nodeId) => {
                // For quest nodes, nodeId is the quest's UUID
                const questToToggle = quests.find(q => q.id === nodeId)
                if (questToToggle) {
                  await handleQuestToggle(questToToggle)
                } else {
                  // This is a text node, toggle it in the quest tree
                  const updatedTree = toggleTextNodeInTree(quest.quest_tree, nodeId)
                  
                  // Update the quest in the database
                  const { updateQuest } = await import('@/lib/supabaseService')
                  await updateQuest(quest.id, { quest_tree: updatedTree })
                  
                  // Update local state
                  const updatedQuests = quests.map(q =>
                    q.id === quest.id ? { ...q, quest_tree: updatedTree } : q
                  )
                  useStore.getState().setQuests(updatedQuests)
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
})

