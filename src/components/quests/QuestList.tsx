import { useState } from 'react'
import { useStore, useCharacter } from '@/store'
import type { Quest, QuestType } from '@/types'
import { completeQuest, deleteQuest } from '@/lib/supabaseService'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QuestForm } from './QuestForm'
import { QuestCard } from './QuestCard'
import { Plus } from 'lucide-react'

interface QuestListProps {
  questType: QuestType
  title: string
}

export function QuestList({ questType, title }: QuestListProps) {
  const character = useCharacter()
  const getQuestsByType = useStore((state) => state.getQuestsByType)
  const removeQuest = useStore((state) => state.removeQuest)
  const setCharacter = useStore((state) => state.setCharacter)
  const setAbilities = useStore((state) => state.setAbilities)
  const completeQuestInStore = useStore((state) => state.completeQuest)

  const quests = getQuestsByType(questType)

  const [isCreating, setIsCreating] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  const [deletingQuestId, setDeletingQuestId] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async (questId: string) => {
    if (!character || isCompleting) return

    setIsCompleting(true)

    try {
      // Call Supabase service to complete quest
      const { data, error } = await completeQuest(questId, character.id)

      if (error) {
        console.error('Error completing quest:', error)
        return
      }

      // Update quest in store
      completeQuestInStore(questId)

      // Reload character to get updated XP
      const { data: updatedChar } = await supabase
        .from('characters')
        .select('*')
        .eq('id', character.id)
        .single()

      if (updatedChar) {
        setCharacter(updatedChar)
      }

      // Reload abilities to get updated progression milestone values
      const { data: abilities } = await supabase
        .from('abilities')
        .select('*')
        .eq('character_id', character.id)

      if (abilities) {
        setAbilities(abilities)
      }

      // Show success feedback
      if (data) {
        console.log(`✅ Quest completed! +${data.xp_awarded} XP`)
      }
    } catch (error) {
      console.error('Error completing quest:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingQuestId) return

    const { error } = await deleteQuest(deletingQuestId)

    if (error) {
      console.error('Error deleting quest:', error)
      return
    }

    removeQuest(deletingQuestId)
    setDeletingQuestId(null)
  }

  if (!character) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Quest
        </Button>
      </div>

      {/* Quests Grid */}
      {quests.length === 0 ? (
        <div className="p-6 bg-bg-secondary rounded-lg border border-border text-center frosted">
          <p className="text-text-secondary">
            {questType === 'weekly'
              ? 'No weekly quests yet. Add recurring quests to complete multiple times for XP.'
              : 'No main quests yet. Add one-time objectives to track major goals.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onComplete={handleComplete}
              onEdit={setEditingQuest}
              onDelete={setDeletingQuestId}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quest</DialogTitle>
          </DialogHeader>
          <QuestForm
            characterId={character.id}
            onSuccess={() => setIsCreating(false)}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuest} onOpenChange={(open) => !open && setEditingQuest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quest</DialogTitle>
          </DialogHeader>
          {editingQuest && (
            <QuestForm
              quest={editingQuest}
              characterId={character.id}
              onSuccess={() => setEditingQuest(null)}
              onCancel={() => setEditingQuest(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingQuestId} onOpenChange={(open) => !open && setDeletingQuestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quest? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-accent-primary">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
