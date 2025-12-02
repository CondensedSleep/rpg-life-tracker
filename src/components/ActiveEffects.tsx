import { useStore } from '@/store'
import { deleteCustomEffect } from '@/lib/actionLogService'
import { loadDataFromSupabase } from '@/lib/loadSeedData'

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
                    <div className="flex flex-wrap gap-2 mt-2">
                      {effect.stat_modifiers.map((mod, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-bg-primary rounded border border-border"
                        >
                          {mod.stat}: {mod.modifier >= 0 ? '+' : ''}
                          {mod.modifier}
                        </span>
                      ))}
                    </div>
                  )}

                {/* Show affected stats for advantage/disadvantage */}
                {(effect.effect_type === 'advantage' ||
                  effect.effect_type === 'disadvantage') &&
                  effect.affected_stats &&
                  effect.affected_stats.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {effect.affected_stats.map((stat, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-bg-primary rounded border border-border"
                        >
                          {stat}
                        </span>
                      ))}
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
