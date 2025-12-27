import { useStore } from '@/store'
import { deleteCustomEffect } from '@/lib/actionLogService'
import { loadDataFromSupabase } from '@/lib/loadSeedData'

function formatAppliesTo(appliesTo?: ('ability_checks' | 'saving_throws' | 'passive_modifier')[] | null): string {
  if (!appliesTo || appliesTo.length === 0) return 'applies to everything'
  
  const labels: Record<string, string> = {
    'ability_checks': 'ability checks',
    'saving_throws': 'saving throws',
    'passive_modifier': 'passive modifiers'
  }
  
  if (appliesTo.length === 1) {
    return `(${labels[appliesTo[0]]})`
  }
  
  const formatted = appliesTo.map(a => labels[a])
  return `(${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]})`
}

export function ActiveEffects() {
  const character = useStore((state) => state.character)
  const customEffects = useStore((state) => state.customEffects)

  const handleRemoveEffect = async (effectId: string, effectName: string) => {
    if (!character) return

    const confirmed = confirm(`Remove effect "${effectName}"?`)
    if (!confirmed) return

    const { error } = await deleteCustomEffect(effectId)

    if (error) {
      alert('Failed to remove effect: ' + error.message)
      return
    }

    // Reload data to update UI
    await loadDataFromSupabase(character.user_id)
  }

  if (!customEffects || customEffects.length === 0) {
    return (
      <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
        <h2 className="text-lg font-semibold mb-3">Active Effects</h2>
        <p className="text-sm text-text-secondary">No active effects</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-bg-secondary rounded-lg border border-border frosted">
      <h2 className="text-lg font-semibold mb-3">Active Effects</h2>
      <div className="space-y-2">
        {customEffects.map((effect) => {
          const expiresAt = new Date(effect.expires_at)
          const hoursUntilExpire = Math.max(
            0,
            Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
          )

          return (
            <div
              key={effect.id}
              className="p-3 bg-bg-tertiary rounded-md border border-border flex items-start justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{effect.effect_name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      effect.effect_type === 'stat_modifier'
                        ? 'bg-blue-500/20 text-blue-400'
                        : effect.effect_type === 'advantage'
                          ? 'bg-green-500/20 text-green-400'
                          : effect.effect_type === 'disadvantage'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {effect.effect_type.replace('_', ' ')}
                  </span>
                </div>

                {effect.description && (
                  <p className="text-sm text-text-secondary mt-1">
                    {effect.description}
                  </p>
                )}

                {/* Show stat modifiers if applicable */}
                {effect.effect_type === 'stat_modifier' &&
                  effect.stat_modifiers &&
                  effect.stat_modifiers.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        {effect.stat_modifiers.map((mod, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-bg-primary rounded border border-border uppercase"
                          >
                            {mod.modifier >= 0 ? '+' : ''}{mod.modifier} {mod.stat}
                          </span>
                        ))}
                      </div>
                      {effect.applies_to && effect.applies_to.length > 0 && (
                        <p className="text-xs text-text-secondary mt-1">
                          {formatAppliesTo(effect.applies_to)}
                        </p>
                      )}
                    </div>
                  )}

                {/* Show affected stats for advantage/disadvantage */}
                {(effect.effect_type === 'advantage' ||
                  effect.effect_type === 'disadvantage') &&
                  effect.affected_stats &&
                  effect.affected_stats.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-accent-secondary">
                        {effect.effect_type === 'advantage' ? 'Advantage' : 'Disadvantage'}
                        {effect.modifier ? ` (${effect.modifier > 0 ? '+' : ''}${effect.modifier})` : ''} on{' '}
                        <span className="uppercase">
                          {effect.affected_stats.join(', ')}
                        </span>
                      </p>
                      {effect.applies_to && effect.applies_to.length > 0 && (
                        <p className="text-xs text-text-secondary mt-1">
                          {formatAppliesTo(effect.applies_to)}
                        </p>
                      )}
                    </div>
                  )}

                <p className="text-xs text-text-secondary mt-2">
                  Expires in {hoursUntilExpire}h (at midnight)
                </p>
              </div>

              <button
                onClick={() => handleRemoveEffect(effect.id, effect.effect_name)}
                className="px-3 py-1 text-sm bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
