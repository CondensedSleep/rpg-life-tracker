import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Trait } from '@/types'
import { traitFormSchema, type TraitFormValues } from '@/lib/validations'
import { createTrait, updateTrait } from '@/lib/supabaseService'
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
import { MechanicalEffectBuilder } from './MechanicalEffectBuilder'

interface TraitFormProps {
  trait?: Trait
  characterId: string
  onSuccess: () => void
  onCancel: () => void
}

export function TraitForm({ trait, characterId, onSuccess, onCancel }: TraitFormProps) {
  const addTrait = useStore((state) => state.addTrait)
  const updateTraitInStore = useStore((state) => state.updateTrait)

  const form = useForm<TraitFormValues>({
    resolver: zodResolver(traitFormSchema),
    defaultValues: trait ? {
      trait_name: trait.trait_name,
      trait_type: trait.trait_type || 'feature',
      description: trait.description || '',
      mechanical_effect: trait.mechanical_effect || null,
      is_active: trait.is_active,
    } : {
      trait_name: '',
      trait_type: 'feature',
      description: '',
      mechanical_effect: null,
      is_active: true,
    },
  })

  const onSubmit = async (values: TraitFormValues) => {
    try {
      if (trait) {
        // Update existing trait
        const { data, error } = await updateTrait(trait.id, values)

        if (error) {
          console.error('Error updating trait:', error)
          return
        }

        if (data) {
          updateTraitInStore(trait.id, data)
        }
      } else {
        // Create new trait
        const { data, error } = await createTrait(characterId, values)

        if (error) {
          console.error('Error creating trait:', error)
          return
        }

        if (data) {
          addTrait(data)
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving trait:', error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Trait Name */}
      <div>
        <Label htmlFor="trait-name">
          Trait Name <span className="text-accent-primary">*</span>
        </Label>
        <Input
          id="trait-name"
          {...form.register('trait_name')}
          placeholder="e.g., ARTIST, ADDICT, STARGAZER"
        />
        {form.formState.errors.trait_name && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.trait_name.message}
          </p>
        )}
      </div>

      {/* Trait Type */}
      <div>
        <Label htmlFor="trait-type">
          Trait Type <span className="text-accent-primary">*</span>
        </Label>
        <Select
          value={form.watch('trait_type')}
          onValueChange={(value) => form.setValue('trait_type', value as any)}
        >
          <SelectTrigger id="trait-type">
            <SelectValue placeholder="Select trait type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feature">Feature (Positive)</SelectItem>
            <SelectItem value="flaw">Flaw (Negative)</SelectItem>
            <SelectItem value="passive">Passive</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.trait_type && (
          <p className="text-sm text-accent-primary mt-1">
            {form.formState.errors.trait_type.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Describe the trait and its narrative significance"
          rows={3}
        />
      </div>

      {/* Mechanical Effect Builder */}
      <MechanicalEffectBuilder form={form} />

      {/* Is Active */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-active"
          checked={form.watch('is_active')}
          onCheckedChange={(checked) => form.setValue('is_active', checked as boolean)}
        />
        <Label htmlFor="is-active" className="cursor-pointer">
          Trait is active
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
          {form.formState.isSubmitting ? 'Saving...' : trait ? 'Update Trait' : 'Create Trait'}
        </Button>
      </div>
    </form>
  )
}
