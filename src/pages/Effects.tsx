import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit2, Trash2, Power, PowerOff } from 'lucide-react'
import { UnifiedEffectForm } from '@/components/effects/UnifiedEffectForm'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { expressionToString } from '@/types/contextExpressions'

interface UnifiedEffect {
  id: string
  name: string
  description: string | null
  effect_type: 'trait' | 'item' | 'blessing' | 'curse'
  condition: string | null
  context_expression: any
  passive_modifiers: Array<{ ability: string; value: number }>
  active_modifiers: Array<{ type: string; value?: number }>
  is_active: boolean
  created_at: string
}

export function Effects() {
  const character = useStore(state => state.character)
  const recalculateAbilities = useStore(state => state.recalculateAbilities)
  
  const [effects, setEffects] = useState<UnifiedEffect[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'trait' | 'item' | 'blessing' | 'curse'>('all')
  const [showFormFor, setShowFormFor] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (character?.id) {
      loadEffects()
    }
  }, [character?.id])

  async function loadEffects() {
    if (!character?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('effects')
        .select('*')
        .eq('character_id', character.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEffects(data || [])
    } catch (error) {
      console.error('Error loading effects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(effectId: string, currentlyActive: boolean) {
    try {
      const { error } = await supabase
        .from('effects')
        .update({ is_active: !currentlyActive })
        .eq('id', effectId)

      if (error) throw error

      await recalculateAbilities()
      await loadEffects()
    } catch (error) {
      console.error('Error toggling effect:', error)
    }
  }

  async function deleteEffect(effectId: string) {
    if (!confirm('Are you sure you want to delete this effect?')) return

    try {
      const { error } = await supabase
        .from('effects')
        .delete()
        .eq('id', effectId)

      if (error) throw error

      await recalculateAbilities()
      await loadEffects()
    } catch (error) {
      console.error('Error deleting effect:', error)
    }
  }

  const filteredEffects = effects.filter(effect => {
    const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          effect.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || effect.effect_type === filterType
    return matchesSearch && matchesType
  })

  const groupedEffects = {
    trait: filteredEffects.filter(e => e.effect_type === 'trait'),
    item: filteredEffects.filter(e => e.effect_type === 'item'),
    blessing: filteredEffects.filter(e => e.effect_type === 'blessing'),
    curse: filteredEffects.filter(e => e.effect_type === 'curse'),
  }

  function openCreateForm() {
    setShowFormFor(null)
    setFormOpen(true)
  }

  function openEditForm(effectId: string) {
    setShowFormFor(effectId)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    loadEffects()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-12">Loading effects...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold">Effects</h1>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          New Effect
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'trait', 'item', 'blessing', 'curse'] as const).map(type => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Effects List */}
      {filteredEffects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No effects found.</p>
          <Button onClick={openCreateForm} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Effect
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEffects).map(([type, typeEffects]) => {
            if (typeEffects.length === 0) return null

            return (
              <div key={type}>
                <h2 className="text-2xl font-bold mb-3 capitalize">{type}s</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {typeEffects.map(effect => (
                    <div
                      key={effect.id}
                      className={`border rounded-lg p-4 ${
                        effect.is_active ? 'bg-card' : 'bg-card/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{effect.name}</h3>
                          {effect.description && (
                            <p className="text-sm text-muted-foreground mt-1">{effect.description}</p>
                          )}
                        </div>
                        <Badge variant={effect.effect_type === 'curse' ? 'destructive' : 'secondary'}>
                          {effect.effect_type}
                        </Badge>
                      </div>

                      {/* Passive Modifiers */}
                      {effect.passive_modifiers.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Passive:</div>
                          <div className="flex flex-wrap gap-1">
                            {effect.passive_modifiers.map((mod, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {mod.ability}: {mod.value >= 0 ? '+' : ''}{mod.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active Modifiers */}
                      {effect.active_modifiers.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Active:</div>
                          <div className="flex flex-wrap gap-1">
                            {effect.active_modifiers.map((mod, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {mod.type}
                                {mod.value !== undefined && `: ${mod.value >= 0 ? '+' : ''}${mod.value}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Context Expression */}
                      {effect.context_expression && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Context:</div>
                          <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                            {expressionToString(effect.context_expression)}
                          </div>
                        </div>
                      )}

                      {/* Condition */}
                      {effect.condition && (
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Condition:</div>
                          <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                            {effect.condition}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(effect.id, effect.is_active)}
                          className="flex-1"
                        >
                          {effect.is_active ? (
                            <>
                              <PowerOff className="h-3 w-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="h-3 w-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(effect.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteEffect(effect.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Dialog */}
      <UnifiedEffectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        effectId={showFormFor || undefined}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
