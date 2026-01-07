import { useState, useEffect } from 'react'
import { DndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { TagPalette } from './TagPalette'
import { VisualContextBuilder } from './VisualContextBuilder'
import { VisualEffectsBuilder } from './VisualEffectsBuilder'
import type { ContextNode, LogicalOperator } from '@/types/contextExpressions'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'

interface PassiveModifier {
  ability: string
  value: number
}

interface ActiveModifier {
  type: string
  value?: number
}

interface EffectFormData {
  name: string
  description: string
  effect_type: 'trait' | 'item' | 'blessing' | 'curse'
  condition: string
  context_expression: ContextNode | null
  passive_modifiers: PassiveModifier[]
  active_modifiers: ActiveModifier[]
  is_active: boolean
}

interface UnifiedEffectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  effectId?: string  // For editing existing effect
  onSuccess?: () => void
}

export function UnifiedEffectForm({ open, onOpenChange, effectId, onSuccess }: UnifiedEffectFormProps) {
  const character = useStore(state => state.character)
  const recalculateAbilities = useStore(state => state.recalculateAbilities)

  const [formData, setFormData] = useState<EffectFormData>({
    name: '',
    description: '',
    effect_type: 'trait',
    condition: '',
    context_expression: null,
    passive_modifiers: [],
    active_modifiers: [],
    is_active: true
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Load existing effect for editing
  useEffect(() => {
    if (!effectId || !open) return

    async function loadEffect() {
      const { data, error } = await supabase
        .from('effects')
        .select('*')
        .eq('id', effectId)
        .single()

      if (error) {
        setError('Failed to load effect')
        console.error(error)
        return
      }

      if (data) {
        setFormData({
          name: data.name,
          description: data.description || '',
          effect_type: data.effect_type,
          condition: data.condition || '',
          context_expression: data.context_expression || null,
          passive_modifiers: data.passive_modifiers || [],
          active_modifiers: data.active_modifiers || [],
          is_active: data.is_active
        })
      }
    }

    loadEffect()
  }, [effectId, open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        effect_type: 'trait',
        condition: '',
        context_expression: null,
        passive_modifiers: [],
        active_modifiers: [],
        is_active: true
      })
      setError('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!character?.id) {
      setError('No character found')
      return
    }

    if (!formData.name.trim()) {
      setError('Effect name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const effectData = {
        character_id: character.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        effect_type: formData.effect_type,
        condition: formData.condition.trim() || null,
        context_expression: formData.context_expression || null,
        passive_modifiers: formData.passive_modifiers,
        active_modifiers: formData.active_modifiers,
        is_active: formData.is_active
      }

      if (effectId) {
        // Update existing effect
        const { error: updateError } = await supabase
          .from('effects')
          .update(effectData)
          .eq('id', effectId)

        if (updateError) throw updateError
      } else {
        // Insert new effect
        const { error: insertError } = await supabase
          .from('effects')
          .insert(effectData)

        if (insertError) throw insertError
      }

      // Success - close dialog and trigger ability recalculation
      await recalculateAbilities()
      onOpenChange(false)
      if (onSuccess) onSuccess()

    } catch (err: any) {
      console.error('Error saving effect:', err)
      setError(err.message || 'Failed to save effect')
    } finally {
      setLoading(false)
    }
  }

  // Handle drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const dragData = active.data.current
    const dropData = over.data.current

    // Handle dropping tags into context builder
    if (dropData?.type === 'context-root' || dropData?.type === 'context-container') {
      if (dragData?.type === 'tag') {
        const tagId = active.id as string
        const tagValue = tagId.replace('tag-', '')
        
        const newNode: ContextNode = {
          tag: {
            category: dragData.category,
            value: tagValue
          }
        }

        if (dropData.type === 'context-root') {
          setFormData({ ...formData, context_expression: newNode })
        } else if (dropData.node) {
          // Add as child to existing node
          const updatedNode = {
            ...dropData.node,
            children: [...(dropData.node.children || []), newNode]
          }
          setFormData({ ...formData, context_expression: updatedNode })
        }
      } else if (dragData?.category === 'operator') {
        const opId = active.id as string
        const operator = opId.replace('op-', '').toUpperCase() as LogicalOperator
        
        const newNode: ContextNode = {
          operator,
          children: []
        }

        if (dropData.type === 'context-root') {
          setFormData({ ...formData, context_expression: newNode })
        } else if (dropData.node) {
          const updatedNode = {
            ...dropData.node,
            children: [...(dropData.node.children || []), newNode]
          }
          setFormData({ ...formData, context_expression: updatedNode })
        }
      }
    }

    // Handle dropping ability tags into passive modifiers
    if (dropData?.type === 'passive-effects' && dragData?.category === 'ability') {
      const abilityId = active.id as string
      const abilityName = abilityId.replace('tag-', '')
      
      // Check if this ability is already added
      if (!formData.passive_modifiers.some(m => m.ability === abilityName)) {
        setFormData({
          ...formData,
          passive_modifiers: [
            ...formData.passive_modifiers,
            { ability: abilityName, value: 0 }
          ]
        })
      }
    }

    // Handle dropping effect tags into active effects
    if (dropData?.type === 'active-effects' && dragData?.category === 'effect') {
      const effectId = active.id as string
      
      let newModifier: ActiveModifier | null = null

      if (effectId === 'effect-advantage') {
        newModifier = { type: 'ADVANTAGE' }
      } else if (effectId === 'effect-disadvantage') {
        newModifier = { type: 'DISADVANTAGE' }
      } else if (effectId === 'effect-d4') {
        newModifier = { type: 'BONUS_D4' }
      } else if (effectId === 'effect-d6') {
        newModifier = { type: 'BONUS_D6' }
      } else if (effectId === 'effect-d8') {
        newModifier = { type: 'BONUS_D8' }
      } else if (effectId === 'effect-d10') {
        newModifier = { type: 'BONUS_D10' }
      } else if (effectId === 'effect-d12') {
        newModifier = { type: 'BONUS_D12' }
      } else if (effectId === 'effect-active-modifier') {
        newModifier = { type: 'STAT_MODIFIER', value: 0 }
      }

      if (newModifier) {
        setFormData({
          ...formData,
          active_modifiers: [...formData.active_modifiers, newModifier]
        })
      }
    }
  }

  return (
    <>
      {open && (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
            <div className="flex h-[90vh] w-[90vw] max-w-6xl bg-card rounded-lg overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Fixed Left Sidebar - Tag Palette */}
              <div className="w-56 border-r bg-muted/30 overflow-y-auto flex-shrink-0">
                <div className="p-3 border-b bg-card sticky top-0 z-10">
                  <h3 className="font-semibold text-sm">Tag Palette</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag tags to build
                  </p>
                </div>
                <div className="p-3">
                  <TagPalette />
                </div>
              </div>

              {/* Right Content Area - Dialog */}
              <div className="flex-1 overflow-y-auto bg-card">
                <div className="p-6 max-w-3xl">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">{effectId ? 'Edit Effect' : 'Create New Effect'}</h2>
                    <p className="text-sm text-muted-foreground">
                      Define how this effect impacts your character's abilities and rolls
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={(e) => {
                    // Prevent form submission on Enter key in input fields
                    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                      e.preventDefault()
                    }
                  }}>
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Blessed, Addict, Magic Sword"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="type">Type *</Label>
                          <Select
                            value={formData.effect_type}
                            onValueChange={(v: any) => setFormData({ ...formData, effect_type: v })}
                          >
                            <SelectTrigger id="type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trait">Trait</SelectItem>
                              <SelectItem value="item">Item</SelectItem>
                              <SelectItem value="blessing">Blessing</SelectItem>
                              <SelectItem value="curse">Curse</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="What does this effect do?"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="condition">Condition (Formula)</Label>
                        <Input
                          id="condition"
                          value={formData.condition}
                          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                          placeholder="e.g., drive > 0, nutrition >= 5, or leave blank for always active"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: Condition for passive modifiers to apply (e.g., "drive &gt; 0")
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">
                          Effect is currently active
                        </Label>
                      </div>
                    </div>

                    {/* Context Expression */}
                    <div className="space-y-2">
                      <Label>Context (When Active Effects Apply)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Drag tags and operators to build nested logical expressions
                      </p>
                      <VisualContextBuilder
                        value={formData.context_expression}
                        onChange={(expression) => setFormData({ ...formData, context_expression: expression })}
                      />
                    </div>

                    {/* Effects Builder */}
                    <div className="space-y-2">
                      <Label>Effects</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Drag ability tags to create passive modifiers, or drag effect tags for active bonuses
                      </p>
                      <VisualEffectsBuilder
                        passiveModifiers={formData.passive_modifiers}
                        activeModifiers={formData.active_modifiers}
                        onPassiveModifiersChange={(modifiers) => setFormData({ ...formData, passive_modifiers: modifiers })}
                        onActiveModifiersChange={(modifiers) => setFormData({ ...formData, active_modifiers: modifiers })}
                      />
                    </div>

                    {error && (
                      <div className="text-sm text-destructive bg-destructive/10 border border-destructive rounded p-2">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : effectId ? 'Update Effect' : 'Create Effect'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </DndContext>
      )}
    </>
  )
}
