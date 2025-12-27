import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'
import type { Quest, CoreStatName, QuestTreeNode } from '@/types'
import { questFormSchema, type QuestFormValues } from '@/lib/validations'
import { QuestTreeBuilder } from './QuestTreeBuilder'
import { X, Plus, Trash2 } from 'lucide-react'

const ABILITIES = [
  'nutrition', 'strength', 'agility', 'sex',
  'language', 'literature', 'research', 'openness',
  'empathy', 'love', 'expression', 'drive',
  'mindfulness', 'nature', 'creation', 'honesty',
]

interface QuestFormProps {
  quest?: Quest | null
  onClose: () => void
}

export function QuestForm({ quest, onClose }: QuestFormProps) {
  const character = useStore((state) => state.character)
  const quests = useStore((state) => state.quests)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<QuestFormValues>({
    resolver: zodResolver(questFormSchema),
    defaultValues: quest
      ? {
          quest_name: quest.quest_name,
          quest_type: quest.quest_type,
          core_stat: quest.core_stat,
          abilities_used: quest.abilities_used || [],
          xp_reward: quest.xp_reward,
          difficulty_class: quest.difficulty_class || undefined,
          progression_milestone: quest.progression_milestone || [],
          description: quest.description || '',
          deadline: quest.deadline || undefined,
          is_active: quest.is_active,
          parent_quest_id: quest.parent_quest_id || undefined,
          quest_tree: quest.quest_tree || [],
        }
      : {
          quest_name: '',
          quest_type: 'side',
          core_stat: [],
          abilities_used: [],
          xp_reward: 1,
          description: '',
          progression_milestone: [],
          is_active: true,
          quest_tree: [],
        },
  })

  const questType = form.watch('quest_type')

  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({
    control: form.control,
    name: 'progression_milestone',
  })

  const onSubmit = async (data: QuestFormValues) => {
    if (!character) return

    setIsSubmitting(true)
    try {
      const questData = {
        character_id: character.id,
        quest_name: data.quest_name,
        quest_type: data.quest_type,
        core_stat: data.core_stat,
        abilities_used: data.abilities_used,
        xp_reward: data.xp_reward,
        difficulty_class: data.difficulty_class,
        progression_milestone: data.progression_milestone,
        description: data.description,
        deadline: data.deadline,
        is_active: data.is_active,
        parent_quest_id: data.parent_quest_id,
        quest_tree: data.quest_tree,
      }

      if (quest) {
        // Update existing quest
        const { data: updatedQuest, error } = await supabase
          .from('quests')
          .update(questData)
          .eq('id', quest.id)
          .select()
          .single()

        if (error) {
          alert('Failed to update quest: ' + error.message)
          return
        }
        
        if (updatedQuest) {
          useStore.getState().updateQuest(quest.id, updatedQuest)
        }
      } else {
        // Create new quest
        const { data: newQuest, error } = await supabase
          .from('quests')
          .insert([questData])
          .select()
          .single()

        if (error) {
          alert('Failed to create quest: ' + error.message)
          return
        }
        
        if (newQuest) {
          useStore.getState().addQuest(newQuest)
        }
      }

      alert(quest ? '✅ Quest updated!' : '✅ Quest created!')
      onClose()
    } catch (error) {
      console.error('Error saving quest:', error)
      alert('An error occurred while saving the quest')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-secondary rounded-lg border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg-secondary border-b border-border p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {quest ? 'Edit Quest' : 'Create Quest'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Quest Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Quest Name <span className="text-red-500">*</span>
            </label>
            <input
              {...form.register('quest_name')}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
              placeholder="Enter quest name..."
            />
            {form.formState.errors.quest_name && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.quest_name.message}
              </p>
            )}
          </div>

          {/* Quest Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Quest Type <span className="text-red-500">*</span>
            </label>
            <select
              {...form.register('quest_type')}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            >
              <option value="side">Side Quest (one-time, no subquests)</option>
              <option value="recurring">Recurring Quest (resets on completion)</option>
              <option value="main">Main Quest (one-time, can have subquests)</option>
            </select>
            {form.formState.errors.quest_type && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.quest_type.message}
              </p>
            )}
          </div>

          {/* Core Stats (Multiple Selection) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Core Stats <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['body', 'mind', 'heart', 'soul'] as const).map((stat) => (
                <label key={stat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={stat}
                    checked={form.watch('core_stat')?.includes(stat) || false}
                    onChange={(e) => {
                      const current = form.getValues('core_stat') || []
                      if (e.target.checked) {
                        form.setValue('core_stat', [...current, stat])
                      } else {
                        form.setValue('core_stat', current.filter((s: CoreStatName) => s !== stat))
                      }
                    }}
                    className="w-4 h-4 rounded border-border bg-bg-tertiary"
                  />
                  <span className="text-sm uppercase">{stat}</span>
                </label>
              ))}
            </div>
            {form.formState.errors.core_stat && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.core_stat.message}
              </p>
            )}
            <p className="text-xs text-text-secondary mt-1">
              Core stats are for categorization only
            </p>
          </div>

          {/* XP Reward */}
          <div>
            <label className="block text-sm font-medium mb-1">
              XP Reward <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...form.register('xp_reward', { valueAsNumber: true })}
              min="0"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
            />
            {form.formState.errors.xp_reward && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.xp_reward.message}
              </p>
            )}
            {questType === 'main' && (
              <p className="text-xs text-text-secondary mt-1">
                This XP is awarded when all subquests are completed (bonus on top of subquest XP)
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md"
              placeholder="Quest description..."
            />
          </div>

          {/* Quest Tree Builder (only for MAIN quests) */}
          {questType === 'main' && (
            <div className="p-4 bg-bg-tertiary rounded-md border border-border">
              <h3 className="font-semibold mb-2">Quest Tree Structure (Optional)</h3>
              <p className="text-sm text-text-secondary mb-4">
                Build a hierarchical quest tree with text nodes or nested quests. All elements will have checkboxes when displayed.
              </p>
              <QuestTreeBuilder
                tree={(form.watch('quest_tree') || []) as QuestTreeNode[]}
                onChange={(tree) => form.setValue('quest_tree', tree)}
                availableQuests={quests.filter(q => q.id !== quest?.id)}
              />
            </div>
          )}

          {/* Progression Milestones (only for RECURRING quests) */}
          {questType === 'recurring' && (
            <div className="p-4 bg-bg-tertiary rounded-md border border-border space-y-3">
              <div>
                <h3 className="font-semibold mb-2">Progression Milestones (Optional)</h3>
                <p className="text-sm text-text-secondary mb-3">
                  Grant ability/stat increases when reaching completion milestones (e.g., every 10 completions).
                </p>
              </div>

              {milestoneFields.map((field, index) => (
                <div key={field.id} className="p-3 bg-bg-primary rounded border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Milestone {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        Ability/Stat
                      </label>
                      <select
                        {...form.register(`progression_milestone.${index}.ability`)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border rounded text-sm"
                      >
                        <option value="">Select...</option>
                        {ABILITIES.map((ability) => (
                          <option key={ability} value={ability}>
                            {ability}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        Every X completions
                      </label>
                      <input
                        type="number"
                        {...form.register(`progression_milestone.${index}.every`, {
                          valueAsNumber: true,
                        })}
                        min="1"
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border rounded text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">
                      Gain amount
                    </label>
                    <input
                      type="number"
                      {...form.register(`progression_milestone.${index}.gain`, {
                        valueAsNumber: true,
                      })}
                      min="1"
                      className="w-full px-2 py-1 bg-bg-tertiary border border-border rounded text-sm"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => appendMilestone({ ability: '', every: 1, gain: 1 })}
                className="flex items-center gap-2 px-3 py-2 bg-bg-primary border border-border rounded hover:bg-bg-primary/80 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-md hover:bg-bg-tertiary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : quest ? 'Update Quest' : 'Create Quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
