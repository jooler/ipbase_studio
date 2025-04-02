<template>
  <div v-if="card" class="row full-height">
    <div class="q-space q-pa-xs">
      <q-card flat square class="full-height row transparent">
        <!-- 媒体类型切换 -->
        <div class="column q-pa-xs gap-xs">
          <q-btn
            :flat="activeType !== 'video'"
            :color="activeType === 'video' ? 'primary' : void 0"
            icon="mdi-video"
            label="视频素材"
            :disable="!card.videos?.length"
            @click="handleMediaTypeChange('video')"
          />
          <q-btn
            color="grey-9"
            icon="mdi-plus"
            label="获取更多"
            :disable="isLoading"
            @click="fetchMoreVideos()"
          >
            <q-inner-loading :showing="isLoading">
              <q-spinner-dots size="50px" color="primary" />
            </q-inner-loading>
          </q-btn>
          <q-btn
            v-if="false"
            :flat="activeType !== 'image'"
            :color="activeType === 'image' ? 'primary' : void 0"
            icon="mdi-image"
            label="图片素材"
            :disable="!card.images?.length"
            @click="handleMediaTypeChange('image')"
          />
        </div>
        <!-- 视频选择部分 -->
        <q-scroll-area
          v-if="card.videos && card.videos.length > 0 && activeType === 'video'"
          horizontal
          class="media-thumbnails q-space"
        >
          <div class="row q-pa-sm">
            <div
              v-for="(video, idx) in card.videos"
              :key="idx"
              class="detail-media-thumbnail cursor-pointer col-3 q-pa-xs"
              :class="{ 'media-selected': isVideoSelected(video) }"
              @click="selectVideo(video)"
            >
              <img :src="video.image" :alt="`视频预览 ${idx + 1}`" class="full-width full-height" />
            </div>
          </div>
        </q-scroll-area>

        <!-- 图片选择部分 -->
        <q-scroll-area
          v-if="card.images && card.images.length > 0 && activeType === 'image'"
          horizontal
          class="media-thumbnails q-space"
        >
          <div class="row no-wrap q-gutter-xs">
            <div
              v-for="(image, idx) in card.images"
              :key="idx"
              class="detail-media-thumbnail cursor-pointer"
              :class="{ 'media-selected': isImageSelected(image) }"
              @click="selectImage(image)"
            >
              <img
                :src="image.src.tiny"
                :alt="`图片预览 ${idx + 1}`"
                class="full-width full-height"
              />
            </div>
          </div>
        </q-scroll-area>
      </q-card>
    </div>
  </div>
  <div v-else class="flex flex-center full-height">
    <div class="text-center">
      <q-icon name="info" size="3rem" color="grey-5" />
      <p class="text-grey-7 q-mt-sm">请选择一个分镜卡片查看详情</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { studioStore } from '../stores/stores'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  card: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:card'])

// 媒体类型
const mediaType = ref(props.card?.mediaType || 'video')

const page = ref(1)
const isLoading = ref(false)

const fetchMoreVideos = async () => {
  if (!props.card?.searchKeywords || isLoading.value) return

  try {
    isLoading.value = true
    page.value++

    // 确保 Worker 已初始化
    if (!pexelsWorker) {
      initWorker()
    }

    // 发送请求到Worker
    pexelsWorker.postMessage({
      action: 'FETCH_VIDEOS',
      data: {
        id: props.card.id,
        keywords: props.card.searchKeywords,
        page: page.value,
      },
    })
  } catch (error) {
    console.error('加载更多视频失败:', error)
    $q.notify({
      type: 'negative',
      message: '加载更多视频失败: ' + (error.message || '未知错误'),
      timeout: 3000,
    })
  } finally {
    isLoading.value = false
  }
}

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
          console.log('VIDEOS_RESULT', data)
          const index = studioStore.storyboardCards.findIndex((card) => card.id === props.card.id)
          if (index !== -1) {
            // 更新卡片数据
            studioStore.storyboardCards[index] = {
              ...studioStore.storyboardCards[index],
              videos: [...studioStore.storyboardCards[index].videos, ...data.videos],
              isLoading: false,
              error: data.error,
            }

            // 更新选中的卡片
            if (studioStore.selectedCard?.id === props.card.id) {
              studioStore.selectedCard = {
                ...studioStore.selectedCard,
                videos: [...studioStore.selectedCard.videos, ...data.videos],
                isLoading: false,
                error: data.error,
              }
            }

            // 保存到 localStorage
            localStorage.setItem('saved_storyboard', JSON.stringify(studioStore.storyboardCards))
          }
        }
      }

      // 错误处理
      pexelsWorker.onerror = (error) => {
        console.error('Worker error:', error)
        $q.notify({
          type: 'negative',
          message: '加载视频时出错: ' + (error.message || '未知错误'),
          timeout: 3000,
        })
      }
    } catch (error) {
      console.error('Failed to initialize worker:', error)
      $q.notify({
        type: 'negative',
        message: '初始化视频加载器失败: ' + (error.message || '未知错误'),
        timeout: 3000,
      })
    }
  }
}

onMounted(() => {
  initWorker()
})

// 监听卡片变化，更新媒体类型
watch(
  () => props.card,
  (newCard) => {
    if (newCard) {
      mediaType.value = newCard.mediaType || 'video'
    }
  },
)

// 选择视频
const selectVideo = (video) => {
  if (!props.card) return

  emit('update:card', {
    ...props.card,
    selected: video,
    mediaType: 'video',
  })
}

// 选择图片
const selectImage = (image) => {
  if (!props.card) return

  emit('update:card', {
    ...props.card,
    selected: image,
    mediaType: 'image',
  })
}

const activeType = ref('video')
// 处理媒体类型变更
const handleMediaTypeChange = (newMediaType) => {
  if (!props.card) return

  activeType.value = newMediaType
}

// 验证视频是否被选中
const isVideoSelected = (video) => {
  if (!props.card) return false
  return (
    props.card.mediaType === 'video' && props.card.selected && props.card.selected.id === video.id
  )
}

// 验证图片是否被选中
const isImageSelected = (image) => {
  if (!props.card) return false
  return (
    props.card.mediaType === 'image' && props.card.selected && props.card.selected.id === image.id
  )
}
</script>

<style scoped>
.card-detail {
  width: 100%;
}

.media-container {
  width: 100%;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  min-height: 400px;
}

.detail-media-thumbnail {
  width: 120px;
  height: 80px;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.detail-media-thumbnail:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.detail-media-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-selected {
  border: 2px solid #42b883;
}
</style>
