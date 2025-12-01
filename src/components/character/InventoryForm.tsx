import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InventoryItem } from '@/types'
import { inventoryFormSchema, type InventoryFormValues } from '@/lib/validations'
import { createInventoryItem, updateInventoryItem } from '@/lib/supabaseService'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PassiveEffectBuilder } from './PassiveEffectBuilder'

interface InventoryFormProps {
  item?: InventoryItem
  characterId: string
  onSuccess: () => void
  onCancel: () => void
}

export function InventoryForm({ item, characterId, onSuccess, onCancel }: InventoryFormProps) {
  const addItem = useStore((state) => state.addItem)
  const updateItemInStore = useStore((state) => state.updateItem)

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: item ? {
      item_name: item.item_name,
      item_type: item.item_type || 'tool',
      description: item.description || '',
      passive_effect: item.passive_effect || null,
      condition: item.condition || '',
      is_equipped: item.is_equipped,
    } : {
      item_name: '',
      item_type: 'tool',
      description: '',
      passive_effect: null,
      condition: '',
      is_equipped: true,
    },
  })

  const onSubmit = async (values: InventoryFormValues) => {
    try {
      if (item) {
        // Update existing item
        const { data, error } = await updateInventoryItem(item.id, values)

        if (error) {
          console.error('Error updating item:', error)
          return
        }

        if (data) {
          updateItemInStore(item.id, data)
        }
      } else {
        // Create new item
        const { data, error } = await createInventoryItem(characterId, values)

        if (error) {
          console.error('Error creating item:', error)
          return
        }

        if (data) {
          addItem(data)
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving item:', error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Item Name */}
      <div>
        <Label htmlFor="item-name">
          Item Name <span className="text-accent-primary">*</span>
        </Label>
        <Input
          id="item-name"
          {...form.register('item_name')}
          placeholder="e.g., 2019 MacBook Pro, Cargo pants"
        />
        {form.formState.errors.item_name && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.item_name.message}
          </p>
        )}
      </div>

      {/* Item Type */}
      <div>
        <Label htmlFor="item-type">
          Item Type <span className="text-accent-primary">*</span>
        </Label>
        <Select
          value={form.watch('item_type')}
          onValueChange={(value) => form.setValue('item_type', value as any)}
        >
          <SelectTrigger id="item-type">
            <SelectValue placeholder="Select item type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tool">Tool</SelectItem>
            <SelectItem value="comfort">Comfort</SelectItem>
            <SelectItem value="consumable">Consumable</SelectItem>
            <SelectItem value="debuff">Debuff</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.item_type && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.item_type.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="item-description">Description</Label>
        <Textarea
          id="item-description"
          {...form.register('description')}
          placeholder="Describe the item"
          rows={2}
        />
      </div>

      {/* Condition */}
      <div>
        <Label htmlFor="condition">Condition</Label>
        <Input
          id="condition"
          {...form.register('condition')}
          placeholder="e.g., worn, good, toxic"
        />
      </div>

      {/* Passive Effect Builder */}
      <PassiveEffectBuilder form={form} />

      {/* Is Equipped */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-equipped"
          checked={form.watch('is_equipped')}
          onCheckedChange={(checked) => form.setValue('is_equipped', checked as boolean)}
        />
        <Label htmlFor="is-equipped" className="cursor-pointer">
          Item is equipped
        </Label>
      </div>

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
          {form.formState.isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
