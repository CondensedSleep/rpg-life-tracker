import { useState, useEffect } from 'react'
import { useCharacter, useAbilities, useStore } from '@/store'
import {
  getOrCreateJournalEntry,
  logDailyRoll,
  getDailyRoll,
  getActionLogForDate,
} from '@/lib/journalService'
import { determineDayState } from '@/lib/calculations'
import { getTodayLocalDate, addDays, parseLocalDate } from '@/lib/dateUtils'
import type { JournalEntry, DailyRoll, ActionLog } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export function Journal() {
  const character = useCharacter()
  const abilities = useAbilities()

  const [selectedDate, setSelectedDate] = useState<string>(
    getTodayLocalDate()
  )
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null)
  const [dailyRoll, setDailyRoll] = useState<DailyRoll | null>(null)
  const [actionLog, setActionLog] = useState<ActionLog[]>([])
  const [journalText, setJournalText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Daily Roll Form State
  const [rollValue, setRollValue] = useState('')
  const [affectedStats, setAffectedStats] = useState<string[]>([])
  const [showAffectedStats, setShowAffectedStats] = useState(false)

  // Load data for selected date
  useEffect(() => {
    if (!character) return

    const loadDateData = async () => {
      // Get or create journal entry
      const { data: entry } = await getOrCreateJournalEntry(character.id, selectedDate)
      if (entry) {
        setJournalEntry(entry)
        setJournalText(entry.journal_text || '')
      }

      // Get daily roll if exists
      const { data: roll } = await getDailyRoll(character.id, selectedDate)
      setDailyRoll(roll)
      if (roll) {
        setRollValue(roll.roll_value.toString())
        setAffectedStats(roll.affected_stats || [])
      } else {
        setRollValue('')
        setAffectedStats([])
        setShowAffectedStats(false)
      }

      // Get action log
      const { data: logs } = await getActionLogForDate(character.id, selectedDate)
      setActionLog(logs || [])
    }

    loadDateData()
  }, [character, selectedDate])

  const handlePreviousDay = () => {
    setSelectedDate(addDays(selectedDate, -1))
  }

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1))
  }

  const handleToday = () => {
    setSelectedDate(getTodayLocalDate())
  }

  const handleLogDailyRoll = async () => {
    if (!character || !rollValue) return

    const roll = parseInt(rollValue)
    if (isNaN(roll) || roll < 1 || roll > 20) {
      alert('Please enter a valid roll value between 1 and 20')
      return
    }

    // Calculate day state
    const dayState = determineDayState(roll)

    // Check if we need affected stats
    if ((dayState === 'difficult' || dayState === 'inspiration') && affectedStats.length === 0) {
      setShowAffectedStats(true)
      return
    }

    const { error } = await logDailyRoll(
      character.id,
      selectedDate,
      roll,
      affectedStats.length > 0 ? affectedStats : undefined
    )

    if (error) {
      alert('Failed to log daily roll: ' + error.message)
    } else {
      // Reload daily roll data
      const { data: newRoll } = await getDailyRoll(character.id, selectedDate)
      setDailyRoll(newRoll)
    }
  }

  const handleJournalTextChange = (text: string) => {
    setJournalText(text)
  }

  const handleSaveJournal = async () => {
    if (!character || !journalEntry) return

    setIsSaving(true)
    const { error } = await getOrCreateJournalEntry(
      character.id,
      selectedDate,
      journalText
    )

    if (error) {
      alert('Failed to save journal: ' + error.message)
    }
    
    setIsSaving(false)
  }

  const handleToggleAffectedStat = (abilityName: string) => {
    setAffectedStats(prev => {
      if (prev.includes(abilityName)) {
        return prev.filter(s => s !== abilityName)
      } else {
        // For inspiration, only allow one stat
        if (dailyRoll?.day_state === 'inspiration' || 
            (rollValue && determineDayState(parseInt(rollValue)) === 'inspiration')) {
          return [abilityName]
        }
        // For difficult, allow multiple
        return [...prev, abilityName]
      }
    })
  }

  if (!character) {
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

  const currentDayInfo = dailyRoll ? dayStateInfo[dailyRoll.day_state] : null

  const isToday = selectedDate === getTodayLocalDate()
  const isFuture = parseLocalDate(selectedDate) > new Date()

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-border frosted">
        <Button onClick={handlePreviousDay} variant="outline">
          ← Previous Day
        </Button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {formattedDate}
          </h1>
          {isToday && <span className="text-sm text-accent-success">Today</span>}
          {isFuture && <span className="text-sm text-text-secondary">Future Date</span>}
        </div>

        <div className="flex gap-2">
          {!isToday && (
            <Button onClick={handleToday} variant="outline">
              Today
            </Button>
          )}
          <Button 
            onClick={handleNextDay} 
            variant="outline"
            disabled={isFuture}
          >
            Next Day →
          </Button>
        </div>
      </div>

      {/* Daily Roll Section */}
      <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
        <h2 className="text-xl font-semibold mb-4">Daily Roll</h2>

        {dailyRoll ? (
          <div>
            <div className={`text-2xl font-bold mb-2 ${currentDayInfo?.color}`}>
              {currentDayInfo?.emoji} {currentDayInfo?.label}
            </div>
            <div className="text-sm text-text-secondary space-y-1">
              <div>Roll: {dailyRoll.roll_value}</div>
              {dailyRoll.day_state === 'difficult' && dailyRoll.affected_stats && (
                <div>Disadvantage on: <span className="uppercase">{dailyRoll.affected_stats.join(', ')}</span></div>
              )}
              {dailyRoll.day_state === 'inspiration' && dailyRoll.affected_stats && dailyRoll.affected_stats[0] && (
                <div>Advantage on: <span className="uppercase">{dailyRoll.affected_stats[0]}</span></div>
              )}
              {dailyRoll.day_state === 'critical' && (
                <div className="text-accent-warning">XP multiplier: 2x for this day</div>
              )}
            </div>
            {isToday && (
              <Button
                onClick={() => {
                  setDailyRoll(null)
                  setRollValue('')
                  setAffectedStats([])
                  setShowAffectedStats(false)
                }}
                variant="outline"
                className="mt-4"
              >
                Re-roll
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rollValue">Roll Value (1-20)</Label>
              <Input
                id="rollValue"
                type="number"
                min="1"
                max="20"
                value={rollValue}
                onChange={(e) => {
                  setRollValue(e.target.value)
                  const roll = parseInt(e.target.value)
                  if (!isNaN(roll)) {
                    const dayState = determineDayState(roll)
                    setShowAffectedStats(dayState === 'difficult' || dayState === 'inspiration')
                  }
                }}
                placeholder="Enter your d20 roll"
                className="mt-1"
              />
            </div>

            {showAffectedStats && rollValue && (
              <div>
                <Label>
                  {determineDayState(parseInt(rollValue)) === 'difficult' 
                    ? 'Select abilities with disadvantage (multiple allowed)' 
                    : 'Select ONE ability with advantage'}
                </Label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-bg-tertiary rounded">
                  {abilities.map(ability => (
                    <div key={ability.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ability-${ability.id}`}
                        checked={affectedStats.includes(ability.ability_name)}
                        onCheckedChange={() => handleToggleAffectedStat(ability.ability_name)}
                      />
                      <label
                        htmlFor={`ability-${ability.id}`}
                        className="text-sm uppercase cursor-pointer"
                      >
                        {ability.ability_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleLogDailyRoll}
              disabled={!rollValue || (showAffectedStats && affectedStats.length === 0)}
            >
              Log Daily Roll
            </Button>
          </div>
        )}
      </div>

      {/* Journal Text Editor */}
      <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Journal Entry</h2>
          <Button 
            onClick={handleSaveJournal}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Journal'}
          </Button>
        </div>

        <Textarea
          value={journalText}
          onChange={(e) => handleJournalTextChange(e.target.value)}
          placeholder="Write about your day..."
          className="min-h-[300px] font-mono"
        />

        <p className="text-xs text-text-secondary mt-2">
          Last saved: {journalEntry?.updated_at 
            ? new Date(journalEntry.updated_at).toLocaleString()
            : 'Not yet saved'}
        </p>
      </div>

      {/* Action Log */}
      <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
        <h2 className="text-xl font-semibold mb-4">Action Log</h2>

        {actionLog.length === 0 ? (
          <p className="text-text-secondary text-sm">No actions logged for this day</p>
        ) : (
          <div className="space-y-2">
            {actionLog.map((action) => (
              <div
                key={action.id}
                className="p-3 bg-bg-tertiary rounded border border-border"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {action.ability_used && (
                      <span className="text-xs text-accent-secondary uppercase font-semibold">
                        {action.ability_used}
                      </span>
                    )}
                    <span className="text-sm font-semibold capitalize">
                      ({action.action_type.replace(/_/g, ' ')})
                    </span>
                    {action.success !== null && (
                      <span className={`text-xs ${action.success ? 'text-accent-success' : 'text-accent-primary'}`}>
                        {action.success ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary">
                    {action.action_time ? new Date(action.action_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                
                {/* Roll details */}
                {action.roll_value !== null && (
                  <div className="text-sm text-text-secondary mt-1">
                    <span>Roll: {action.roll_value}</span>
                    {action.modifier_breakdown && action.modifier_breakdown.length > 0 ? (
                      <>
                        {action.modifier_breakdown.map((mod, idx) => (
                          <span key={idx}> ({mod.value >= 0 ? '+' : ''}{mod.value})</span>
                        ))}
                      </>
                    ) : action.modifier_value !== null && (
                      <span> {action.modifier_value >= 0 ? '+' : ''}{action.modifier_value}</span>
                    )}
                    {action.total_value !== null && (
                      <span> = <strong>{action.total_value}</strong></span>
                    )}
                    {action.difficulty_class !== null && (
                      <span className="ml-2">vs DC {action.difficulty_class}</span>
                    )}
                    {action.had_advantage && <span className="ml-2 text-accent-success text-xs">ADV</span>}
                    {action.had_disadvantage && <span className="ml-2 text-accent-primary text-xs">DIS</span>}
                  </div>
                )}

                {/* XP awarded */}
                {action.xp_awarded !== null && action.xp_awarded > 0 && (
                  <div className="text-xs text-accent-warning mt-1">
                    +{action.xp_awarded} XP
                  </div>
                )}

                {/* Quest completion */}
                {action.quest_name && (
                  <div className="text-sm text-text-secondary mt-1">
                    Quest: {action.quest_name}
                    {action.completion_status && (
                      <span className="ml-1 capitalize">({action.completion_status})</span>
                    )}
                  </div>
                )}

                {action.notes && (
                  <p className="text-sm mt-2 italic text-text-secondary">{action.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
