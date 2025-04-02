import { ref, watch, computed, nextTick } from 'vue'
import { useSpeechSynthesis } from './SpeechSynthesis'
import localeMappings from '../../localeMappings.js'
import localforage from 'localforage'
import { api } from 'src/boot/axios'
import { appStore } from 'src/stores/stores'
import { uid } from 'quasar'

const azureTtsKey = computed(() => appStore.settings?.azureTtsKey)
const azureTtsRegion = computed(() => appStore.settings?.azureTtsRegion)

// 创建一个单例实例
let ttsInstance = null

export function useTts() {
  // 如果已经存在实例，直接返回
  if (ttsInstance) {
    return ttsInstance
  }

  const VOICE_CONFIG_KEY = 'tts_voice_config'
  const FAVORITE_VOICES_KEY = 'tts_favorite_voices'

  // Text input
  const textToConvert = ref('')
  const ssmlContent = ref('')
  const jsonContent = ref(void 0) // Store editor's JSON content
  const textContent = ref(void 0)
  const isConverting = ref(false)
  const currentFile = ref({
    id: uid(),
    name: '未命名',
    content: null,
  })

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

  // Initialize speech synthesis hook
  const { updateConfig, fetchVoiceList, getUniqueLocales } = useSpeechSynthesis({
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
  const processBase64Audio = (audioBase64Data) => {
    try {
      // 如果数据为空，直接报错
      if (!audioBase64Data) {
        throw new Error('接收到的音频数据为空')
      }

      // 输出Base64数据长度和前20个字符用于调试
      console.log(
        '收到音频数据长度:',
        audioBase64Data.length,
        '前缀:',
        audioBase64Data.substring(0, 20) + '...',
      )

      // 清理Base64字符串，确保其格式正确
      // 移除可能的头部如 "data:audio/mpeg;base64,"
      let audioBase64 = audioBase64Data
      if (audioBase64.includes('base64,')) {
        audioBase64 = audioBase64.split('base64,')[1]
        console.log('删除了data URI前缀')
      }

      // 确保字符串长度是4的倍数，如果不是，添加适当的填充
      const originalLength = audioBase64.length
      while (audioBase64.length % 4 !== 0) {
        audioBase64 += '='
      }

      if (audioBase64.length !== originalLength) {
        console.log('添加了Base64填充，增加了', audioBase64.length - originalLength, '个字符')
      }

      // 检查Base64字符集有效性
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(audioBase64)) {
        console.error('Base64字符串包含无效字符')
        // 不抛出错误，尝试继续处理
      }

      // 将 Base64 转换回二进制数据
      const binaryString = atob(audioBase64) // 解码 Base64
      const len = binaryString.length
      console.log('解码后二进制数据长度:', len)

      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i) // 转换为字节数组
      }

      // 创建 Blob 对象
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
      covertedBlob.value = audioBlob
      const url = URL.createObjectURL(audioBlob)
      console.log('成功创建音频URL:', url)
      return url
    } catch (error) {
      console.error('处理音频数据失败:', error)
      throw new Error(`音频数据处理失败: ${error.message}`)
    }
  }
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
      let url
      console.log('azureTtsKey.value', azureTtsKey.value)

      if (azureTtsKey.value) {
        const ttsApi = `https://${azureTtsRegion.value}.tts.speech.microsoft.com/cognitiveservices/v1`
        const response = await fetch(ttsApi, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureTtsKey.value,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'User-Agent': 'AzureTTSApp/1.0',
          },
          body: previewSsml,
        })
        // strapi.log.info(`fetchVoiceList: ${fetchVoiceList}`);

        if (!response.ok) {
          throw new Error(`获取语音列表失败: ${response.status} ${response.statusText}`)
        }
        const audioBlob = await response.blob()

        if (audioBlob.size === 0) {
          throw new Error('获取到的音频数据为空')
        }

        url = URL.createObjectURL(audioBlob)
      } else {
        const res = await api.post('/tts/convert', {
          data: {
            ssml: previewSsml,
          },
        })
        // 创建音频元素并播放
        url = processBase64Audio(res.data.audioBase64)
      }
      const audio = new Audio(url)
      audio.play()
      previewAudio.value = audio

      // 将音频保存到缓存
      audioCache.value[cacheKey] = {
        audio,
        text: previewText,
      }

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
    if (!selectedLocale.value || !voiceList.value?.length) return []

    const filtered = voiceList.value.filter(
      (voice) => voice.Locale.toLowerCase() === selectedLocale.value.value.toLowerCase(),
    )

    return filtered.map((voice) => ({
      label: `${reLocalName(voice.LocalName)} - ${voice.Gender === 'Male' ? '男声' : '女声'}`,
      value: voice.ShortName,
      ...voice,
    }))
  })

  // Watch configuration changes to update the hook
  watch(
    [selectedVoice, useCustomEndpoint, customEndpoint],
    ([newVoice, newUseCustomEndpoint, newCustomEndpoint]) => {
      updateConfig({
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
    selectedLocale.value = { label: '中文（中国）', value: 'zh-cn' }
    await nextTick()
    selectedVoice.value = voiceOptions.value.find((i) => i.value === 'zh-CN-YunzeNeural')

    // 加载收藏的语音
    await loadFavorites()
  }

  // Azure text-to-speech function
  const covertedAudio = ref({})
  const convertToSpeech = async () => {
    if (!ssmlContent.value) {
      appStore.showError('请输入文本')
      return
    }
    document.activeElement.blur() // 让元素失焦，放置用户按下空格重新请求
    try {
      isConverting.value = true

      // 检查SSML内容是否有效
      if (!ssmlContent.value.includes('<speak') || !ssmlContent.value.includes('</speak>')) {
        throw new Error('SSML格式无效，必须包含<speak>标签')
      }

      // 调试输出完整的SSML
      // console.log('完整的SSML内容:', ssmlContent.value)

      // 检查phoneme元素的正确性
      const phonemeRegex =
        /<phoneme\s+alphabet=['"]([^'"]+)['"]\s+ph=['"]([^'"]+)['"]>([^<]*)<\/phoneme>/g
      const phonemeTags = []
      let match

      // 重置正则表达式的lastIndex
      phonemeRegex.lastIndex = 0

      // 收集所有phoneme标签
      while ((match = phonemeRegex.exec(ssmlContent.value)) !== null) {
        const [fullTag, alphabet, ph, content] = match
        phonemeTags.push({
          fullTag,
          alphabet,
          ph,
          content,
        })

        // 检查ph属性中的拼音格式是否正确
        if (alphabet === 'sapi' && /[\u4e00-\u9fa5]/.test(content)) {
          // 中文字符的SAPI格式需要检查
          if (!/\s\d$/.test(ph)) {
            console.warn(
              `警告：phoneme标签的ph属性可能格式不正确，期望在拼音和声调数字之间有空格: ${ph}`,
            )
          }
        }
      }

      if (phonemeTags.length > 0) {
        console.log('检测到phoneme标签:', phonemeTags)
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
      // console.log('Sending SSML to API:', ssmlContent.value)

      // 确保选择了有效的语音
      if (selectedVoice.value && selectedVoice.value.value) {
        console.log('Using voice:', selectedVoice.value.value)
      } else {
        console.warn('No voice selected, using default from SSML')
      }
      if (currentFile.value && covertedAudio.value && covertedAudio.value[currentFile.value.id]) {
        delete covertedAudio.value[currentFile.value.id]
      }

      if (azureTtsKey.value) {
        const ttsApi = `https://${azureTtsRegion.value}.tts.speech.microsoft.com/cognitiveservices/v1`
        const response = await fetch(ttsApi, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureTtsKey.value,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'User-Agent': 'AzureTTSApp/1.0',
          },
          body: ssmlContent.value,
        })
        // strapi.log.info(`fetchVoiceList: ${fetchVoiceList}`);

        if (!response.ok) {
          throw new Error(`获取语音列表失败: ${response.status} ${response.statusText}`)
        }
        const audioBlob = await response.blob()

        if (audioBlob.size === 0) {
          throw new Error('获取到的音频数据为空')
        }

        covertedBlob.value = audioBlob
        covertedAudio.value[currentFile.value.id] = URL.createObjectURL(audioBlob)
        await localforage.setItem('covertedBlob', audioBlob)
      } else {
        const res = await api.post('/tts/convert', {
          data: {
            ssml: ssmlContent.value,
          },
        })

        // 检查响应是否包含有效的音频数据
        if (!res.data || !res.data.audioBase64) {
          throw new Error('服务器返回的响应不包含有效的音频数据')
        }

        // 检查Base64字符串是否为空
        if (!res.data.audioBase64.trim()) {
          throw new Error('服务器返回的Base64音频数据为空')
        }
        covertedAudio.value[currentFile.value.id] = processBase64Audio(res.data.audioBase64)
      }
    } catch (error) {
      if (error.response?.data?.error) {
        console.log('error', error.response?.data?.error)
        appStore.showError(error.response?.data?.error?.message || '请求失败，请刷新再试')
        return
      }
      console.error('转换失败:', error)

      // 提供更具体的错误信息
      let errorMessage = error.message

      // 如果是网络错误，提供更友好的提示
      if (error.name === 'NetworkError' || error.message.includes('network')) {
        errorMessage = '网络连接错误，请检查您的网络连接并重试'
      }

      // 如果是Base64解码错误，提供更具体的信息
      if (error.message.includes('atob')) {
        errorMessage = '服务器返回的音频数据格式不正确，请联系管理员'
      }

      appStore.showError(`转换失败: ${errorMessage}`)
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
      jsonContent.value = await localforage.getItem('jsonContent')
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
  const setVoice = (val) => {
    selectedVoice.value = val
  }
  const canConvert = computed(() => selectedLocale.value && selectedVoice.value)
  const mode = ref('fileSystem')
  const covertedBlob = ref()
  const studioAttrs = ref()

  // 创建实例
  ttsInstance = {
    mode,
    canConvert,
    // State
    textToConvert,
    ssmlContent,
    jsonContent,
    textContent,
    currentFile,
    isConverting,
    covertedAudio,
    covertedBlob,
    studioAttrs,
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
    setVoice,
  }

  return ttsInstance
}
