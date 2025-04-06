/**
 * OpenRouter支持的AI模型列表
 * 可根据需要添加或移除模型
 */
export const OPENROUTER_MODELS = [
  {
    id: 'anthropic/claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
  },
  {
    id: 'google/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
  },
  {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B',
    provider: 'Meta',
  },
  {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
  },
]

/**
 * 获取默认模型ID
 * @returns {string} 默认模型ID
 */
export const getDefaultModelId = () => 'deepseek/deepseek-r1:free'

/**
 * 根据ID获取模型信息
 * @param {string} modelId - 模型ID
 * @returns {Object|null} 模型信息对象或null
 */
export const getModelById = (modelId) => {
  return OPENROUTER_MODELS.find((model) => model.id === modelId) || null
}

/**
 * 获取所有可用的模型
 * @returns {Array} 模型列表
 */
export const getAllModels = () => OPENROUTER_MODELS
