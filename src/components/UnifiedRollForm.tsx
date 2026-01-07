// ============================================================================
// Unified Roll Form Component
// ============================================================================
// Tag-based UI for logging any type of roll with live preview

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/store'
import { executeRoll } from '@/lib/rollSystem'
import { logRollWithTags, buildAutoTags } from '@/lib/taggedRollSystem'
import { loadDataFromSupabase } from '@/lib/loadSeedData'
import type {
  RollTags,
  RollTypeTag,
  DiceTag,
  DieRoll,
  ModifierTag,
} from '@/types/tags'
import type { RollResult } from '@/types/rolls'
import {
  getDisplayLabel,
  getTotalDiceValue,
  getD20Value,
  isCriticalSuccess,
  isCriticalFailure,
  isMutuallyExclusive,
  TagCategory,
  RollTypeTag as RollTypeValues,
  DiceTag as DiceValues,
  ModifierTag as ModifierValues,
} from '@/types/tags'
import { RollType } from '@/types/rolls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TagOption {
  value: string
  label: string
  category: TagCategory
}

export function UnifiedRollForm() {
  const character = useStore((state) => state.character)
  const abilities = useStore((state) => state.abilities)
  const traits = useStore((state) => state.traits)
  const inventory = useStore((state) => state.inventory)

  // Tag state
  const [tags, setTags] = useState<RollTags>({
    dice: [{ die: DiceValues.D20, value: 0 }], // Default to d20
    modifiers: [],
    customModifiers: [],
    traits: [],
    items: [],
    effects: [],
    organizational: [],
  })

  // Dice values (separate state for inputs)
  const [diceValues, setDiceValues] = useState<Record<string, number>>({
    'd20': 0,
  })

  // Preview state
  const [preview, setPreview] = useState<RollResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // DC input
  const [dc, setDc] = useState<number | undefined>(undefined)

  // Notes input
  const [notes, setNotes] = useState('')

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Available tag options based on current state
   */
  const availableOptions = useMemo(() => {
    const options: TagOption[] = []

    // Roll types
    Object.entries(RollTypeValues).forEach(([_key, value]) => {
      options.push({
        value,
        label: getDisplayLabel(value),
        category: TagCategory.ROLL_TYPE,
      })
    })

    // Abilities
    abilities.forEach((ability) => {
      options.push({
        value: ability.ability_name,
        label: ability.ability_name,
        category: TagCategory.ABILITY,
      })
    })

    // Dice types (excluding ones already selected)
    Object.entries(DiceValues).forEach(([_key, value]) => {
      options.push({
        value,
        label: getDisplayLabel(value),
        category: TagCategory.DICE,
      })
    })

    // Modifiers
    options.push({
      value: ModifierValues.ADVANTAGE,
      label: getDisplayLabel(ModifierValues.ADVANTAGE),
      category: TagCategory.MODIFIERS,
    })
    options.push({
      value: ModifierValues.DISADVANTAGE,
      label: getDisplayLabel(ModifierValues.DISADVANTAGE),
      category: TagCategory.MODIFIERS,
    })

    // Traits (user can manually add)
    traits.forEach((trait) => {
      options.push({
        value: trait.id,
        label: trait.trait_name,
        category: TagCategory.TRAITS,
      })
    })

    // Items (user can manually add)
    inventory.forEach((item) => {
      options.push({
        value: item.id,
        label: item.item_name,
        category: TagCategory.ITEMS,
      })
    })

    return options
  }, [abilities, traits, inventory])

  /**
   * Handle adding a tag
   */
  const handleAddTag = (option: TagOption) => {
    const category = option.category

    // Handle mutually exclusive categories
    if (isMutuallyExclusive(category)) {
      if (category === TagCategory.ROLL_TYPE) {
        setTags((prev) => ({ ...prev, rollType: option.value as RollTypeTag }))
      } else if (category === TagCategory.ABILITY) {
        setTags((prev) => ({ ...prev, ability: option.value }))
        // Auto-add core stat
        const ability = abilities.find((a) => a.ability_name === option.value)
        if (ability) {
          setTags((prev) => ({ ...prev, coreStat: ability.core_stat }))
        }
      } else if (category === TagCategory.CORE_STAT) {
        setTags((prev) => ({ ...prev, coreStat: option.value }))
      }
    } else if (category === TagCategory.DICE) {
      // Add new die
      const newDie: DieRoll = { die: option.value as DiceTag, value: 0 }
      setTags((prev) => ({
        ...prev,
        dice: [...prev.dice, newDie],
      }))
      setDiceValues((prev) => ({ ...prev, [option.value]: 0 }))
    } else if (category === TagCategory.MODIFIERS) {
      // Add modifier (check for conflicts)
      const modifier = option.value as ModifierTag
      setTags((prev) => {
        const modifiers = [...prev.modifiers]
        if (modifier === ModifierValues.ADVANTAGE) {
          // Remove disadvantage if present, check for flat
          const hasDisadvantage = modifiers.includes(ModifierValues.DISADVANTAGE)
          if (hasDisadvantage) {
            // Remove both, add flat
            return {
              ...prev,
              modifiers: [ModifierValues.FLAT],
            }
          }
          return { ...prev, modifiers: [...modifiers, modifier] }
        } else if (modifier === ModifierValues.DISADVANTAGE) {
          const hasAdvantage = modifiers.includes(ModifierValues.ADVANTAGE)
          if (hasAdvantage) {
            return {
              ...prev,
              modifiers: [ModifierValues.FLAT],
            }
          }
          return { ...prev, modifiers: [...modifiers, modifier] }
        }
        return { ...prev, modifiers: [...modifiers, modifier] }
      })
    } else if (category === TagCategory.TRAITS) {
      const trait = traits.find((t) => t.id === option.value)
      if (trait) {
        setTags((prev) => ({
          ...prev,
          traits: [
            ...prev.traits,
            { id: trait.id, name: trait.trait_name, isUserAdded: true },
          ],
        }))
      }
    } else if (category === TagCategory.ITEMS) {
      const item = inventory.find((i) => i.id === option.value)
      if (item) {
        setTags((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            { id: item.id, name: item.item_name, isUserAdded: true },
          ],
        }))
      }
    }
  }

  /**
   * Handle removing a tag
   */
  const handleRemoveTag = (category: TagCategory, value: string) => {
    if (category === TagCategory.ROLL_TYPE) {
      setTags((prev) => ({ ...prev, rollType: undefined }))
    } else if (category === TagCategory.ABILITY) {
      setTags((prev) => ({ ...prev, ability: undefined, coreStat: undefined }))
    } else if (category === TagCategory.CORE_STAT) {
      setTags((prev) => ({ ...prev, coreStat: undefined }))
    } else if (category === TagCategory.DICE) {
      setTags((prev) => ({
        ...prev,
        dice: prev.dice.filter((d) => d.die !== value),
      }))
      setDiceValues((prev) => {
        const updated = { ...prev }
        delete updated[value]
        return updated
      })
    } else if (category === TagCategory.MODIFIERS) {
      setTags((prev) => ({
        ...prev,
        modifiers: prev.modifiers.filter((m) => m !== value),
      }))
    } else if (category === TagCategory.TRAITS) {
      setTags((prev) => ({
        ...prev,
        traits: prev.traits.filter((t) => t.id !== value),
      }))
    } else if (category === TagCategory.ITEMS) {
      setTags((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== value),
      }))
    }
  }

  /**
   * Handle die value change
   */
  const handleDieValueChange = (die: DiceTag, value: number) => {
    setDiceValues((prev) => ({ ...prev, [die]: value }))
    setTags((prev) => ({
      ...prev,
      dice: prev.dice.map((d) => (d.die === die ? { ...d, value } : d)),
    }))
  }

  /**
   * Auto-add relevant tags based on current selections
   */
  const handleAutoAddTags = async () => {
    if (!character || !tags.rollType || !tags.ability) return

    try {
      // Update dice values in tags
      const updatedDice = tags.dice.map((d) => ({
        ...d,
        value: diceValues[d.die] || 0,
      }))

      // Calculate total dice value
      const totalDiceValue = getTotalDiceValue(updatedDice)
      const d20Value = getD20Value(updatedDice) || totalDiceValue

      // Map roll type tag to RollType
      const rollTypeMap: Record<string, RollType> = {
        ability_check: RollType.ABILITY_CHECK,
        saving_throw: RollType.SAVING_THROW,
        attack: RollType.ATTACK,
        damage: RollType.DAMAGE,
        initiative: RollType.INITIATIVE,
      }

      // Execute roll to get relevant effects
      const result = await executeRoll({
        characterId: character.id,
        type: rollTypeMap[tags.rollType],
        d20Value,
        abilityName: tags.ability,
        dc: dc,
        manualAdvantage: tags.modifiers.includes(ModifierValues.ADVANTAGE),
        manualDisadvantage: tags.modifiers.includes(ModifierValues.DISADVANTAGE),
        baseXP: dc ? 10 : 0,
      })

      console.log('Roll result:', result)
      console.log('Active effects:', result.activeEffects)
      console.log('Active effects detail:', result.activeEffects.map(e => ({
        id: e.id,
        source: e.source,
        type: e.type,
        appliesTo: e.appliesTo,
        statModifiers: e.statModifiers,
        affectedStats: e.affectedStats,
      })))
      console.log('Modifier breakdown:', result.modifierBreakdown)
      console.log('Has advantage:', result.hasAdvantage)
      console.log('Has disadvantage:', result.hasDisadvantage)

      // Build new modifiers from breakdown
      const newModifiers = [...tags.modifiers]

      // Add advantage/disadvantage from result
      if (result.hasAdvantage && !newModifiers.includes(ModifierValues.ADVANTAGE)) {
        newModifiers.push(ModifierValues.ADVANTAGE)
      }
      if (result.hasDisadvantage && !newModifiers.includes(ModifierValues.DISADVANTAGE)) {
        newModifiers.push(ModifierValues.DISADVANTAGE)
      }

      // Add critical success/failure
      if (isCriticalSuccess(updatedDice) && !newModifiers.includes(ModifierValues.CRITICAL_SUCCESS)) {
        newModifiers.push(ModifierValues.CRITICAL_SUCCESS)
      }
      if (isCriticalFailure(updatedDice) && !newModifiers.includes(ModifierValues.CRITICAL_FAILURE)) {
        newModifiers.push(ModifierValues.CRITICAL_FAILURE)
      }

      // Extract numeric modifiers from breakdown
      const newCustomModifiers = [...tags.customModifiers]
      result.modifierBreakdown.forEach((breakdown) => {
        // Skip base modifier (format: "ability_name (base)")
        const isBaseModifier = breakdown.source.includes('(base)')
        // Skip advantage/disadvantage entries with 0 value
        const isAdvDisadv = breakdown.source.includes('(advantage)') || breakdown.source.includes('(disadvantage)')
        
        if (!isBaseModifier && breakdown.value !== 0 && !isAdvDisadv) {
          const label = `${breakdown.source}: ${breakdown.value >= 0 ? '+' : ''}${breakdown.value}`
          if (!newCustomModifiers.some(cm => cm.label === label)) {
            newCustomModifiers.push({
              label,
              value: breakdown.value,
              isUserAdded: false,
            })
          }
        }
      })

      // Add traits from active effects - ONLY if they actually contributed
      const newTraits = [...tags.traits]
      const contributingSources = new Set([
        ...result.modifierBreakdown.map(b => b.source),
        ...result.advantageSources,
        ...result.disadvantageSources,
      ])
      
      result.activeEffects
        .filter((e) => e.sourceType === 'trait')
        .forEach((e) => {
          // Only add if this effect actually contributed to the roll
          if (contributingSources.has(e.source) && !newTraits.some((t) => t.id === e.id)) {
            newTraits.push({
              id: e.id,
              name: e.source,
              isUserAdded: false,
            })
          }
        })

      // Add items from active effects - ONLY if they actually contributed
      const newItems = [...tags.items]
      result.activeEffects
        .filter((e) => e.sourceType === 'item')
        .forEach((e) => {
          if (contributingSources.has(e.source) && !newItems.some((i) => i.id === e.id)) {
            newItems.push({
              id: e.id,
              name: e.source,
              isUserAdded: false,
            })
          }
        })

      // Add custom effects - ONLY if they actually contributed
      const newEffects = [...tags.effects]
      result.activeEffects
        .filter((e) => e.sourceType === 'custom')
        .forEach((e) => {
          if (contributingSources.has(e.source) && !newEffects.some((ef) => ef.id === e.id)) {
            newEffects.push({
              id: e.id,
              name: e.source,
              isUserAdded: false,
            })
          }
        })

      // Auto-detect core stat from ability
      let coreStat = tags.coreStat
      if (tags.ability && !coreStat) {
        const ability = abilities.find((a) => a.ability_name === tags.ability)
        if (ability) {
          coreStat = ability.core_stat
        }
      }

      // Update tags state with all auto-added tags
      setTags({
        ...tags,
        dice: updatedDice,
        modifiers: newModifiers,
        customModifiers: newCustomModifiers,
        traits: newTraits,
        items: newItems,
        effects: newEffects,
        coreStat,
      })

      alert('Auto-added relevant tags!')
    } catch (error) {
      console.error('Error auto-adding tags:', error)
      alert('Failed to auto-add tags')
    }
  }

  /**
   * Calculate preview whenever tags or dice values change
   */
  useEffect(() => {
    if (!character || !tags.rollType || !tags.ability) return

    const calculatePreview = async () => {
      setIsCalculating(true)
      try {
        // Update dice values in tags
        const updatedDice = tags.dice.map((d) => ({
          ...d,
          value: diceValues[d.die] || 0,
        }))

        // Calculate total dice value
        const totalDiceValue = getTotalDiceValue(updatedDice)
        const d20Value = getD20Value(updatedDice) || totalDiceValue

        // Map roll type tag to RollType
        const rollTypeMap: Record<string, RollType> = {
          ability_check: RollType.ABILITY_CHECK,
          saving_throw: RollType.SAVING_THROW,
          attack: RollType.ATTACK,
          damage: RollType.DAMAGE,
          initiative: RollType.INITIATIVE,
        }

        if (!tags.rollType) return

        const result = await executeRoll({
          characterId: character.id,
          type: rollTypeMap[tags.rollType],
          d20Value,
          abilityName: tags.ability,
          dc: dc,
          manualAdvantage: tags.modifiers.includes(ModifierValues.ADVANTAGE),
          manualDisadvantage: tags.modifiers.includes(ModifierValues.DISADVANTAGE),
          baseXP: dc ? 10 : 0, // Only award XP if DC is set
        })

        setPreview(result)
      } catch (error) {
        console.error('Preview calculation error:', error)
      } finally {
        setIsCalculating(false)
      }
    }

    calculatePreview()
  }, [character, tags, diceValues, dc, abilities])

  if (!character) {
    return <div>Please select a character</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Unified Roll Log</h2>

      {/* Tag Selector */}
      <div className="space-y-4">
        <Label>Select Tags</Label>
        <div className="flex flex-wrap gap-2">
          {availableOptions.map((option) => (
            <Button
              key={`${option.category}-${option.value}`}
              type="button"
              size="sm"
              onClick={() => handleAddTag(option)}
              disabled={
                // Disable if already selected (for mutually exclusive)
                (option.category === TagCategory.ROLL_TYPE &&
                  tags.rollType === option.value) ||
                (option.category === TagCategory.ABILITY &&
                  tags.ability === option.value) ||
                (option.category === TagCategory.CORE_STAT &&
                  tags.coreStat === option.value)
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Tags Display */}
      <div className="space-y-2">
        <Label>Current Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.rollType && (
            <div className="px-3 py-1 bg-blue-100 rounded-full flex items-center gap-2">
              <span>{getDisplayLabel(tags.rollType)}</span>
              <button
                onClick={() => handleRemoveTag(TagCategory.ROLL_TYPE, tags.rollType!)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}
          {tags.ability && (
            <div className="px-3 py-1 bg-green-100 rounded-full flex items-center gap-2">
              <span>Ability: {tags.ability}</span>
              <button
                onClick={() => handleRemoveTag(TagCategory.ABILITY, tags.ability!)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}
          {tags.coreStat && (
            <div className="px-3 py-1 bg-purple-100 rounded-full">
              Core Stat: {getDisplayLabel(tags.coreStat)}
            </div>
          )}
          {tags.dice.map((die, idx) => (
            <div
              key={`${die.die}-${idx}`}
              className="px-3 py-1 bg-yellow-100 rounded-full flex items-center gap-2"
            >
              <span>{die.die}</span>
              {die.die !== DiceValues.D20 && (
                <button
                  onClick={() => handleRemoveTag(TagCategory.DICE, die.die)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {tags.modifiers.map((mod) => (
            <div
              key={mod}
              className="px-3 py-1 bg-orange-100 rounded-full flex items-center gap-2"
            >
              <span>{getDisplayLabel(mod)}</span>
              <button
                onClick={() => handleRemoveTag(TagCategory.MODIFIERS, mod)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
          {tags.traits.filter(t => t.isUserAdded).map((trait) => (
            <div
              key={trait.id}
              className="px-3 py-1 bg-pink-100 rounded-full flex items-center gap-2"
            >
              <span>Trait: {trait.name}</span>
              <button
                onClick={() => handleRemoveTag(TagCategory.TRAITS, trait.id)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dice Inputs */}
      <div className="space-y-4">
        <Label>Roll Values</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tags.dice.map((die, idx) => (
            <div key={`${die.die}-input-${idx}`}>
              <Label htmlFor={`dice-${die.die}-${idx}`}>{die.die}</Label>
              <Input
                id={`dice-${die.die}-${idx}`}
                type="number"
                min="1"
                max={die.die === DiceValues.D4 ? 4 : die.die === DiceValues.D6 ? 6 : die.die === DiceValues.D8 ? 8 : die.die === DiceValues.D10 ? 10 : die.die === DiceValues.D12 ? 12 : die.die === DiceValues.D20 ? 20 : 100}
                value={diceValues[die.die] || 0}
                onChange={(e) =>
                  handleDieValueChange(die.die, parseInt(e.target.value) || 0)
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* DC Input */}
      <div>
        <Label htmlFor="dc">Difficulty Class (optional)</Label>
        <Input
          id="dc"
          type="number"
          min="1"
          value={dc || ''}
          onChange={(e) => setDc(parseInt(e.target.value) || undefined)}
          placeholder="Enter DC"
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context..."
        />
      </div>

      {/* Auto-Add Relevant Tags Button */}
      <Button
        onClick={handleAutoAddTags}
        disabled={!tags.rollType || !tags.ability || isCalculating}
        className="w-full"
        variant="secondary"
      >
        🔍 Auto-Add Relevant Tags
      </Button>

      {/* Preview */}
      {preview && (
        <div className="border-2 border-blue-500 rounded-lg p-4 space-y-4">
          <h3 className="text-xl font-bold">Roll Preview</h3>
          
          {/* Current Tags Recap */}
          <div className="border-b pb-2">
            <p className="font-semibold mb-2">Current Tags:</p>
            <div className="flex flex-wrap gap-1 text-sm">
              {tags.rollType && <span className="px-2 py-0.5 bg-blue-100 rounded">{getDisplayLabel(tags.rollType)}</span>}
              {tags.ability && <span className="px-2 py-0.5 bg-green-100 rounded">Ability: {tags.ability}</span>}
              {tags.coreStat && <span className="px-2 py-0.5 bg-purple-100 rounded">Core Stat: {getDisplayLabel(tags.coreStat)}</span>}
              {tags.dice.map((die, idx) => (
                <span key={`preview-die-${idx}`} className="px-2 py-0.5 bg-yellow-100 rounded">{die.die}</span>
              ))}
              {tags.modifiers.map((mod, idx) => (
                <span key={`preview-mod-${idx}`} className="px-2 py-0.5 bg-orange-100 rounded">{getDisplayLabel(mod)}</span>
              ))}
              {tags.customModifiers.map((cm, idx) => (
                <span key={`preview-cm-${idx}`} className="px-2 py-0.5 bg-orange-100 rounded">{cm.label}</span>
              ))}
              {tags.traits.map((trait, idx) => (
                <span key={`preview-trait-${idx}`} className="px-2 py-0.5 bg-indigo-100 rounded">{trait.name}</span>
              ))}
              {tags.items.map((item, idx) => (
                <span key={`preview-item-${idx}`} className="px-2 py-0.5 bg-pink-100 rounded">{item.name}</span>
              ))}
              {tags.effects.map((effect, idx) => (
                <span key={`preview-effect-${idx}`} className="px-2 py-0.5 bg-cyan-100 rounded">{effect.name}</span>
              ))}
              {dc && <span className="px-2 py-0.5 bg-red-100 rounded">DC: {dc}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold">{preview.totalValue}</span>
            </div>
            
            {preview.dc && (
              <div className="flex justify-between">
                <span>vs DC {preview.dc}:</span>
                <span className={preview.success ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {preview.success ? '✅ Success' : '❌ Failure'}
                </span>
              </div>
            )}

            <div className="border-t pt-2">
              <p className="font-semibold mb-2">Breakdown:</p>
              {preview.modifierBreakdown.map((breakdown, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{breakdown.source}</span>
                  <span>{breakdown.value >= 0 ? '+' : ''}{breakdown.value}</span>
                </div>
              ))}
            </div>

            {preview.dc && (
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">XP Awarded:</span>
                  <span className={preview.xpAwarded > 0 ? 'text-green-600 font-bold' : 'text-gray-500'}>
                    {preview.xpAwarded > 0 ? `+${preview.xpAwarded} XP` : 'No XP (failure)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={async () => {
          if (!character || !preview) return

          setIsSubmitting(true)
          try {
            // Build complete tags with current dice values and DC
            const updatedDice = tags.dice.map((d) => ({
              ...d,
              value: diceValues[d.die] || 0,
            }))
            
            // Merge tags with DC
            const tagsWithDC = {
              ...tags,
              dc: dc,
            }
            
            const completeTags = buildAutoTags(tagsWithDC, updatedDice)

            // Log the roll with tags
            await logRollWithTags(preview, character.id, completeTags, notes)

            // Reload data to get updated XP and ability usage
            await loadDataFromSupabase(character.user_id)

            // Show success message
            const outcomeText =
              preview.outcome === 'critical_success'
                ? '🎉 Critical Success!'
                : preview.outcome === 'success'
                  ? '✅ Success!'
                  : preview.outcome === 'critical_failure'
                    ? '💥 Critical Failure!'
                    : '❌ Failed'

            alert(
              `${outcomeText}\n\nTotal: ${preview.totalValue}${preview.dc ? ` vs DC ${preview.dc}` : ''}\n${preview.xpAwarded > 0 ? `XP Gained: ${preview.xpAwarded}` : 'No XP (failure)'}`
            )

            // Reset form
            setTags({
              dice: [{ die: DiceValues.D20, value: 0 }],
              modifiers: [],
              customModifiers: [],
              traits: [],
              items: [],
              effects: [],
              organizational: [],
            })
            setDiceValues({ d20: 0 })
            setDc(undefined)
            setNotes('')
            setPreview(null)
          } catch (error) {
            console.error('Error logging roll:', error)
            alert('An error occurred while logging the roll')
          } finally {
            setIsSubmitting(false)
          }
        }}
        disabled={!tags.rollType || !tags.ability || isCalculating || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Logging...' : 'Log Roll'}
      </Button>
    </div>
  )
}
