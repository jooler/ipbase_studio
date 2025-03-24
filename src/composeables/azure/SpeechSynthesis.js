import localforage from 'localforage'
import { api } from 'src/boot/axios'
import { appStore } from 'src/stores/stores'
import { computed } from 'vue'

const azureTtsKey = computed(() => appStore.settings?.azureTtsKey)
const azureTtsRegion = computed(() => appStore.settings?.azureTtsRegion)
/**
 * 创建一个封装Azure语音合成功能的可复用hook
 * @param {Object} options 语音合成配置选项
 * @returns {Object} 包含合成方法的对象
 */
export function useSpeechSynthesis(options = {}) {
  // 默认配置与用户配置合并
  const config = {
    speechVoiceName: options.speechVoiceName || 'zh-CN-XiaoxiaoNeural',
    useCustomEndpoint: options.useCustomEndpoint || false,
    customEndpoint: options.customEndpoint || '',
    voiceList: null, // 语音列表缓存
  }

  const fetchVoiceList = async () => {
    const checkExpire = (timestamp, range) => {
      const now = Date.now()
      return now - timestamp < range
    }
    const cache = await localforage.getItem('voiceList')
    if (cache?.dateset) {
      if (checkExpire(cache.updatedAt, 1000 * 60 * 60)) {
        config.voiceList = cache.dateset
        return config.voiceList
      }
    }

    try {
      let voices
      console.log('azureTtsKey.value', azureTtsKey.value)

      if (azureTtsKey.value) {
        const ttsApi = `https://${azureTtsRegion.value}.tts.speech.microsoft.com/cognitiveservices/voices/list`
        const response = await fetch(ttsApi, {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': azureTtsKey.value,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) {
          throw new Error(`获取语音列表失败: ${response.status} ${response.statusText}`)
        }

        voices = await response.json()
      } else {
        const { data } = await api.get('/tts/voice_list')
        if (data) {
          voices = data
        }
      }
      await localforage.setItem('voiceList', {
        updatedAt: Date.now(),
        dateset: voices,
      })
      config.voiceList = voices
      return config.voiceList
    } catch (error) {
      throw ('获取语音列表出错：', error)
    }
  }

  /**
   * 获取所有语音条目的唯一区域码
   * @param {Array} voiceList 语音列表
   * @returns {Array} 去重后的区域码数组
   */
  const getUniqueLocales = (voiceList) => {
    if (!Array.isArray(voiceList)) return []
    return [...new Set(voiceList.map((item) => item.Locale?.toLowerCase()))].filter(Boolean)
  }

  // 返回包含合成方法的对象
  return {
    updateConfig: (newConfig) => {
      Object.assign(config, newConfig)
    },
    fetchVoiceList,
    getUniqueLocales,
  }
}
