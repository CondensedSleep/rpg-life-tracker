import { useState } from 'react'
import { useTraits, useCharacter } from '@/store'
import type { Trait } from '@/types'
import { deleteTrait } from '@/lib/supabaseService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { TraitForm } from './TraitForm'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { useStore } from '@/store'

export function TraitsList() {
  const traits = useTraits()
  const character = useCharacter()
  const removeTrait = useStore((state) => state.removeTrait)

  const [isCreating, setIsCreating] = useState(false)
  const [editingTrait, setEditingTrait] = useState<Trait | null>(null)
  const [deletingTraitId, setDeletingTraitId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingTraitId) return

    const { error } = await deleteTrait(deletingTraitId)

    if (error) {
      console.error('Error deleting trait:', error)
      return
    }

    removeTrait(deletingTraitId)
    setDeletingTraitId(null)
  }

  const getTraitTypeBadge = (traitType: string | null) => {
    switch (traitType) {
      case 'feature':
        return <Badge className="bg-accent-success">Feature</Badge>
      case 'flaw':
        return <Badge className="bg-accent-primary">Flaw</Badge>
      case 'passive':
        return <Badge className="bg-accent-secondary">Passive</Badge>
      default:
        return null
    }
  }

  if (!character) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Traits</h2>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Trait
        </Button>
      </div>

      {/* Traits Grid */}
      {traits.length === 0 ? (
        <div className="p-6 bg-bg-secondary rounded-lg border border-border text-center">
          <p className="text-text-secondary">
            No traits yet. Add your first trait to define your character's unique features and flaws.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {traits.map((trait) => (
            <div
              key={trait.id}
              className="p-4 bg-bg-secondary rounded-lg border border-border"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold uppercase">{trait.trait_name}</h3>
                    {getTraitTypeBadge(trait.trait_type)}
                    {!trait.is_active && (
                      <Badge variant="outline" className="text-text-secondary">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {trait.description && (
                    <p className="text-text-secondary">{trait.description}</p>
                  )}
                  {trait.mechanical_effect && (
                    <div className="text-sm text-accent-secondary">
                      <strong>Effect:</strong>{' '}
                      {trait.mechanical_effect.type === 'stat_modifier' &&
                        `${trait.mechanical_effect.modifier > 0 ? '+' : ''}${trait.mechanical_effect.modifier} to ${
                          trait.mechanical_effect.stats?.join(', ') || trait.mechanical_effect.stat
                        }`}
                      {trait.mechanical_effect.type === 'advantage' && 'Advantage'}
                      {trait.mechanical_effect.type === 'disadvantage' && 'Disadvantage'}
                      {trait.mechanical_effect.condition &&
                        ` (when ${trait.mechanical_effect.condition})`}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingTrait(trait)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeletingTraitId(trait.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Trait</DialogTitle>
          </DialogHeader>
          <TraitForm
            characterId={character.id}
            onSuccess={() => setIsCreating(false)}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTrait} onOpenChange={(open) => !open && setEditingTrait(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trait</DialogTitle>
          </DialogHeader>
          {editingTrait && (
            <TraitForm
              trait={editingTrait}
              characterId={character.id}
              onSuccess={() => setEditingTrait(null)}
              onCancel={() => setEditingTrait(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTraitId} onOpenChange={(open) => !open && setDeletingTraitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trait</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trait? This action cannot be undone.
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
