import { useCharacter, useCoreStats, useAbilities } from '@/store'
import { TraitsList } from '@/components/character/TraitsList'
import { InventoryList } from '@/components/character/InventoryList'

export function Dashboard() {
  const character = useCharacter()
  const coreStats = useCoreStats()
  const abilities = useAbilities()

  if (!character || !coreStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-secondary">Loading character data...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{character.name}</h1>
        <p className="text-text-secondary">{character.class} • Level {character.level}</p>
      </div>

      {/* XP Progress */}
      <div className="mb-8 p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex justify-between mb-2">
          <span>XP: {character.current_xp} / {character.xp_to_next_level}</span>
          <span>Next Level: {character.level + 1}</span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-2">
          <div
            className="bg-accent-primary h-2 rounded-full transition-all"
            style={{
              width: `${(character.current_xp / character.xp_to_next_level) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(coreStats).map(([statName, stat]) => (
          <div key={statName} className="p-4 bg-bg-secondary rounded-lg border border-border">
            <h3 className="text-xl font-bold uppercase mb-2">{statName}</h3>
            <div className="text-3xl font-bold text-accent-secondary mb-4">
              {stat.current_value}
              <span className="text-sm text-text-secondary ml-2">
                ({stat.modifier >= 0 ? '+' : ''}{stat.modifier})
              </span>
            </div>

            {/* Abilities for this stat */}
            <div className="space-y-1">
              {abilities
                .filter((a) => a.core_stat === statName)
                .map((ability) => (
                  <div key={ability.id} className="flex justify-between text-sm">
                    <span className="capitalize">{ability.ability_name}</span>
                    <span className="text-accent-secondary">
                      {ability.current_value >= 0 ? '+' : ''}{ability.current_value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Traits & Inventory */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TraitsList />
        <InventoryList />
      </div>
    </div>
  )
}
