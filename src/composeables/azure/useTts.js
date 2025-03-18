import { ref, watch } from 'vue'
import { useSpeechSynthesis } from './SpeechSynthesis'
import localeMappings from '../../localeMappings.js'
import localforage from 'localforage'

export function useTts() {
  const apiKey = process.env.VITE_TTS_KEY
  const region = process.env.VITE_TTS_REGION

  const VOICE_CONFIG_KEY = 'tts_voice_config'

  // Text input
  const textToConvert = ref('')
  const ssmlContent = ref('')
  const isConverting = ref(false)
  const audioUrl = ref('')

  // Configuration
  const selectedLocale = ref('')
  const selectedVoice = ref()
  const voiceOptions = ref([])
  const voiceList = ref([])
  const volume = ref(100)
  const useCustomEndpoint = ref(false)
  const customEndpoint = ref('')
  const locales = ref([])
  // Use REST API directly
  const apiUrl =
    useCustomEndpoint.value && customEndpoint.value
      ? customEndpoint.value
      : `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

  // Initialize speech synthesis hook
  const { updateConfig, fetchVoiceList, getUniqueLocales, filterByLocale } = useSpeechSynthesis({
    speechKey: apiKey,
    speechRegion: region,
    speechVoiceName: selectedVoice.value?.value,
    useCustomEndpoint: useCustomEndpoint.value,
    customEndpoint: customEndpoint.value,
  })

  // Watch for locale changes to update voice options
  watch(selectedLocale, (newLocale) => {
    const filtered = filterByLocale(voiceList.value, newLocale)
    voiceOptions.value = filtered.map((voice) => {
      return {
        label: `${voice.DisplayName} - ${voice.Gender === 'Male' ? '男声' : '女声'}`,
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
        speechKey: apiKey,
        speechRegion: region,
        speechVoiceName: newVoice?.value,
        useCustomEndpoint: newUseCustomEndpoint,
        customEndpoint: newCustomEndpoint,
      })
    },
  )

  // Initialize voice list
  const initVoices = async () => {
    voiceList.value = await fetchVoiceList()
    if (voiceList.value?.length > 0) {
      locales.value = getUniqueLocales(voiceList.value).map((code) => {
        return {
          label: localeMappings[code] || code,
          value: code,
        }
      })
    }
  }

  // Azure text-to-speech function
  const convertToSpeech = async () => {
    if (!ssmlContent.value || !apiKey) {
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
          'Ocp-Apim-Subscription-Key': apiKey,
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

        console.log('voiceList', voiceList.value)

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

  return {
    apiUrl,
    apiKey,
    // State
    textToConvert,
    ssmlContent,
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
    // Methods
    initVoices,
    convertToSpeech,
    saveConfig,
    restoreConfig,
  }
}
