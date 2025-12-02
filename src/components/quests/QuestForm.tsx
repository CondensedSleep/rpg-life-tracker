import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Quest } from '@/types'
import { questFormSchema, type QuestFormValues } from '@/lib/validations'
import { createQuest, updateQuest } from '@/lib/supabaseService'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// All available abilities
const ABILITIES = [
  'nutrition', 'strength', 'agility', 'sex',
  'language', 'literature', 'research', 'openness',
  'empathy', 'love', 'expression', 'drive',
  'mindfulness', 'nature', 'creation', 'honesty',
]

interface QuestFormProps {
  quest?: Quest
  characterId: string
  onSuccess: () => void
  onCancel: () => void
}

export function QuestForm({ quest, characterId, onSuccess, onCancel }: QuestFormProps) {
  const addQuest = useStore((state) => state.addQuest)
  const updateQuestInStore = useStore((state) => state.updateQuest)

  const [hasProgressionMilestone, setHasProgressionMilestone] = useState(
    !!quest?.progression_milestone
  )

  const form = useForm<QuestFormValues>({
    resolver: zodResolver(questFormSchema),
    defaultValues: quest ? {
      quest_name: quest.quest_name,
      quest_type: quest.quest_type,
      core_stat: quest.core_stat,
      abilities_used: quest.abilities_used || [],
      xp_reward: quest.xp_reward,
      difficulty_class: quest.difficulty_class || undefined,
      progression_milestone: quest.progression_milestone || undefined,
      description: quest.description || '',
      deadline: quest.deadline || undefined,
      is_active: quest.is_active,
    } : {
      quest_name: '',
      quest_type: 'weekly',
      core_stat: 'body',
      abilities_used: [],
      xp_reward: 1,
      description: '',
      is_active: true,
    },
  })

  const onSubmit = async (values: QuestFormValues) => {
    try {
      if (quest) {
        // Update existing quest
        const { data, error } = await updateQuest(quest.id, values)

        if (error) {
          console.error('Error updating quest:', error)
          return
        }

        if (data) {
          updateQuestInStore(quest.id, data)
        }
      } else {
        // Create new quest
        const { data, error } = await createQuest(characterId, values)

        if (error) {
          console.error('Error creating quest:', error)
          return
        }

        if (data) {
          addQuest(data)
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving quest:', error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Quest Name */}
      <div>
        <Label htmlFor="quest-name">
          Quest Name <span className="text-accent-primary">*</span>
        </Label>
        <Input
          id="quest-name"
          {...form.register('quest_name')}
          placeholder="e.g., Promise of the Poet, Lift Heavy Things"
        />
        {form.formState.errors.quest_name && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.quest_name.message}
          </p>
        )}
      </div>

      {/* Quest Type */}
      <div>
        <Label htmlFor="quest-type">
          Quest Type <span className="text-accent-primary">*</span>
        </Label>
        <Select
          value={form.watch('quest_type')}
          onValueChange={(value) => form.setValue('quest_type', value as any)}
        >
          <SelectTrigger id="quest-type">
            <SelectValue placeholder="Select quest type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly (Recurring)</SelectItem>
            <SelectItem value="main">Main (One-time)</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.quest_type && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.quest_type.message}
          </p>
        )}
        <p className="text-xs text-text-secondary mt-1">
          {form.watch('quest_type') === 'weekly'
            ? 'Weekly quests can be completed multiple times and track completion count'
            : 'Main quests are one-time objectives that mark as complete after finishing'}
        </p>
      </div>

      {/* Core Stat */}
      <div>
        <Label htmlFor="core-stat">
          Core Stat <span className="text-accent-primary">*</span>
        </Label>
        <Select
          value={form.watch('core_stat')}
          onValueChange={(value) => form.setValue('core_stat', value as any)}
        >
          <SelectTrigger id="core-stat">
            <SelectValue placeholder="Select core stat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="body">Body</SelectItem>
            <SelectItem value="mind">Mind</SelectItem>
            <SelectItem value="heart">Heart</SelectItem>
            <SelectItem value="soul">Soul</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.core_stat && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.core_stat.message}
          </p>
        )}
      </div>

      {/* XP Reward */}
      <div>
        <Label htmlFor="xp-reward">
          XP Reward <span className="text-accent-primary">*</span>
        </Label>
        <Input
          id="xp-reward"
          type="number"
          {...form.register('xp_reward', { valueAsNumber: true })}
          placeholder="e.g., 3"
        />
        {form.formState.errors.xp_reward && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.xp_reward.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="quest-description">Description</Label>
        <Textarea
          id="quest-description"
          {...form.register('description')}
          placeholder="Describe what needs to be done to complete this quest"
          rows={3}
        />
      </div>

      {/* Progression Milestone (Weekly quests only) */}
      {form.watch('quest_type') === 'weekly' && (
        <div className="space-y-4 p-4 border border-border rounded-lg bg-bg-tertiary frosted-sm">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-milestone"
              checked={hasProgressionMilestone}
              onCheckedChange={(checked) => {
                setHasProgressionMilestone(checked as boolean)
                if (!checked) {
                  form.setValue('progression_milestone', undefined)
                }
              }}
            />
            <Label htmlFor="has-milestone" className="cursor-pointer">
              Add Progression Milestone
            </Label>
          </div>
          <p className="text-xs text-text-secondary">
            Reward ability points after completing this quest multiple times (e.g., +1 creation every 5 completions)
          </p>

          {hasProgressionMilestone && (
            <div className="space-y-4 pt-2">
              {/* Ability */}
              <div>
                <Label htmlFor="milestone-ability">Ability to Increase</Label>
                <Select
                  value={form.watch('progression_milestone.ability') || ''}
                  onValueChange={(value) => form.setValue('progression_milestone.ability', value)}
                >
                  <SelectTrigger id="milestone-ability">
                    <SelectValue placeholder="Select ability" />
                  </SelectTrigger>
                  <SelectContent>
                    {ABILITIES.map((ability) => (
                      <SelectItem key={ability} value={ability}>
                        {ability}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Every X completions */}
              <div>
                <Label htmlFor="milestone-every">Every X Completions</Label>
                <Input
                  id="milestone-every"
                  type="number"
                  min="1"
                  {...form.register('progression_milestone.every', { valueAsNumber: true })}
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-text-secondary mt-1">
                  How many times to complete before gaining ability points
                </p>
              </div>

              {/* Gain Y points */}
              <div>
                <Label htmlFor="milestone-gain">Gain Y Points</Label>
                <Input
                  id="milestone-gain"
                  type="number"
                  min="1"
                  {...form.register('progression_milestone.gain', { valueAsNumber: true })}
                  placeholder="e.g., 1"
                />
                <p className="text-xs text-text-secondary mt-1">
                  How many points to add to the ability
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : quest ? 'Update Quest' : 'Create Quest'}
        </Button>
      </div>
    </form>
  )
}
