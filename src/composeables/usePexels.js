// import { ref } from 'vue'
import axios from 'axios'
import { ref } from 'vue'

// const pexelsApi = process.env.VITE_PEXELS_API;
// const pexelsKey = process.env.VITE_PEXELS_KEY;

const pexelsApi = axios.create({
  baseURL: import.meta.env.VITE_PEXELS_API,
})
pexelsApi.interceptors.request.use(async (config) => {
  const token = process.env.VITE_PEXELS_KEY
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

export const usePexels = () => {
  /**
   *
   * @param {Object} params {
   *  query string | required
      The search query. Ocean, Tigers, Pears, etc.

      orientation string | optional
      Desired photo orientation. The current supported orientations are: landscape, portrait or square.

      size string | optional
      Minimum photo size. The current supported sizes are: large(24MP), medium(12MP) or small(4MP).

      color string | optional
      Desired photo color. Supported colors: red, orange, yellow, green, turquoise, blue, violet, pink, brown, black, gray, white or any hexidecimal color code (eg. #ffffff).

      locale string | optional
      The locale of the search you are performing. The current supported locales are: <%= I18n.available_locales.map { |locale| %(') + locale.to_s + %(') }.join(' ') %>.

      page integer | optional
      The page number you are requesting. Default: 1

      per_page integer | optional
      The number of results you are requesting per page. Default: 15 Max: 80
   * }
   */
  const queryImages = async (type, params) => {
    const loading = ref(true)
    const error = ref(null)
    const data = ref(null)

    try {
      const response = await pexelsApi.get(type, { params })
      data.value = response.data
    } catch (err) {
      error.value = err.message || '获取图片数据失败'
    } finally {
      loading.value = false
    }

    return {
      loading: loading.value,
      error: error.value,
      data: data.value,
    }
  }
  /**
   *
   * @param {Object} params {
   *  query string | required
      The search query. Ocean, Tigers, Pears, etc.

      orientation string | optional
      Desired video orientation. The current supported orientations are: landscape, portrait or square.

      size string | optional
      Minimum video size. The current supported sizes are: large(4K), medium(Full HD) or small(HD).

      locale string | optional
      The locale of the search you are performing. The current supported locales are: <%= I18n.available_locales.map { |locale| %(') + locale.to_s + %(') }.join(' ') %>.

      page integer | optional
      The page number you are requesting. Default: 1

      per_page integer | optional
      The number of results you are requesting per page. Default: 15 Max: 80
   * }
   * @returns {Object} {
   *  loading: boolean
   *  error: string | null
   *  data: Object | null
   * }
   */
  const queryVideos = async (params) => {
    const loading = ref(true)
    const error = ref(null)
    const data = ref(null)

    try {
      const response = await pexelsApi.get('videos/search', { params })
      data.value = response.data
    } catch (err) {
      error.value = err.message || '获取图片数据失败'
    } finally {
      loading.value = false
    }

    return {
      loading: loading.value,
      error: error.value,
      data: data.value,
    }
  }
  return {
    queryImages,
    queryVideos,
  }
}
