import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
// const api = axios.create({ baseURL: 'https://api.example.com' })
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.stduio.yihu.team/api',
})

export default defineBoot(({ app }) => {
  api.interceptors.request.use(async (config) => {
    const token = process.env.VITE_TTS_KEY || '332c27dbabf173fcfb81ccbe0e4a76026c97df18da07c7b6b58066b29fc5f45fc02e26a97c01a0afe2cfe4fbe220b1683dc2ee06d8fc49881d53a5d578c6d96e4777abf2b5ee281114abe392b419147513230f283eb6d967f6f857dff77f4c79f0b87d167266116d5a8de6eae3e50ad1c85ccdf581d0289ee54545ff3a9b6482'
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config.headers['X-Browser-Fingerprint'] = window.fingerprint
    return config
  })
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
})

export { api }
