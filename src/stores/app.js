import { defineStore, acceptHMRUpdate } from 'pinia'
import { Notify } from 'quasar'
import localforage from 'localforage'

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
    disableWaveSurferShortcut: false,
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
    showSuccess(success) {
      Notify.create({
        message: success,
        color: 'positive',
        position: 'top',
      })
    },
    async restoreSettings() {
      this.settings.azureTtsKey = await localforage.getItem('azureTtsKey')
      this.settings.azureTtsRegion =
        (await localforage.getItem('azureTtsRegion')) || this.settings.azureTtsRegion
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
