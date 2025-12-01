import { QuestList } from '@/components/quests/QuestList'

export function Quests() {
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-4xl font-bold mb-6">Quests</h1>

      {/* Weekly Quests Section */}
      <QuestList questType="weekly" title="Weekly Quests" />

      {/* Main Quests Section */}
      <div className="mt-8">
        <QuestList questType="main" title="Main Quests" />
      </div>
    </div>
  )
}
