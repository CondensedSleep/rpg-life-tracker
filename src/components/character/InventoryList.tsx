import { useState } from 'react'
import { useInventory, useCharacter } from '@/store'
import type { InventoryItem } from '@/types'
import { deleteInventoryItem } from '@/lib/supabaseService'
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
import { InventoryForm } from './InventoryForm'
import { Edit2, Trash2, Plus, Check } from 'lucide-react'
import { useStore } from '@/store'

export function InventoryList() {
  const inventory = useInventory()
  const character = useCharacter()
  const removeItem = useStore((state) => state.removeItem)

  const [isCreating, setIsCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingItemId) return

    const { error } = await deleteInventoryItem(deletingItemId)

    if (error) {
      console.error('Error deleting item:', error)
      return
    }

    removeItem(deletingItemId)
    setDeletingItemId(null)
  }

  const getItemTypeBadge = (itemType: string | null) => {
    switch (itemType) {
      case 'tool':
        return <Badge className="bg-accent-secondary">Tool</Badge>
      case 'comfort':
        return <Badge className="bg-accent-success">Comfort</Badge>
      case 'consumable':
        return <Badge className="bg-accent-warning">Consumable</Badge>
      case 'debuff':
        return <Badge className="bg-accent-primary">Debuff</Badge>
      default:
        return null
    }
  }

  if (!character) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>

      {/* Inventory List */}
      {inventory.length === 0 ? (
        <div className="p-6 bg-bg-secondary rounded-lg border border-border text-center frosted">
          <p className="text-text-secondary">
            No items yet. Add your first item to track your gear and equipment.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {inventory.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-bg-secondary rounded-lg border border-border frosted hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold">
                      {item.item_name}
                      {(item.item_type || item.condition) && (
                        <span className="text-base font-normal text-text-secondary ml-2">
                          ({[item.item_type && item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1), item.condition].filter(Boolean).join(', ')})
                        </span>
                      )}
                    </h3>
                    {item.is_equipped && (
                      <Badge variant="outline" className="text-accent-success flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Equipped
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-text-secondary">{item.description}</p>
                  )}
                  {item.passive_effect && item.passive_effect.length > 0 && (
                    <div className="text-sm text-accent-secondary space-y-1">
                      <strong>Effects:</strong>
                      {item.passive_effect.map((effect, idx) => (
                        <div key={idx} className="ml-2">
                          • {effect.type === 'stat_modifier' && effect.stat_modifiers && (
                            <span>
                              {effect.stat_modifiers.map((sm, i) => (
                                <span key={i}>
                                  {i > 0 && ', '}
                                  {sm.modifier > 0 ? '+' : ''}{sm.modifier} to {sm.stat}
                                </span>
                              ))}
                            </span>
                          )}
                          {effect.type === 'advantage' && (
                            <span>
                              Advantage on {effect.affected_stats?.join(', ') || 'unknown'}
                              {effect.modifier && ` (${effect.modifier > 0 ? '+' : ''}${effect.modifier})`}
                            </span>
                          )}
                          {effect.type === 'disadvantage' && (
                            <span>
                              Disadvantage on {effect.affected_stats?.join(', ') || 'unknown'}
                              {effect.modifier && ` (${effect.modifier > 0 ? '+' : ''}${effect.modifier})`}
                            </span>
                          )}
                          {effect.type === 'custom' && effect.description}
                          {effect.condition && ` (when ${effect.condition})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingItem(item)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeletingItemId(item.id)}
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
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <InventoryForm
            characterId={character.id}
            onSuccess={() => setIsCreating(false)}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <InventoryForm
              item={editingItem}
              characterId={character.id}
              onSuccess={() => setEditingItem(null)}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItemId} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
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
