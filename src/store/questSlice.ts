import type { StateCreator } from 'zustand'
import type { Quest, QuestType } from '@/types'

export interface QuestState {
  // Data
  quests: Quest[]

  // Actions
  setQuests: (quests: Quest[]) => void
  addQuest: (quest: Quest) => void
  updateQuest: (questId: string, updates: Partial<Quest>) => void
  removeQuest: (questId: string) => void
  completeQuest: (questId: string) => void

  // Computed
  getQuestsByType: (questType: QuestType) => Quest[]
  getActiveQuests: () => Quest[]
}

export const createQuestSlice: StateCreator<QuestState> = (set, get) => ({
  // Initial state
  quests: [],

  // Setters
  setQuests: (quests) => set({ quests }),

  addQuest: (quest) => {
    const { quests } = get()
    set({ quests: [...quests, quest] })
  },

  updateQuest: (questId, updates) => {
    const { quests } = get()
    set({
      quests: quests.map((quest) =>
        quest.id === questId ? { ...quest, ...updates } : quest
      ),
    })
  },

  removeQuest: (questId) => {
    const { quests } = get()
    set({ quests: quests.filter((quest) => quest.id !== questId) })
  },

  completeQuest: (questId) => {
    const { quests } = get()
    set({
      quests: quests.map((quest) =>
        quest.id === questId
          ? { ...quest, times_completed: quest.times_completed + 1 }
          : quest
      ),
    })
  },

  // Computed values
  getQuestsByType: (questType) => {
    const { quests } = get()
    return quests.filter((q) => q.quest_type === questType && q.is_active)
  },

  getActiveQuests: () => {
    const { quests } = get()
    return quests.filter((q) => q.is_active)
  },
})
