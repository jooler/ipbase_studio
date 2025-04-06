import { ref } from 'vue'
import axios from 'axios'
import { getPromptById, DEFAULT_PROMPT_ID } from '../deepseek/systemPrompts'

const endpoint = 'https://openrouter.ai/api/v1/chat/completions'
const defaultModel = 'anthropic/claude-3-5-sonnet'

/**
 * 用于调用OpenRouter API的自定义hook
 * @param {string} promptId - 提示词ID，默认为系统默认ID
 * @param {string} modelName - 模型名称，默认为'anthropic/claude-3-5-sonnet'
 * @returns {Object} 包含生成文本方法的对象
 */
export function useOpenrouter(promptId = DEFAULT_PROMPT_ID, modelName = defaultModel) {
  const isLoading = ref(false)
  const error = ref(null)
  const streamContent = ref('')
  const streamReasoningContent = ref('')
  const isStreaming = ref(false)
  const model = ref(modelName)

  // 根据ID获取对应的提示词
  const systemPrompt = getPromptById(promptId).content

  /**
   * 解析SSE响应中的数据
   * @param {string} chunk - SSE数据块
   * @returns {object|null} - 解析后的数据对象或null
   */
  const parseSSEResponse = (chunk) => {
    if (!chunk || chunk === '[DONE]') return null

    try {
      const data = JSON.parse(chunk)
      return data
    } catch (err) {
      console.error('解析SSE数据失败:', err)
      return null
    }
  }

  /**
   * 流式调用OpenRouter API生成文本
   * @param {string} prompt - 输入的提示词
   * @param {function} onChunk - 接收每个数据块的回调函数
   * @returns {Promise<string>} 生成的完整内容
   */
  const generateContentStream = async (prompt, onChunk) => {
    isLoading.value = true
    isStreaming.value = true
    error.value = null
    streamContent.value = ''
    streamReasoningContent.value = ''

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || ''}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'OpenRouter API Integration',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model: model.value,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullText = ''
      let fullReasoningText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        // 处理SSE格式 (格式: data: {...}\n\n)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // 移除 "data: " 前缀

            if (data === '[DONE]') {
              continue
            }

            const parsedData = parseSSEResponse(data)
            if (parsedData && parsedData.choices && parsedData.choices.length > 0) {
              const choice = parsedData.choices[0]
              const delta = choice.delta || {}

              // 提取正式内容
              if (delta.content) {
                fullText += delta.content
                streamContent.value = fullText
              }

              // 提取推理内容 - 同时支持reasoning和reasoning_content两种格式
              if (delta.reasoning || delta.reasoning_content) {
                const reasoningChunk = delta.reasoning || delta.reasoning_content
                if (reasoningChunk) {
                  // 更全面地处理原始文本中的换行标记
                  // 1. 处理JSON字符串中转义的换行符(\n, \n\n)
                  // 2. 处理文本中直接出现的"\\n"和"\\n\\n"字符
                  const processedChunk = reasoningChunk
                    .replace(/\\n\\n/g, '\n') // 处理JSON转义的\n\n
                    .replace(/\\n/g, '\n') // 处理JSON转义的\n
                    .replace(/\n\n/g, '\n') // 将连续两个换行符替换为一个
                    .replace(/\\\\n\\\\n/g, '\n') // 处理文本中的\\n\\n
                    .replace(/\\\\n/g, '\n') // 处理文本中的\\n

                  fullReasoningText += processedChunk
                  streamReasoningContent.value = fullReasoningText
                }
              }

              // 调用回调函数，传递当前累积的文本和推理文本
              if (typeof onChunk === 'function') {
                onChunk({
                  content: fullText,
                  reasoningContent: fullReasoningText,
                })
              }
            }
          }
        }
      }

      return {
        content: fullText,
        reasoningContent: fullReasoningText,
      }
    } catch (err) {
      error.value = err.message || '生成内容失败'
      throw err
    } finally {
      isLoading.value = false
      isStreaming.value = false
    }
  }

  /**
   * 调用OpenRouter API生成文本
   * @param {string} prompt - 输入的提示词
   * @returns {Promise<string>} 生成的内容
   */
  const generateContent = async (prompt) => {
    isLoading.value = true
    error.value = null

    try {
      // 创建OpenRouter API请求
      const response = await axios.post(
        endpoint,
        {
          model: model.value,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || ''}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'OpenRouter API Integration',
          },
        },
      )

      // 返回生成的文本
      isLoading.value = false
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content
      }

      throw new Error('API返回格式不正确')
    } catch (err) {
      error.value = err.message || '生成内容失败'
      isLoading.value = false
      throw err
    }
  }

  /**
   * 更改使用的模型
   * @param {string} newModel - 新的模型名称
   */
  const changeModel = (newModel) => {
    model.value = newModel
  }

  return {
    generateContent,
    generateContentStream,
    changeModel,
    isLoading,
    isStreaming,
    streamContent,
    streamReasoningContent,
    error,
    promptId,
    currentModel: model,
  }
}
