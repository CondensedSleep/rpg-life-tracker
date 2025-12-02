import { useEffect, useState } from 'react'
import { useCharacter, useCoreStats, useAbilities, useStore } from '@/store'
import { calculateTotalModifier } from '@/lib/calculations'
import { getDailyRoll } from '@/lib/journalService'
import { useNavigate } from 'react-router-dom'
import type { DailyRoll, CoreStatName, Trait, InventoryItem } from '@/types'
import { TraitForm } from '@/components/character/TraitForm'
import { InventoryForm } from '@/components/character/InventoryForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Plus, Edit2, Trash2, RefreshCw, Moon, AlertTriangle } from 'lucide-react'
import { deleteTrait, deleteInventoryItem, levelUpCharacter, takeLongRest as takeLongRestService } from '@/lib/supabaseService'
import { recalculateAbilityValues } from '@/lib/abilityService'
import { getTodayLocalDate } from '@/lib/dateUtils'
import { loadDataFromSupabase } from '@/lib/loadSeedData'

export function Dashboard() {
  const character = useCharacter()
  const coreStats = useCoreStats()
  const abilities = useAbilities()
  const traits = useStore((state) => state.traits)
  const inventory = useStore((state) => state.inventory)
  const removeTrait = useStore((state) => state.removeTrait)
  const removeInventoryItem = useStore((state) => state.removeInventoryItem)
  const levelUp = useStore((state) => state.levelUp)
  const hitDice = useStore((state) => state.hitDice)
  const setHitDice = useStore((state) => state.setHitDice)
  const takeLongRest = useStore((state) => state.takeLongRest)
  const [todayRoll, setTodayRoll] = useState<DailyRoll | null>(null)
  const navigate = useNavigate()

  // Trait modals
  const [isCreatingTrait, setIsCreatingTrait] = useState(false)
  const [editingTrait, setEditingTrait] = useState<Trait | null>(null)
  const [deletingTraitId, setDeletingTraitId] = useState<string | null>(null)

  // Inventory modals
  const [isCreatingInventory, setIsCreatingInventory] = useState(false)
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null)
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null)

  // Level up modal
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [selectedAbilityForLevelUp, setSelectedAbilityForLevelUp] = useState<string | null>(null)

  const today = getTodayLocalDate()

  // Check if character is ready to level up
  const isReadyToLevelUp = character && character.current_xp >= character.xp_to_next_level

  // Auto-show level up modal when ready
  useEffect(() => {
    if (isReadyToLevelUp && !showLevelUpModal) {
      setShowLevelUpModal(true)
    }
  }, [isReadyToLevelUp])

  // Debug: Log trait statuses and abilities
  useEffect(() => {
    if (traits.length > 0 && abilities.length > 0) {
      console.log('📊 Dashboard loaded - Trait statuses:')
      traits.forEach(trait => {
        console.log(`  ${trait.trait_name}: is_active=${trait.is_active}`, trait.mechanical_effect)
      })
      console.log('📊 Current abilities:')
      const driveAbility = abilities.find(a => a.ability_name === 'drive')
      console.log(`  drive: ${driveAbility?.current_value}`)
    }
  }, [traits, abilities])

  const handleDeleteTrait = async () => {
    if (!deletingTraitId) return
    const { error } = await deleteTrait(deletingTraitId)
    if (!error) {
      removeTrait(deletingTraitId)
      setDeletingTraitId(null)
    }
  }

  const handleDeleteInventory = async () => {
    if (!deletingInventoryId) return
    const { error } = await deleteInventoryItem(deletingInventoryId)
    if (!error) {
      removeInventoryItem(deletingInventoryId)
      setDeletingInventoryId(null)
    }
  }

  const handleManualRecalculation = async () => {
    if (!character) return
    console.log('🔄 Manually triggering recalculation...')
    await recalculateAbilityValues(character.id)
    // Force re-fetch of data by navigating
    window.location.reload()
  }

  const handleLevelUp = async () => {
    if (!selectedAbilityForLevelUp || !character) return

    console.log('🌟 Leveling up with ability:', selectedAbilityForLevelUp)

    // Persist to database
    const { error } = await levelUpCharacter(character.id, selectedAbilityForLevelUp)

    if (error) {
      console.error('Error leveling up:', error)
      alert('Failed to level up: ' + error.message)
      return
    }

    // Update local state
    levelUp(selectedAbilityForLevelUp)

    // Reload data from database to ensure sync
    await loadDataFromSupabase(character.user_id)

    setShowLevelUpModal(false)
    setSelectedAbilityForLevelUp(null)

    console.log('✅ Level up complete!')
  }

  // Get abilities eligible for level up (used 5+ times this level)
  const eligibleAbilities = abilities.filter(a => a.times_used_this_level >= 5)

  const handleTakeLongRest = async () => {
    if (!character || !hitDice) return

    const confirmRest = window.confirm(
      `Take a long rest? This will:\n\n` +
      `• Restore all hit dice (${hitDice.current_hit_dice}/${hitDice.max_hit_dice} → ${hitDice.max_hit_dice}/${hitDice.max_hit_dice})\n` +
      `• Reset exhaustion level to 0\n` +
      `${hitDice.days_at_zero >= 3 ? '⚠️ Warning: You have been at 0 hit dice for ' + hitDice.days_at_zero + ' days. This may increase exhaustion.' : ''}`
    )

    if (!confirmRest) return

    console.log('🛌 Taking long rest...')

    // Persist to database
    const { data, error } = await takeLongRestService(character.id)

    if (error) {
      console.error('Error taking rest:', error)
      alert('Failed to rest: ' + error.message)
      return
    }

    // Update local state
    takeLongRest()

    // Reload data
    await loadDataFromSupabase(character.user_id)

    console.log('✅ Rest complete!', data)
  }

  useEffect(() => {
    if (character) {
      getDailyRoll(character.id, today).then(({ data }) => {
        setTodayRoll(data)
      })
    }
  }, [character, today])

  if (!character || !coreStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-secondary">Loading character data...</p>
      </div>
    )
  }

  const dayStateInfo = {
    difficult: { label: 'Difficult Terrain', emoji: '⚠️', color: 'text-accent-primary' },
    normal: { label: 'Normal Day', emoji: '📅', color: 'text-text-primary' },
    inspiration: { label: 'Inspiration', emoji: '✨', color: 'text-accent-success' },
    critical: { label: 'Critical Day', emoji: '🌟', color: 'text-accent-warning' },
  }

  const currentDayInfo = todayRoll 
    ? dayStateInfo[todayRoll.day_state]
    : null

  // Group abilities by core stat for aligned display
  const statOrder: CoreStatName[] = ['body', 'mind', 'heart', 'soul']
  const abilitiesByCoreStat = statOrder.map(statName => ({
    stat: statName,
    abilities: abilities.filter(a => a.core_stat === statName)
  }))

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* ================================================================
          SECTION 1: Character Info + Day State + Hit Dice
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Character Info + XP */}
        <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-bold">{character.name}</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRecalculation}
              title="Recalculate trait statuses"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-text-secondary mb-4">
            {character.class} • Level {character.level}
          </p>
          
          {/* XP Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>XP: {character.current_xp} / {character.xp_to_next_level}</span>
              {isReadyToLevelUp ? (
                <button
                  onClick={() => setShowLevelUpModal(true)}
                  className="text-accent-warning font-bold hover:underline"
                >
                  🌟 Ready to Level Up!
                </button>
              ) : (
                <span className="text-text-secondary">Next Level: {character.level + 1}</span>
              )}
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  isReadyToLevelUp ? 'bg-accent-warning animate-pulse' : 'bg-accent-primary'
                }`}
                style={{
                  width: `${Math.min((character.current_xp / character.xp_to_next_level) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Day State */}
        <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
          <h2 className="text-lg font-semibold mb-3">Today's State</h2>
          
          {todayRoll && currentDayInfo ? (
            <div>
              <div className={`text-2xl font-bold mb-2 ${currentDayInfo.color}`}>
                {currentDayInfo.emoji} {currentDayInfo.label}
              </div>
              <div className="text-sm text-text-secondary space-y-1">
                <div>Roll: {todayRoll.roll_value}</div>
                {todayRoll.day_state === 'difficult' && todayRoll.affected_stats && (
                  <div>Disadvantage on: <span className="uppercase">{todayRoll.affected_stats.join(', ')}</span></div>
                )}
                {todayRoll.day_state === 'inspiration' && todayRoll.affected_stats && todayRoll.affected_stats[0] && (
                  <div>Advantage on: <span className="uppercase">{todayRoll.affected_stats[0]}</span></div>
                )}
                {todayRoll.day_state === 'critical' && (
                  <div className="text-accent-warning">XP multiplier: 2x</div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-text-secondary mb-3">No daily roll logged yet</div>
              <button
                onClick={() => navigate('/journal')}
                className="px-4 py-2 bg-accent-secondary text-white rounded-md hover:bg-accent-secondary/80 transition-colors"
              >
                Log Daily Roll
              </button>
            </div>
          )}
        </div>

        {/* Third: Hit Dice & Rest */}
        <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
          <h2 className="text-lg font-semibold mb-3">Hit Dice</h2>

          {hitDice ? (
            <div className="space-y-4">
              {/* Hit Dice Display */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-secondary">Current / Max</span>
                  <span className={`text-2xl font-bold ${
                    hitDice.current_hit_dice === 0
                      ? 'text-accent-primary'
                      : hitDice.current_hit_dice <= hitDice.max_hit_dice / 3
                        ? 'text-accent-warning'
                        : 'text-accent-success'
                  }`}>
                    {hitDice.current_hit_dice} / {hitDice.max_hit_dice}
                  </span>
                </div>

                {/* Visual Hit Dice Pips */}
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: hitDice.max_hit_dice }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded border-2 ${
                        i < hitDice.current_hit_dice
                          ? 'bg-accent-success border-accent-success'
                          : 'border-border bg-bg-tertiary'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Exhaustion & Warning */}
              {(hitDice.exhaustion_level > 0 || hitDice.days_at_zero > 0) && (
                <div className="space-y-2">
                  {hitDice.exhaustion_level > 0 && (
                    <div className="flex items-center gap-2 text-accent-primary text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Exhaustion Level: {hitDice.exhaustion_level}</span>
                    </div>
                  )}
                  {hitDice.days_at_zero > 0 && (
                    <div className="flex items-center gap-2 text-accent-warning text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Days at 0: {hitDice.days_at_zero}/3</span>
                    </div>
                  )}
                </div>
              )}

              {/* Long Rest Button */}
              <Button
                onClick={handleTakeLongRest}
                className="w-full bg-accent-secondary hover:bg-accent-secondary/80"
                disabled={hitDice.current_hit_dice === hitDice.max_hit_dice && hitDice.exhaustion_level === 0}
              >
                <Moon className="w-4 h-4 mr-2" />
                Take Long Rest
              </Button>

              {hitDice.last_long_rest && (
                <div className="text-xs text-text-secondary text-center">
                  Last rest: {hitDice.last_long_rest}
                </div>
              )}
            </div>
          ) : (
            <div className="text-text-secondary text-sm">
              Loading hit dice...
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          SECTION 2: Stats + Abilities + Traits + Inventory (4 columns)
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-20 gap-4">
        {/* Columns 1-2: Core Stats + Abilities (40% total width) */}
        <div className="lg:col-span-8 flex gap-4">
          {/* Core Stats Column */}
          <div className="flex-none w-[37.5%] space-y-3">
            {statOrder.map(statName => {
              const stat = coreStats[statName]
              if (!stat) return null
              
              return (
                <div
                  key={statName}
                  className="p-4 bg-bg-secondary rounded-lg border border-border frosted text-center flex flex-col justify-center"
                  style={{ height: '120px' }}
                >
                  <div className="text-xs uppercase font-bold text-text-secondary mb-1">
                    {statName}
                  </div>
                  <div className="text-3xl font-bold text-accent-secondary">
                    {stat.current_value}
                  </div>
                  <div className="text-sm text-text-secondary">
                    ({stat.modifier >= 0 ? '+' : ''}{stat.modifier})
                  </div>
                </div>
              )
            })}
          </div>

          {/* Abilities Column */}
          <div className="flex-1 space-y-3">
            {abilitiesByCoreStat.map(({ stat, abilities: statAbilities }) => (
              <div
                key={stat}
                className="p-4 bg-bg-secondary rounded-lg border border-border frosted flex items-center"
                style={{ height: '120px' }}
              >
                <div className="w-full space-y-1">
                  {statAbilities.map(ability => {
                    // Calculate total modifier with traits and inventory effects
                    const modifierCalc = calculateTotalModifier(
                      ability.ability_name,
                      ability.base_value,
                      abilities,
                      traits,
                      inventory,
                      {
                        state: todayRoll?.day_state || 'normal',
                        affectedStats: todayRoll?.affected_stats || [],
                        selectedStat: todayRoll?.affected_stats?.[0],
                      }
                    )

                    const displayValue = modifierCalc.total
                    const hasModifiers = modifierCalc.breakdown.length > 1

                    return (
                      <div key={ability.id} className="flex justify-between text-sm">
                        <span className="uppercase text-xs text-text-secondary">
                          {ability.ability_name}
                        </span>
                        <span
                          className="font-semibold text-accent-secondary"
                          title={
                            hasModifiers
                              ? modifierCalc.breakdown
                                  .map((b) => `${b.source}: ${b.value >= 0 ? '+' : ''}${b.value}`)
                                  .join('\n')
                              : undefined
                          }
                        >
                          {displayValue >= 0 ? '+' : ''}{displayValue}
                          {hasModifiers && (
                            <span className="text-accent-warning ml-1" title="Modified by traits/items">
                              *
                            </span>
                          )}
                          {modifierCalc.hasAdvantage && (
                            <span className="text-accent-success ml-1" title="Has advantage">
                              ↑
                            </span>
                          )}
                          {modifierCalc.hasDisadvantage && (
                            <span className="text-accent-primary ml-1" title="Has disadvantage">
                              ↓
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Traits (6 cols = 30% width) */}
        <div className="lg:col-span-6">
          <div className="p-4 bg-bg-secondary rounded-lg border border-border frosted h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Traits</h3>
              <Button size="sm" onClick={() => setIsCreatingTrait(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {traits.length === 0 ? (
                <p className="text-sm text-text-secondary">No traits yet</p>
              ) : (
                traits.map(trait => (
                  <div key={trait.id} className="text-sm group hover:bg-bg-tertiary/50 p-2 -mx-2 rounded transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase">{trait.trait_name}</span>
                          <span className="text-xs text-text-secondary capitalize">({trait.trait_type})</span>
                          <span className={`text-xs ${trait.is_active ? 'text-accent-success' : 'text-text-secondary'}`}>
                            {trait.is_active ? '●' : '○'}
                          </span>
                        </div>
                        {trait.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{trait.description}</p>
                        )}
                        {trait.mechanical_effect && trait.mechanical_effect.length > 0 && (
                          <div className="text-xs text-accent-secondary mt-1">
                            {trait.mechanical_effect.map((effect, idx) => (
                              <div key={idx}>
                                {effect.type === 'stat_modifier' && effect.stat_modifiers && (
                                  <span>
                                    {effect.stat_modifiers.map((sm, i) => (
                                      <span key={i}>
                                        {i > 0 && ', '}
                                        {sm.modifier > 0 ? '+' : ''}{sm.modifier} <span className="uppercase">{sm.stat}</span>
                                      </span>
                                    ))}
                                  </span>
                                )}
                                {effect.type === 'advantage' && (
                                  <span>Advantage on <span className="uppercase">{effect.affected_stats?.join(', ')}</span></span>
                                )}
                                {effect.type === 'disadvantage' && (
                                  <span>Disadvantage on <span className="uppercase">{effect.affected_stats?.join(', ')}</span></span>
                                )}
                                {effect.condition && (
                                  <span className="text-text-secondary italic"> ({effect.condition})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditingTrait(trait)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setDeletingTraitId(trait.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 4: Inventory (6 cols = 30% width) */}
        <div className="lg:col-span-6">
          <div className="p-4 bg-bg-secondary rounded-lg border border-border frosted h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Inventory</h3>
              <Button size="sm" onClick={() => setIsCreatingInventory(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {inventory.length === 0 ? (
                <p className="text-sm text-text-secondary">No items yet</p>
              ) : (
                inventory.filter(item => item.is_equipped).map(item => (
                  <div key={item.id} className="text-sm group hover:bg-bg-tertiary/50 p-2 -mx-2 rounded transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.item_name}</span>
                          <span className="text-xs text-text-secondary capitalize">({item.item_type})</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
                        )}
                                                {item.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
                        )}
                        {item.passive_effect && item.passive_effect.length > 0 && (
                          <div className="text-xs text-accent-secondary mt-1">
                            {item.passive_effect.map((effect, idx) => (
                              <div key={idx}>
                                {effect.type === 'stat_modifier' && effect.stat_modifiers && (
                                  <span>
                                    {effect.stat_modifiers.map((sm, i) => (
                                      <span key={i}>
                                        {i > 0 && ', '}
                                        {sm.modifier > 0 ? '+' : ''}{sm.modifier} <span className="uppercase">{sm.stat}</span>
                                      </span>
                                    ))}
                                  </span>
                                )}
                                {effect.type === 'advantage' && (
                                  <span>Advantage on <span className="uppercase">{effect.affected_stats?.join(', ')}</span></span>
                                )}
                                {effect.type === 'disadvantage' && (
                                  <span>Disadvantage on <span className="uppercase">{effect.affected_stats?.join(', ')}</span></span>
                                )}
                                {effect.condition && (
                                  <span className="text-text-secondary italic"> ({effect.condition})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.condition && (
                          <p className="text-xs text-text-secondary italic mt-1">Active: {item.condition}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditingInventory(item)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setDeletingInventoryId(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 3: Quick Log Form
          ================================================================ */}
      <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
        <h2 className="text-xl font-semibold mb-4">Quick Log</h2>
        <div className="text-text-secondary text-center py-8">
          <p className="mb-4">Log rolls and actions without navigating to the journal</p>
          <p className="text-sm italic">Quick log form coming soon...</p>
          <button
            onClick={() => navigate('/journal')}
            className="mt-4 px-6 py-2 bg-accent-secondary text-white rounded-md hover:bg-accent-secondary/80 transition-colors"
          >
            Go to Journal
          </button>
        </div>
      </div>

      {/* Trait Modals */}
      <Dialog open={isCreatingTrait} onOpenChange={setIsCreatingTrait}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trait</DialogTitle>
          </DialogHeader>
          <TraitForm onClose={() => setIsCreatingTrait(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTrait} onOpenChange={(open) => !open && setEditingTrait(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trait</DialogTitle>
          </DialogHeader>
          {editingTrait && (
            <TraitForm trait={editingTrait} onClose={() => setEditingTrait(null)} />
          )}
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={handleDeleteTrait}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inventory Modals */}
      <Dialog open={isCreatingInventory} onOpenChange={setIsCreatingInventory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Inventory Item</DialogTitle>
          </DialogHeader>
          <InventoryForm onClose={() => setIsCreatingInventory(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingInventory} onOpenChange={(open) => !open && setEditingInventory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {editingInventory && (
            <InventoryForm item={editingInventory} onClose={() => setEditingInventory(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingInventoryId} onOpenChange={(open) => !open && setDeletingInventoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInventory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Level Up Modal */}
      <Dialog open={showLevelUpModal} onOpenChange={setShowLevelUpModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">🌟 Level Up!</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-2">
                Congratulations! You've reached <span className="font-bold text-accent-warning">Level {character?.level ? character.level + 1 : 1}</span>
              </p>
              <p className="text-sm text-text-secondary">
                Choose an ability to increase by +1
              </p>
            </div>

            {/* Eligible Abilities */}
            {eligibleAbilities.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-text-secondary uppercase">
                  Eligible Abilities (Used 5+ times this level)
                </h3>
                <div className="grid gap-2">
                  {eligibleAbilities.map(ability => (
                    <button
                      key={ability.id}
                      onClick={() => setSelectedAbilityForLevelUp(ability.ability_name)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedAbilityForLevelUp === ability.ability_name
                          ? 'border-accent-success bg-accent-success/10'
                          : 'border-border bg-bg-secondary hover:border-accent-secondary'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold uppercase text-lg">{ability.ability_name}</div>
                          <div className="text-sm text-text-secondary">
                            {ability.core_stat} • Used {ability.times_used_this_level} times
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent-secondary">
                            {ability.base_value} → {ability.base_value + 1}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-bg-tertiary rounded-lg border border-border text-center">
                <p className="text-text-secondary">
                  No abilities are eligible for advancement yet.
                  <br />
                  <span className="text-sm">Use an ability 5+ times to make it eligible.</span>
                </p>
              </div>
            )}

            {/* All Abilities (for reference) */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-text-secondary uppercase">
                All Abilities
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {abilities
                  .filter(a => !eligibleAbilities.find(e => e.id === a.id))
                  .map(ability => (
                    <div
                      key={ability.id}
                      className="p-3 rounded-lg bg-bg-tertiary border border-border opacity-60"
                    >
                      <div className="font-semibold uppercase text-sm">{ability.ability_name}</div>
                      <div className="text-xs text-text-secondary">
                        Used {ability.times_used_this_level}/5 times
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Confirm Button */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLevelUpModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLevelUp}
                disabled={!selectedAbilityForLevelUp}
                className="bg-accent-success hover:bg-accent-success/80"
              >
                Confirm Level Up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

