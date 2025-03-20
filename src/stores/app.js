import { defineStore, acceptHMRUpdate } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    apps: [
      {
        name: 'IPBase Studio',
        value: 'ipbase_studio',
        icon: 'graphic_eq',
        path: '/',
      },
    ],
    app: void 0,
    settings: {
      azureTtsKey: '',
      azureTtsRegion: 'eastasia',
    },
  }),

  getters: {
    appName: (state) => state.app?.name,
  },

  actions: {
    setApp(app) {
      this.app = app
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
