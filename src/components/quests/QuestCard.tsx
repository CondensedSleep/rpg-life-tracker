import type { Quest } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, CheckCircle } from 'lucide-react'

interface QuestCardProps {
  quest: Quest
  onComplete: (questId: string) => void
  onEdit: (quest: Quest) => void
  onDelete: (questId: string) => void
}

export function QuestCard({ quest, onComplete, onEdit, onDelete }: QuestCardProps) {
  const getCoreStatColor = (coreStat: string) => {
    switch (coreStat) {
      case 'body':
        return 'bg-accent-primary'
      case 'mind':
        return 'bg-accent-secondary'
      case 'heart':
        return 'bg-pink-600'
      case 'soul':
        return 'bg-purple-600'
      default:
        return 'bg-accent-secondary'
    }
  }

  const isMainQuest = quest.quest_type === 'main'
  const isCompleted = isMainQuest && quest.times_completed > 0

  return (
    <div className="p-4 bg-bg-secondary rounded-lg border border-border frosted hover:bg-bg-tertiary transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold">{quest.quest_name}</h3>
            <Badge className={getCoreStatColor(quest.core_stat)}>
              {quest.core_stat}
            </Badge>
            {isCompleted && (
              <Badge variant="outline" className="text-accent-success">
                Completed
              </Badge>
            )}
          </div>
          {quest.description && (
            <p className="text-text-secondary text-sm mb-2">{quest.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-accent-warning">+{quest.xp_reward} XP</span>
            {!isMainQuest && (
              <span className="text-text-secondary">
                Completed: {quest.times_completed} times
              </span>
            )}
            {quest.progression_milestone && quest.progression_milestone.length > 0 && (
              <div className="text-accent-success text-xs space-y-0.5">
                {quest.progression_milestone.map((milestone, idx) => (
                  <div key={idx}>
                    Every {milestone.every}: +{milestone.gain} {milestone.ability}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(quest)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(quest.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Complete Button */}
      {(!isMainQuest || !isCompleted) && (
        <Button
          onClick={() => onComplete(quest.id)}
          className="w-full bg-accent-success hover:bg-accent-success/90"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Quest
        </Button>
      )}
    </div>
  )
}
