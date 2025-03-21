import localforage from 'localforage'
import { appStore } from 'src/stores/stores'
import { computed } from 'vue'
const apiKey = computed(() => appStore.settings?.azureTtsKey)
const region = computed(() => appStore.settings?.azureTtsRegion)
/**
 * 创建一个封装Azure语音合成功能的可复用hook
 * @param {Object} options 语音合成配置选项
 * @returns {Object} 包含合成方法的对象
 */
export function useSpeechSynthesis(options = {}) {
  // 默认配置与用户配置合并
  const config = {
    speechKey: apiKey.value || '',
    speechRegion: region.value || 'eastasia',
    speechVoiceName: options.speechVoiceName || 'zh-CN-XiaoxiaoNeural',
    useCustomEndpoint: options.useCustomEndpoint || false,
    customEndpoint: options.customEndpoint || '',
    voiceList: null, // 语音列表缓存
  }

  const fetchVoiceList = async () => {
    if (!config.speechKey) {
      config.speechKey = appStore.settings?.azureTtsKey
    }
    if (!config.speechKey) {
      throw new Error('语音服务密钥未提供')
    }
    const checkExpire = (timestamp, range) => {
      // 使用缓存机制（1小时有效期）
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

    const apiUrl =
      config.useCustomEndpoint && config.customEndpoint
        ? new URL('/cognitiveservices/voices/list', config.customEndpoint).href
        : `https://${config.speechRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': config.speechKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`获取语音列表失败: ${response.status} ${response.statusText}`)
    }

    const voices = await response.json()
    await localforage.setItem('voiceList', {
      updatedAt: Date.now(),
      dateset: voices,
    })
    config.voiceList = voices
    return config.voiceList
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

  /**
   * 根据区域码过滤语音条目
   * @param {Array} voiceList 语音列表
   * @param {string} targetLocale 目标区域码
   * @returns {Array} 匹配的语音条目
   */
  const filterByLocale = (voiceList, targetLocale) => {
    if (!targetLocale) return []
    if (!Array.isArray(voiceList)) return []
    const searchLocale = targetLocale.value?.toLowerCase()

    return voiceList.filter((item) => item.Locale?.toLowerCase() === searchLocale)
  }

  // 返回包含合成方法的对象
  return {
    updateConfig: (newConfig) => {
      Object.assign(config, newConfig)
    },
    fetchVoiceList,
    getUniqueLocales,
    filterByLocale,
  }
}
