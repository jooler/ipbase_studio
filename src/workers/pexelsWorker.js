/**
 * Pexels API Web Worker
 * 用于在后台处理Pexels API请求，避免阻塞主线程
 */

// 请求队列与控制变量
let requestQueue = []
let isProcessing = false
const RATE_LIMIT_DELAY = 300 // 请求间隔时间(毫秒)，增加到300ms避免过于频繁请求
const MAX_RETRIES = 3 // 最大重试次数

// 在worker中导入环境变量
const PEXELS_API_URL = 'https://api.pexels.com/v1/'
const PEXELS_VIDEOS_API_URL = 'https://api.pexels.com/videos/'
const PEXELS_API_KEY = 'ydPYopu9nJBMINXA2jAJN1VrDTLfqFWXaS4b9rnFlX9FuIQ2dZayCmZX' // 使用env中的有效密钥

// 处理来自主线程的消息
self.onmessage = function (e) {
  const { action, data } = e.data

  switch (action) {
    case 'FETCH_VIDEOS':
      // 添加到请求队列
      requestQueue.push({
        id: data.id,
        keywords: data.keywords,
        retries: 0,
      })

      // 开始处理队列（如果未在处理中）
      if (!isProcessing) {
        processQueue()
      }
      break

    case 'CLEAR_QUEUE':
      // 清空请求队列
      requestQueue = []
      break

    case 'FETCH_IMAGES':
      // 添加图片请求到队列
      requestQueue.push({
        id: data.id,
        keywords: data.keywords,
        type: 'images',
        retries: 0,
      })

      // 开始处理队列（如果未在处理中）
      if (!isProcessing) {
        processQueue()
      }
      break
  }
}

/**
 * 处理请求队列
 */
async function processQueue() {
  if (requestQueue.length === 0) {
    isProcessing = false
    return
  }

  isProcessing = true
  const request = requestQueue.shift()

  try {
    // 根据请求类型获取不同资源
    let result
    if (request.type === 'images') {
      result = await fetchImagesFromPexels(request.keywords)
      // 发送图片结果
      self.postMessage({
        action: 'IMAGES_RESULT',
        data: {
          id: request.id,
          images: result,
          error: null,
        },
      })
    } else {
      // 默认获取视频
      result = await fetchVideosFromPexels(request.keywords)
      // 发送视频结果
      self.postMessage({
        action: 'VIDEOS_RESULT',
        data: {
          id: request.id,
          videos: result,
          error: null,
        },
      })
    }
  } catch (error) {
    console.error('Worker fetch error:', error)

    // 如果未超过最大重试次数，将请求重新加入队列
    if (request.retries < MAX_RETRIES) {
      requestQueue.push({
        ...request,
        retries: request.retries + 1,
      })
    } else {
      // 超过最大重试次数，返回错误
      const action = request.type === 'images' ? 'IMAGES_RESULT' : 'VIDEOS_RESULT'
      const dataKey = request.type === 'images' ? 'images' : 'videos'

      self.postMessage({
        action: action,
        data: {
          id: request.id,
          [dataKey]: [],
          error: error.message || '获取资源失败',
        },
      })
    }
  }

  // 添加延迟，避免API请求过于频繁
  setTimeout(() => {
    processQueue()
  }, RATE_LIMIT_DELAY)
}

/**
 * 从Pexels获取视频
 * @param {string} keywords - 搜索关键词
 * @returns {Promise<Array>} - 视频数组
 */
async function fetchVideosFromPexels(keywords) {
  // 处理关键词：替换多余空格，去除特殊字符
  const processedKeywords = keywords
    .trim()
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .replace(/[^\w\s]/g, '') // 移除特殊字符

  const params = new URLSearchParams({
    query: processedKeywords,
    per_page: 5,
    orientation: 'landscape',
    size: 'medium', // 使用中等大小视频以提高加载速度
  })

  const response = await fetch(`${PEXELS_VIDEOS_API_URL}search?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: PEXELS_API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  return data.videos || []
}

/**
 * 从Pexels获取图片
 * @param {string} keywords - 搜索关键词
 * @returns {Promise<Array>} - 图片数组
 */
async function fetchImagesFromPexels(keywords) {
  // 处理关键词：替换多余空格，去除特殊字符
  const processedKeywords = keywords
    .trim()
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .replace(/[^\w\s]/g, '') // 移除特殊字符

  const params = new URLSearchParams({
    query: processedKeywords,
    per_page: 5,
    orientation: 'landscape',
    size: 'medium', // 使用中等大小图片
  })

  const response = await fetch(`${PEXELS_API_URL}search?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: PEXELS_API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  return data.photos || []
}
