import { useState } from 'react'
import type { CoreStat, Ability } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EditInitialValuesFormProps {
  isOpen: boolean
  item: CoreStat | Ability | null
  itemType: 'stat' | 'ability'
  onSave: (value: number) => Promise<void>
  onCancel: () => void
}

export function EditInitialValuesForm({
  isOpen,
  item,
  itemType,
  onSave,
  onCancel,
}: EditInitialValuesFormProps) {
  const [value, setValue] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel()
    }
  }

  const handleItemChange = () => {
    if (item) {
      if (itemType === 'stat') {
        const stat = item as CoreStat
        setValue(stat.base_value)
      } else {
        const ability = item as Ability
        setValue(ability.base_value)
      }
      setError(null)
    }
  }

  // Update value when item changes
  if (isOpen && item && value === 0 && item) {
    handleItemChange()
  }

  const getDisplayName = () => {
    if (!item) return ''
    if (itemType === 'stat') {
      return (item as CoreStat).stat_name
    } else {
      return (item as Ability).ability_name
    }
  }

  const handleSave = async () => {
    if (value < 1 || value > 20) {
      setError('Value must be between 1 and 20')
      return
    }

    setLoading(true)
    try {
      await onSave(value)
      onCancel()
    } catch (err) {
      setError((err as Error).message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {itemType === 'stat' ? 'Core Stat' : 'Ability'} Initial Value
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">
                {getDisplayName().toUpperCase()}
              </Label>
              <p className="text-sm text-secondary mb-3">
                Current initial value: {itemType === 'stat' ? (item as CoreStat).base_value : (item as Ability).base_value}
              </p>
            </div>

            <div>
              <Label htmlFor="value-input">New Initial Value</Label>
              <Input
                id="value-input"
                type="number"
                min="1"
                max="20"
                value={value}
                onChange={(e) => {
                  setValue(parseInt(e.target.value) || 0)
                  setError(null)
                }}
              />
              <p className="text-xs text-secondary mt-1">
                Must be between 1 and 20
              </p>
            </div>

            {error && (
              <p className="text-sm text-accent-primary">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
