import { supabase } from './supabase'
import type { DailyRoll, CoreStatName } from '@/types'
import { determineDayState } from './calculations'

/**
 * Get or create journal entry for a specific date
 */
export async function getOrCreateJournalEntry(
  characterId: string,
  date: string // Format: YYYY-MM-DD
) {
  // Check if entry exists
  const { data: existing, error: fetchError } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('character_id', characterId)
    .eq('entry_date', date)
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching journal entry:', fetchError)
    return { data: null, error: fetchError }
  }

  // If exists, return it
  if (existing) {
    return { data: existing, error: null }
  }

  // Create new entry
  const { data: newEntry, error: createError } = await supabase
    .from('journal_entries')
    .insert([{
      character_id: characterId,
      entry_date: date,
      journal_text: null,
    }])
    .select()
    .single()

  if (createError) {
    console.error('Error creating journal entry:', createError)
    return { data: null, error: createError }
  }

  return { data: newEntry, error: null }
}

/**
 * Update journal entry text
 */
export async function updateJournalText(
  characterId: string,
  date: string,
  text: string
) {
  // Ensure entry exists first
  await getOrCreateJournalEntry(characterId, date)

  const { error } = await supabase
    .from('journal_entries')
    .update({ journal_text: text })
    .eq('character_id', characterId)
    .eq('entry_date', date)

  if (error) {
    console.error('Error updating journal text:', error)
    return { error }
  }

  return { error: null }
}

/**
 * Log daily roll
 */
export async function logDailyRoll(
  characterId: string,
  date: string,
  rollValue: number,
  affectedStats?: CoreStatName[]
): Promise<{ data: DailyRoll | null; error: any }> {
  // Ensure journal entry exists
  await getOrCreateJournalEntry(characterId, date)

  const dayState = determineDayState(rollValue)

  // Check if roll already exists for this date
  const { data: existing } = await supabase
    .from('daily_rolls')
    .select('id')
    .eq('character_id', characterId)
    .eq('roll_date', date)
    .maybeSingle()

  if (existing) {
    // Update existing roll
    const { data, error } = await supabase
      .from('daily_rolls')
      .update({
        roll_value: rollValue,
        day_state: dayState,
        affected_stats: affectedStats || null,
      })
      .eq('id', existing.id)
      .select()
      .single()

    return { data, error }
  }

  // Insert new roll
  const { data, error } = await supabase
    .from('daily_rolls')
    .insert([{
      character_id: characterId,
      roll_date: date,
      roll_value: rollValue,
      day_state: dayState,
      affected_stats: affectedStats || null,
    }])
    .select()
    .single()

  return { data, error }
}

/**
 * Get daily roll for a specific date
 */
export async function getDailyRoll(
  characterId: string,
  date: string
): Promise<{ data: DailyRoll | null; error: any }> {
  const { data, error } = await supabase
    .from('daily_rolls')
    .select('*')
    .eq('character_id', characterId)
    .eq('roll_date', date)
    .maybeSingle()

  return { data, error }
}

/**
 * Get action log for a specific date
 */
export async function getActionLogForDate(
  characterId: string,
  date: string
) {
  const { data, error } = await supabase
    .from('action_log')
    .select('*')
    .eq('character_id', characterId)
    .eq('action_date', date)
    .order('action_time', { ascending: true })

  return { data, error }
}

/**
 * Log an action/roll manually
 */
export async function logAction(
  characterId: string,
  date: string,
  actionData: {
    action_type: string
    quest_id?: string
    quest_name?: string
    completion_status?: string
    xp_awarded?: number
    roll_type?: string
    ability_used?: string
    roll_value?: number
    modifier_value?: number
    total_value?: number
    difficulty_class?: number
    had_advantage?: boolean
    had_disadvantage?: boolean
    success?: boolean
    notes?: string
  }
) {
  // Ensure journal entry exists
  await getOrCreateJournalEntry(characterId, date)

  const { data, error } = await supabase
    .from('action_log')
    .insert([{
      character_id: characterId,
      action_date: date,
      action_time: new Date().toISOString(),
      ...actionData,
    }])
    .select()
    .single()

  if (error) {
    console.error('Error logging action:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
