import { ref, watch, computed } from 'vue'
import { useSpeechSynthesis } from './SpeechSynthesis'
import localeMappings from '../../localeMappings.js'
import localforage from 'localforage'
import { appStore } from 'src/stores/stores'

// 创建一个单例实例
let ttsInstance = null

export function useTts() {
  // 如果已经存在实例，直接返回
  if (ttsInstance) {
    return ttsInstance
  }

  const apiKey = computed(() => appStore.settings?.azureTtsKey)
  const region = computed(() => appStore.settings?.azureTtsRegion)

  const VOICE_CONFIG_KEY = 'tts_voice_config'
  const FAVORITE_VOICES_KEY = 'tts_favorite_voices'

  // Text input
  const textToConvert = ref('')
  const ssmlContent = ref('')
  const jsonContent = ref(void 0) // Store editor's JSON content
  const isConverting = ref(false)
  const audioUrl = ref('')

  // Configuration
  const selectedLocale = ref('')
  const selectedVoice = ref()
  // const voiceOptions = ref([])
  const voiceList = ref([])
  const volume = ref(100)
  const useCustomEndpoint = ref(false)
  const customEndpoint = ref('')
  const locales = ref([])

  // Favorites
  const favoriteVoices = ref([])

  // 预览相关状态
  const previewingVoice = ref(null)
  const playingVoice = ref(null)
  const previewAudio = ref(null)
  const audioCache = ref({})
  const customPreviewText = ref('')

  // 设置自定义预览文本
  const setCustomPreviewText = (text) => {
    customPreviewText.value = text
  }

  // Use REST API directly
  const apiUrl =
    useCustomEndpoint.value && customEndpoint.value
      ? customEndpoint.value
      : `https://${region.value}.tts.speech.microsoft.com/cognitiveservices/v1`

  // Initialize speech synthesis hook
  const { updateConfig, fetchVoiceList, getUniqueLocales, filterByLocale } = useSpeechSynthesis({
    speechKey: apiKey.value,
    speechRegion: region.value,
    speechVoiceName: selectedVoice.value?.value,
    useCustomEndpoint: useCustomEndpoint.value,
    customEndpoint: customEndpoint.value,
  })

  // 更新播放图标显示逻辑
  const getPlayIcon = (voiceValue) => {
    if (playingVoice.value !== voiceValue) return 'mdi-play'
    if (previewAudio.value?.paused) return 'mdi-play'
    return 'mdi-pause'
  }

  const showWave = ref()
  // 预览语音功能
  const previewVoice = async (voice) => {
    console.log('customPreviewText:', customPreviewText.value) // 调试日志
    // 如果当前正在播放这个语音，则暂停或恢复播放
    if (playingVoice.value === voice.value && previewAudio.value) {
      if (previewAudio.value.paused) {
        // 恢复播放
        previewAudio.value.play()
        showWave.value = voice.value
      } else {
        // 暂停播放
        previewAudio.value.pause()
        showWave.value = void 0
      }
      return
    }

    // 如果正在播放其他语音，先暂停
    if (previewAudio.value) {
      previewAudio.value.pause()
    }

    playingVoice.value = voice.value

    // 使用自定义预览文本或默认文本
    const previewText = customPreviewText.value || '这是一段语音预览示例。'
    console.log('预览文本:', previewText) // 调试日志

    // 检查缓存中是否已有该语音的预览
    const cacheKey = `${voice.value}_${selectedLocale.value.value}_${volume.value}_${previewText}`

    if (audioCache.value[cacheKey]) {
      previewAudio.value = audioCache.value[cacheKey].audio
      previewAudio.value.currentTime = 0 // 从头开始播放
      previewAudio.value.play()
      showWave.value = voice.value
      return
    }

    previewingVoice.value = voice.value

    const previewSsml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${selectedLocale.value.value}">
      <voice name="${voice.value}">
        <break strength="medium"/>
        <prosody volume="${volume.value}%">
          ${previewText}
        </prosody>
        <break strength="medium"/>
      </voice>
    </speak>`

    try {
      // 直接调用API进行转换，而不修改当前选中的语音
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey.value,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'AzureTTSApp/1.0',
        },
        body: previewSsml,
      })

      if (!response.ok) {
        console.error('预览语音失败:', await response.text())
        return
      }

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)

      // 创建音频元素并播放
      const audio = new Audio(url)
      previewAudio.value = audio

      // 将音频保存到缓存
      audioCache.value[cacheKey] = {
        audio,
        text: previewText,
      }

      audio.play()
      showWave.value = voice.value

      // 播放完成后更新状态
      audio.onended = () => {
        playingVoice.value = null
        showWave.value = null
      }
    } catch (error) {
      console.error('预览语音出错:', error)
    } finally {
      previewingVoice.value = null
    }
  }

  const voiceOptions = computed(() => {
    const filtered = filterByLocale(voiceList.value, selectedLocale.value)
    return filtered.map((voice) => {
      return {
        label: `${reLocalName(voice.LocalName)} - ${voice.Gender === 'Male' ? '男声' : '女声'}`,
        value: voice.ShortName,
        ...voice,
      }
    })
  })

  // Watch configuration changes to update the hook
  watch(
    [selectedVoice, useCustomEndpoint, customEndpoint],
    ([newVoice, newUseCustomEndpoint, newCustomEndpoint]) => {
      updateConfig({
        speechKey: apiKey.value,
        speechRegion: region.value,
        speechVoiceName: newVoice?.value,
        useCustomEndpoint: newUseCustomEndpoint,
        customEndpoint: newCustomEndpoint,
      })
    },
  )

  // 收藏语音相关功能
  const isFavorite = (voiceValue) => {
    return favoriteVoices.value.includes(voiceValue)
  }

  const toggleFavorite = async (voiceValue) => {
    const index = favoriteVoices.value.indexOf(voiceValue)
    if (index >= 0) {
      // 已收藏，移除收藏
      favoriteVoices.value.splice(index, 1)
    } else {
      // 未收藏，添加收藏
      favoriteVoices.value.push(voiceValue)
    }

    // 保存到本地存储
    await saveFavorites()
  }

  const saveFavorites = async () => {
    try {
      // 确保我们只保存语音ID的数组（简单字符串值）
      const favoritesToSave = [...favoriteVoices.value]
      await localforage.setItem(FAVORITE_VOICES_KEY, favoritesToSave)
    } catch (error) {
      console.error('保存收藏失败:', error)
    }
  }

  const loadFavorites = async () => {
    try {
      const favorites = await localforage.getItem(FAVORITE_VOICES_KEY)
      if (favorites && Array.isArray(favorites)) {
        favoriteVoices.value = favorites
      }
    } catch (error) {
      console.error('加载收藏失败:', error)
    }
  }

  // Initialize voice list
  let VoiceListCache
  const initVoices = async () => {
    if (!apiKey.value || !region.value) {
      appStore.settings.azureTtsKey = await localforage.getItem('azureTtsKey')
      appStore.settings.azureTtsRegion =
        (await localforage.getItem('azureTtsRegion')) || appStore.settings.azureTtsRegion
    }
    if (!apiKey.value || !region.value) {
      return
    }
    voiceList.value = VoiceListCache || (await fetchVoiceList())
    VoiceListCache = voiceList.value
    if (voiceList.value?.length > 0) {
      locales.value = getUniqueLocales(voiceList.value).map((code) => {
        return {
          label: localeMappings[code] || code,
          value: code,
        }
      })
    }

    // 加载收藏的语音
    await loadFavorites()
  }

  // Azure text-to-speech function
  const convertToSpeech = async () => {
    console.log('ssmlContent.value', ssmlContent.value)
    if (!ssmlContent.value || !apiKey.value) {
      alert('请输入文本和API密钥')
      return
    }

    if (useCustomEndpoint.value && !customEndpoint.value) {
      alert('请输入自定义终结点URL')
      return
    }

    try {
      isConverting.value = true
      audioUrl.value = '' // Clear previous URL

      // 检查SSML内容是否有效
      if (!ssmlContent.value.includes('<speak') || !ssmlContent.value.includes('</speak>')) {
        throw new Error('SSML格式无效，必须包含<speak>标签')
      }

      // 深度验证SSML格式
      const validateSsml = (ssml) => {
        // 检查基本结构
        if (!ssml.trim().startsWith('<speak') || !ssml.trim().endsWith('</speak>')) {
          return { valid: false, message: 'SSML必须以<speak>开始并以</speak>结束' }
        }

        // 检查命名空间声明
        if (!ssml.includes('xmlns="http://www.w3.org/2001/10/synthesis"')) {
          return {
            valid: false,
            message: 'SSML必须包含正确的命名空间声明: xmlns="http://www.w3.org/2001/10/synthesis"',
          }
        }

        // 检查version声明
        if (!ssml.includes('version="1.0"')) {
          console.warn('SSML应该包含版本声明: version="1.0"')
        }

        // 检查lang属性
        if (!ssml.includes('xml:lang=')) {
          return {
            valid: false,
            message: 'SSML必须包含xml:lang属性',
          }
        }

        // 检查嵌套标签是否正确
        // 检查标签嵌套顺序是否正确
        const prosodyVoicePattern = /<prosody[^>]*><voice[^>]*>/g
        if (prosodyVoicePattern.test(ssml)) {
          return {
            valid: false,
            message: '标签嵌套顺序错误: <prosody>不应包含<voice>, 应该是<voice>包含<prosody>',
          }
        }

        // 检查语音名称是否存在
        const voiceNamePattern = /<voice[^>]*name=["']([^"']+)["'][^>]*>/g
        let voiceNameMatch
        while ((voiceNameMatch = voiceNamePattern.exec(ssml)) !== null) {
          const voiceName = voiceNameMatch[1]
          // 检查是否是空名称
          if (!voiceName || voiceName.trim() === '') {
            return {
              valid: false,
              message: '语音名称不能为空',
            }
          }

          // 只在voiceList有值时进行检查（避免初始状态未加载时报错）
          if (voiceList.value && voiceList.value.length > 0) {
            const validVoice = voiceList.value.some((v) => v.ShortName === voiceName)
            if (!validVoice) {
              console.warn(`警告：语音名称 "${voiceName}" 不在已知的语音列表中，可能不受支持`)
              // 返回警告而不是错误，允许用户尝试使用可能支持的语音
              // return {
              //   valid: false,
              //   message: `不支持的语音名称: ${voiceName}`,
              // }
            }
          }
        }

        // 添加对mstts命名空间的支持检查
        const msttsPattern = /xmlns:mstts=/g
        if (msttsPattern.test(ssml)) {
          // 确保mstts命名空间声明是正确的
          if (!ssml.includes('xmlns:mstts="https://www.w3.org/2001/mstts"')) {
            console.warn(
              'mstts命名空间声明可能不正确，推荐使用: xmlns:mstts="https://www.w3.org/2001/mstts"',
            )
          }
        }

        // 创建一个堆栈来跟踪开放的标签
        const tagStack = []
        // 定义自闭合标签列表
        const selfClosingTags = ['break']

        // 使用正则表达式匹配所有XML标签
        const tagRegex = /<\/?([a-z]+)(?:\s+[^>]*)?(?:\/)?>/gi
        let match

        while ((match = tagRegex.exec(ssml)) !== null) {
          const fullTag = match[0]
          const tagName = match[1].toLowerCase()

          // 检查是否是自闭合标签
          if (fullTag.endsWith('/>')) {
            // 如果是自闭合标签，确保它在允许的列表中
            if (!selfClosingTags.includes(tagName)) {
              return {
                valid: false,
                message: `不允许的自闭合标签: ${tagName}`,
              }
            }
            continue // 跳过后续处理
          }

          // 处理开始标签
          if (!fullTag.startsWith('</')) {
            tagStack.push(tagName)
            continue
          }

          // 处理结束标签
          if (tagStack.length === 0) {
            return {
              valid: false,
              message: `意外的结束标签: ${tagName}`,
            }
          }

          const lastOpenTag = tagStack.pop()
          if (lastOpenTag !== tagName) {
            return {
              valid: false,
              message: `标签不匹配: 期望 ${lastOpenTag}, 实际是 ${tagName}`,
            }
          }
        }

        // 检查是否所有标签都已正确关闭
        if (tagStack.length > 0) {
          return {
            valid: false,
            message: `未闭合的标签: ${tagStack.join(', ')}`,
          }
        }

        return { valid: true }
      }

      const validation = validateSsml(ssmlContent.value)
      if (!validation.valid) {
        console.error('SSML验证失败:', validation.message, ssmlContent.value)
        throw new Error(`SSML验证失败: ${validation.message}`)
      }

      // 输出SSML内容以便调试
      console.log('Sending SSML to API:', ssmlContent.value)

      // 确保选择了有效的语音
      if (selectedVoice.value && selectedVoice.value.value) {
        console.log('Using voice:', selectedVoice.value.value)
      } else {
        console.warn('No voice selected, using default from SSML')
      }

      // Direct API call
      console.log('发送SSML请求，内容长度:', ssmlContent.value.length, '字节')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey.value,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'AzureTTSApp/1.0',
        },
        body: ssmlContent.value,
      })

      // 详细记录错误信息
      if (!response.ok) {
        const errorText = await response.text().catch(() => '无法获取错误详情')

        // 更详细的错误日志
        console.error('API 请求失败:', {
          url: apiUrl,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()]),
          responseBody: errorText,
        })

        // 针对常见错误码提供更具体的提示
        let errorMessage = `Azure API错误: ${response.status} ${response.statusText}`

        if (response.status === 400) {
          errorMessage += '\n可能原因: SSML格式错误或包含不支持的语音名称'

          if (errorText.includes('voice')) {
            errorMessage += '\n语音名称可能不正确或不支持'
          }
          if (errorText.includes('prosody')) {
            errorMessage += '\nprosody标签可能使用了不支持的属性值'
          }
          if (errorText.includes('InvalidSsmlElement')) {
            errorMessage += '\nSSML包含无效的元素或属性'
          }
        } else if (response.status === 401) {
          errorMessage += '\n认证失败，请检查API密钥是否正确'
        } else if (response.status === 429) {
          errorMessage += '\n请求过多，超出API限制'
        } else if (response.status >= 500) {
          errorMessage += '\n服务器端错误，请稍后重试'
        }

        errorMessage += `\n详细错误: ${errorText}`
        throw new Error(errorMessage)
      }

      // Process returned audio data
      const audioBlob = await response.blob()
      console.log('获取到音频Blob:', audioBlob.size, 'bytes', audioBlob.type)

      if (audioBlob.size === 0) {
        throw new Error('获取到的音频数据为空')
      }

      audioUrl.value = URL.createObjectURL(audioBlob)
      console.log('生成音频URL:', audioUrl.value)
    } catch (error) {
      console.error('转换失败:', error)
      alert(`转换失败: ${error.message}`)
    } finally {
      isConverting.value = false
    }
  }
  const selectedRateValue = ref(100)
  const selectedPitchValue = ref(100)
  // 保存配置到 localforage
  async function saveConfig() {
    try {
      const config = {
        locale: selectedLocale.value?.value || null,
        voiceId: selectedVoice.value?.value || null, // 只保存语音的唯一标识符
        rate: selectedRateValue.value,
        pitch: selectedPitchValue.value,
        volume: volume.value,
      }
      await localforage.setItem(VOICE_CONFIG_KEY, config)
    } catch (error) {
      console.error('保存配置失败:', error)
    }
  }

  // 从 localforage 恢复配置
  async function restoreConfig() {
    try {
      const config = await localforage.getItem(VOICE_CONFIG_KEY)
      if (config) {
        // 恢复语言
        if (config.locale) {
          const locale = locales.value.find((l) => l.value === config.locale)
          if (locale) {
            selectedLocale.value = locale
          }
        }

        // 恢复语音
        if (config.voiceId) {
          const voice = voiceList.value.find((v) => v.ShortName === config.voiceId)
          if (voice) {
            selectedVoice.value = {
              label: `${voice.DisplayName} - ${voice.Gender === 'Male' ? '男声' : '女声'}`,
              value: voice.ShortName,
              ...voice,
            }
          }
        }

        // 恢复语速
        if (config.rate) {
          selectedRateValue.value = config.rate
        }

        // 恢复音调
        if (config.pitch) {
          selectedPitchValue.value = config.pitch
        }

        // 恢复音量
        if (typeof config.volume === 'number') {
          volume.value = config.volume
        }
      }
    } catch (error) {
      console.error('恢复配置失败:', error)
    }
  }
  const reLocalName = (localName) => {
    if (localName === 'Yunfan Multilingual') {
      return '云帆'
    } else if (localName === 'Yunxiao Multilingual') {
      return '云潇'
    } else {
      return localName
    }
  }

  // 创建实例
  ttsInstance = {
    apiUrl,
    apiKey,
    // State
    textToConvert,
    ssmlContent,
    jsonContent,
    isConverting,
    audioUrl,
    selectedLocale,
    selectedVoice,
    voiceOptions,
    volume,
    locales,
    voiceList,
    selectedRateValue,
    selectedPitchValue,
    // Preview related
    previewingVoice,
    playingVoice,
    previewAudio,
    showWave,
    customPreviewText,
    // Favorites related
    favoriteVoices,
    isFavorite,
    toggleFavorite,
    // Methods
    initVoices,
    convertToSpeech,
    saveConfig,
    restoreConfig,
    previewVoice,
    getPlayIcon,
    setCustomPreviewText,
    reLocalName,
  }

  return ttsInstance
}
