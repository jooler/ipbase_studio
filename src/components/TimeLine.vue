<template>
  <div class="column full-height no-wrap">
    <div
      v-if="studioStore.storyboardCards?.length === 0 && !isGenerating"
      class="flex flex-center full-height text-grey-6"
    >
      <div class="column items-center">
        <q-btn
          color="deep-orange"
          size="xl"
          icon="movie"
          label="生成分镜"
          @click="generateStoryboard"
        />
        <div class="q-mt-lg">点击"生成分镜"按钮，根据配音稿生成视频分镜头脚本</div>
      </div>
    </div>
    <q-inner-loading v-if="isGenerating" :showing="isGenerating">
      <q-spinner-clock size="50px" color="deep-orange" />
      <span>大模型正在输出，请耐心等待...</span>
    </q-inner-loading>
    <template v-else>
      <q-scroll-area class="full-width bg-darker q-mt-xs" style="flex: 0 0 94px">
        <div class="column">
          <!-- 分镜卡片区域 -->
          <div class="row items-start no-wrap overflow-auto">
            <StoryboardCard
              v-for="(card, index) in studioStore.storyboardCards"
              :key="card.id"
              :card="card"
              :class="
                studioStore.selectedCard?.id === card.id
                  ? 'border-solid border-info border-xs'
                  : 'border-placeholder'
              "
              @update:card="updateCard(index, $event)"
              @search-pexels="searchPexels"
              @select-card="selectCard"
            />
          </div>
        </div>
      </q-scroll-area>
      <!-- 卡片详情区域 -->
      <div class="q-space row q-px-xl gap-sm">
        <CardDetail
          :card="studioStore.selectedCard"
          @update:card="updateSelectedCard"
          class="q-space"
        />
        <!-- 添加控制面板组件 -->
        <TimelineControls
          class="q-py-sm"
          :storyboardCards="studioStore.storyboardCards"
          :isGenerating="isGenerating"
          :isLoadingVideos="isLoadingVideos"
          :isLoadingImages="isLoadingImages"
          @regenerate="generateStoryboard"
          @refresh-videos="fetchVideosForCards"
          @refresh-images="fetchImagesForCards"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useTts } from 'src/composeables/azure/useTts'
import { useDeepseek } from 'src/composeables/deepseek/useDeepseek'
import { useQuasar } from 'quasar'
import TimelineControls from './TimelineControls.vue'
import StoryboardCard from './StoryboardCard.vue'
import CardDetail from './CardDetail.vue'
import { studioStore } from 'src/stores/stores'

const $q = useQuasar()
const isGenerating = ref(false)
const reasoningContent = ref('')
const isLoadingVideos = ref(false)
const isLoadingImages = ref(false)

// Web Worker 实例
let pexelsWorker = null

// 初始化Web Worker
const initWorker = () => {
  if (typeof Worker !== 'undefined') {
    try {
      pexelsWorker = new Worker(new URL('../workers/pexelsWorker.js', import.meta.url))

      // 处理从Worker返回的消息
      pexelsWorker.onmessage = (e) => {
        const { action, data } = e.data

        if (action === 'VIDEOS_RESULT') {
          // 找到对应的分镜卡片并更新视频数据
          const cardIndex = studioStore.storyboardCards.findIndex((card) => card.id === data.id)

          if (cardIndex !== -1) {
            // 更新卡片数据，添加视频属性
            studioStore.storyboardCards[cardIndex] = {
              ...studioStore.storyboardCards[cardIndex],
              videos: data.videos,
              isLoading: false,
              error: data.error,
            }

            // 如果没有已选择媒体或当前是视频模式，并且有视频结果，则选择第一个视频
            if (
              (!studioStore.storyboardCards[cardIndex].selected ||
                studioStore.storyboardCards[cardIndex].mediaType === 'video') &&
              data.videos.length > 0
            ) {
              studioStore.storyboardCards[cardIndex].selected = data.videos[0]
              studioStore.storyboardCards[cardIndex].mediaType = 'video'
            }

            // 保存更新后的数据
            localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))
          }

          // 检查是否所有视频都已加载完成
          const allLoaded = !studioStore.storyboardCards.some((card) => card.isLoading === true)
          if (allLoaded) {
            isLoadingVideos.value = false
          }
        } else if (action === 'IMAGES_RESULT') {
          // 找到对应的分镜卡片并更新图片数据
          const cardIndex = studioStore.storyboardCards.findIndex((card) => card.id === data.id)

          if (cardIndex !== -1) {
            // 更新卡片数据，添加图片属性
            studioStore.storyboardCards[cardIndex] = {
              ...studioStore.storyboardCards[cardIndex],
              images: data.images,
              isLoading: false,
              error: data.error,
            }

            // 如果没有已选择媒体或当前是图片模式，并且有图片结果，则选择第一个图片
            if (
              (!studioStore.storyboardCards[cardIndex].selected ||
                studioStore.storyboardCards[cardIndex].mediaType === 'image') &&
              data.images.length > 0
            ) {
              studioStore.storyboardCards[cardIndex].selected = data.images[0]
              studioStore.storyboardCards[cardIndex].mediaType = 'image'
            }

            // 保存更新后的数据
            localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))
          }

          // 检查是否所有图片都已加载完成
          const allLoaded = !studioStore.storyboardCards.some((card) => card.isLoading === true)
          if (allLoaded) {
            isLoadingImages.value = false
          }
        }
      }

      // 错误处理
      pexelsWorker.onerror = (error) => {
        console.error('Worker error:', error)
        isLoadingVideos.value = false
        isLoadingImages.value = false
        $q.notify({
          type: 'negative',
          message: '加载媒体时出错: ' + (error.message || '未知错误'),
          timeout: 3000,
        })
      }
    } catch (error) {
      console.error('Failed to initialize worker:', error)
    }
  }
}

// 组件销毁前终止Worker
onBeforeUnmount(() => {
  if (pexelsWorker) {
    pexelsWorker.terminate()
    pexelsWorker = null
  }
})

// 使用TTS和Deepseek composables (使用storyboard提示词ID)
const { studioAttrs, jsonContent, textContent: textContentTts } = useTts()
const { generateContentStream, isStreaming, streamContent, streamReasoningContent } =
  useDeepseek('storyboard')

// 获取文本内容
const textContent = computed(() => {
  if (textContentTts.value) {
    return textContentTts.value
  }
  // 首先尝试从studioAttrs获取
  if (studioAttrs.value?.file?.jsonContent) {
    return extractTextFromTiptapJson(studioAttrs.value.file.jsonContent)
  }
  // 然后尝试从当前编辑器内容获取
  if (jsonContent.value) {
    return extractTextFromTiptapJson(jsonContent.value)
  }
  return ''
})

// 打开Pexels搜索页面
const searchPexels = (keywords) => {
  if (!keywords) return

  let searchTerm = keywords
  if (Array.isArray(keywords)) {
    searchTerm = keywords.join(' ')
  }

  // 构建Pexels搜索URL
  const searchUrl = `https://www.pexels.com/search/${encodeURIComponent(searchTerm)}/`

  // 打开新标签页
  window.open(searchUrl, '_blank')
}

// 判断是否有内容可生成分镜
const hasContent = computed(() => textContent.value.trim().length > 0)

// 从Tiptap JSON格式提取纯文本
const extractTextFromTiptapJson = (json) => {
  if (!json || !json.content) return ''

  let text = ''
  const processNode = (node) => {
    if (node.type === 'text' && node.text) {
      text += node.text + ' '
    } else if (node.content && Array.isArray(node.content)) {
      node.content.forEach(processNode)
    }
  }

  json.content.forEach(processNode)
  return text.trim()
}
// 更新卡片
const updateCard = (index, _updatedCard) => {
  if (index >= 0 && index < studioStore.storyboardCards.length) {
    studioStore.storyboardCards[index] = _updatedCard
    // 保存更新到localStorage
    localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))
  }
}

// 选择卡片
const selectCard = (card) => {
  studioStore.setSelectedCard(card)
}
onMounted(async () => {
  await nextTick()
  if (studioStore.storyboardCards?.length > 0) {
    selectCard(studioStore.storyboardCards[0])
  }
})

// 更新选中的卡片
const updateSelectedCard = (updatedCard) => {
  if (!studioStore.selectedCard) return

  // 找到对应的索引
  const index = studioStore.storyboardCards.findIndex((card) => card.id === updatedCard.id)
  if (index !== -1) {
    // 更新状态
    updateCard(index, updatedCard)
    // 同步更新选中的卡片
    studioStore.setSelectedCard(updatedCard)
  }
}

// 监听流式内容变化，尝试解析JSON
watch(streamContent, (newValue) => {
  if (isStreaming.value && newValue) {
    try {
      // 先尝试直接解析JSON
      let jsonData
      try {
        jsonData = JSON.parse(newValue)
      } catch {
        // 如果直接解析失败，检查是否包含markdown代码块
        const codeBlockMatch = newValue.match(/```json\s*([\s\S]*?)\s*```/)
        if (codeBlockMatch && codeBlockMatch[1]) {
          // 提取代码块内容并解析
          jsonData = JSON.parse(codeBlockMatch[1])
        } else {
          // 尝试匹配任何可能的JSON对象
          const jsonMatch = newValue.match(/{[\s\S]*"storyboard"[\s\S]*}/)
          if (jsonMatch) {
            jsonData = JSON.parse(jsonMatch[0])
          } else {
            return // 没有找到有效的JSON
          }
        }
      }

      // 检查提取的JSON数据
      if (jsonData && jsonData.storyboard && Array.isArray(jsonData.storyboard)) {
        studioStore.setStoryboardCards(jsonData.storyboard)
      }
      // 处理嵌套结构 {"content": {"storyboard": [...]}}
      else if (
        jsonData &&
        jsonData.content &&
        jsonData.content.storyboard &&
        Array.isArray(jsonData.content.storyboard)
      ) {
        studioStore.setStoryboardCards(jsonData.content.storyboard)
      }
    } catch {
      // 解析失败，可能是JSON不完整或格式不正确，忽略错误
    }
  }
})

// 监听推理内容变化
watch(streamReasoningContent, (newValue) => {
  if (isStreaming.value && newValue) {
    reasoningContent.value = newValue
  }
})

// 获取视频素材函数
const fetchVideosForCards = () => {
  if (!pexelsWorker) {
    initWorker()
  }

  // 标记正在加载视频
  isLoadingVideos.value = true

  // 通知用户开始加载视频
  $q.notify({
    type: 'info',
    message: '开始为分镜加载视频素材，请稍候...',
    timeout: 2000,
  })

  // 清除worker队列
  pexelsWorker.postMessage({ action: 'CLEAR_QUEUE' })

  // 遍历所有卡片，为每个卡片请求视频
  studioStore.storyboardCards.forEach((card) => {
    // 检查是否有搜索关键词
    if (card.searchKeywords) {
      // 标记当前卡片正在加载
      card.isLoading = true

      // 发送请求到Worker
      pexelsWorker.postMessage({
        action: 'FETCH_VIDEOS',
        data: {
          id: card.id,
          keywords: card.searchKeywords,
        },
      })
    }
  })
}

// 获取图片素材函数
const fetchImagesForCards = () => {
  if (!pexelsWorker) {
    initWorker()
  }

  // 标记正在加载图片
  isLoadingImages.value = true

  // 通知用户开始加载图片
  $q.notify({
    type: 'info',
    message: '开始为分镜加载图片素材，请稍候...',
    timeout: 2000,
  })

  // 清除worker队列
  pexelsWorker.postMessage({ action: 'CLEAR_QUEUE' })

  // 遍历所有卡片，为每个卡片请求图片
  studioStore.storyboardCards.forEach((card) => {
    // 检查是否有搜索关键词
    if (card.searchKeywords) {
      // 标记当前卡片正在加载
      card.isLoading = true

      // 发送请求到Worker
      pexelsWorker.postMessage({
        action: 'FETCH_IMAGES',
        data: {
          id: card.id,
          keywords: card.searchKeywords,
        },
      })
    }
  })
}

// 生成分镜脚本时的基础卡片数据加工
const processStoryboardCards = (cards) => {
  return cards.map((card) => ({
    ...card,
    videos: [],
    images: [],
    isLoading: false,
    selected: null,
    mediaType: 'video', // 默认媒体类型为视频
  }))
}

// 生成分镜脚本
const generateStoryboard = async () => {
  if (!hasContent.value) {
    $q.notify({
      type: 'warning',
      message: '没有可用的配音文本内容',
      timeout: 2000,
    })
    return
  }

  try {
    isGenerating.value = true
    studioStore.storyboardCards = []
    studioStore.setSelectedCard(null)
    reasoningContent.value = ''

    // 构建请求提示词
    const prompt = `请为以下文案内容生成分镜头脚本：\n\n${textContent.value}`

    // 使用流式API
    const result = await generateContentStream(prompt, ({ content }) => {
      // 流式内容回调
      if (!content) return

      // 尝试解析
      try {
        // 先尝试直接解析
        let jsonData
        try {
          jsonData = JSON.parse(content)
        } catch {
          // 如果直接解析失败，检查是否包含markdown代码块
          const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
          if (codeBlockMatch && codeBlockMatch[1]) {
            // 提取代码块内容并解析
            try {
              jsonData = JSON.parse(codeBlockMatch[1])
            } catch {
              // 代码块内容可能不完整，继续等待
              return
            }
          } else {
            // 尝试匹配任何可能的JSON对象
            const jsonMatch = content.match(/{[\s\S]*"storyboard"[\s\S]*}/)
            if (jsonMatch) {
              try {
                jsonData = JSON.parse(jsonMatch[0])
              } catch {
                // JSON不完整，继续等待
                return
              }
            } else {
              // 未找到有效JSON
              return
            }
          }
        }

        // 检查提取的JSON数据
        if (jsonData && jsonData.storyboard && Array.isArray(jsonData.storyboard)) {
          studioStore.setStoryboardCards(processStoryboardCards(jsonData.storyboard))
          localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))
        }
        // 处理嵌套结构 {"content": {"storyboard": [...]}}
        else if (
          jsonData &&
          jsonData.content &&
          jsonData.content.storyboard &&
          Array.isArray(jsonData.content.storyboard)
        ) {
          studioStore.setStoryboardCards(processStoryboardCards(jsonData.content.storyboard))
          localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))
        }
      } catch {
        // 解析错误，可能是JSON不完整
      }
    })

    // 处理最终结果
    if (result && result.content) {
      try {
        // 尝试直接解析
        let jsonData
        try {
          jsonData = JSON.parse(result.content)
        } catch {
          // 如果直接解析失败，检查是否包含markdown代码块
          const codeBlockMatch = result.content.match(/```json\s*([\s\S]*?)\s*```/)
          if (codeBlockMatch && codeBlockMatch[1]) {
            // 提取代码块内容并解析
            jsonData = JSON.parse(codeBlockMatch[1])
          } else {
            // 尝试匹配任何可能的JSON对象
            const jsonMatch = result.content.match(/{[\s\S]*"storyboard"[\s\S]*}/)
            if (jsonMatch) {
              jsonData = JSON.parse(jsonMatch[0])
            } else {
              throw new Error('无法解析返回的内容')
            }
          }
        }

        if (jsonData && jsonData.storyboard && Array.isArray(jsonData.storyboard)) {
          studioStore.setStoryboardCards(processStoryboardCards(jsonData.storyboard))
          // 保存到localStorage
          localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))

          $q.notify({
            type: 'positive',
            message: `成功生成${studioStore.storyboardCards.length}个分镜头`,
            timeout: 2000,
          })

          // 自动获取视频素材
          fetchVideosForCards()
        } else {
          // 处理返回的可能是嵌套的结构，如 {"content": {"storyboard": [...]}}
          if (
            jsonData &&
            jsonData.content &&
            jsonData.content.storyboard &&
            Array.isArray(jsonData.content.storyboard)
          ) {
            studioStore.setStoryboardCards(processStoryboardCards(jsonData.content.storyboard))
            // 保存到localStorage
            localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))

            $q.notify({
              type: 'positive',
              message: `成功生成${studioStore.storyboardCards.length}个分镜头`,
              timeout: 2000,
            })

            // 自动获取视频素材
            fetchVideosForCards()
          } else {
            throw new Error('返回的JSON数据没有storyboard字段')
          }
        }
      } catch (parseError) {
        console.error('解析JSON失败:', parseError)
        console.log('原始返回数据:', result.content)

        $q.notify({
          type: 'negative',
          message: '解析分镜脚本失败: ' + (parseError.message || '未知错误'),
          timeout: 3000,
        })
      }
    }
  } catch (err) {
    console.error('生成分镜脚本失败:', err)
    $q.notify({
      type: 'negative',
      message: '生成分镜脚本失败: ' + (err.message || '未知错误'),
      timeout: 3000,
    })
  } finally {
    isGenerating.value = false
  }
}

// 在组件加载时初始化Worker并加载保存的数据
onMounted(async () => {
  // 初始化Worker
  initWorker()

  try {
    const savedStoryboard = localStorage.getItem('saved_storyboard')
    if (savedStoryboard) {
      studioStore.setStoryboardCards(JSON.parse(savedStoryboard))

      // 检查是否需要加载视频
      const hasNoVideos = studioStore.storyboardCards.some(
        (card) => card.searchKeywords && (!card.videos || card.videos.length === 0),
      )

      // 自动加载视频（如果没有视频但有关键词）
      if (hasNoVideos) {
        fetchVideosForCards()
      }

      // 注意：不自动加载图片，除非用户选择了图片模式
    }
  } catch (error) {
    console.error('加载保存的分镜脚本失败:', error)
  }
})
</script>

<style scoped>
.gap-xs {
  gap: 8px;
}

.overflow-auto {
  overflow-x: auto;
}
</style>
