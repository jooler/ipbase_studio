import { defineStore, acceptHMRUpdate } from 'pinia'
import { Notify } from 'quasar'

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
    error: null,
  }),

  getters: {
    appName: (state) => state.app?.name,
  },

  actions: {
    setApp(app) {
      this.app = app
    },
    showError(error) {
      Notify.create({
        message: error,
        color: 'negative',
        position: 'top',
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
