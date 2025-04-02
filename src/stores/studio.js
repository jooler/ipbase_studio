import { defineStore, acceptHMRUpdate } from 'pinia'
// import { Notify } from 'quasar'
// import localforage from 'localforage'

export const useStudioStore = defineStore('studio', {
  state: () => ({
    storyboardCards: [],
    selectedCard: null,
    runMode: 'tts', // tts, storyboard
  }),

  getters: {},

  actions: {
    setRunMode(mode) {
      this.runMode = mode
    },
    setSelectedCard(card) {
      this.selectedCard = card
    },
    setStoryboardCards(cards) {
      this.storyboardCards = cards
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStudioStore, import.meta.hot))
}
