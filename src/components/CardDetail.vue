<template>
  <div v-if="card" class="row full-height">
    <div class="col-8 q-pa-xs">
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
    <!-- 卡片信息 -->
    <q-scroll-area class="col-4 q-pa-xs">
      <q-card flat square class="full-height transparent">
        <q-card-section>
          <div class="row q-mb-sm">
            <div class="col-4 text-subtitle2">描述:</div>
            <div class="col-8">{{ card.description }}</div>
          </div>

          <div class="row q-mb-sm">
            <div class="col-4 text-subtitle2">台词:</div>
            <div class="col-8">{{ card.text }}</div>
          </div>

          <!-- 关键词 -->
          <div v-if="card.searchKeywords" class="row q-mb-sm">
            <div class="col-4 text-subtitle2">关键词:</div>
            <div class="col-8">
              <div class="row q-gutter-xs">
                <q-chip
                  v-for="(keyword, idx) in formatKeywords(card.searchKeywords)"
                  :key="idx"
                  size="sm"
                  color="deep-orange"
                  outline
                  class="cursor-pointer"
                  @click="searchPexels(keyword)"
                >
                  {{ keyword }}
                </q-chip>
              </div>
            </div>
          </div>
          <div class="row items-center q-mb-sm">
            <div class="col-4 text-subtitle2">ID:</div>
            <div class="col-8">{{ card.id }}</div>
          </div>

          <div class="row items-center q-mb-sm">
            <div class="col-4 text-subtitle2">时间:</div>
            <div class="col-8">{{ card.time }}</div>
          </div>

          <div class="row items-center q-mb-sm">
            <div class="col-4 text-subtitle2">镜头类型:</div>
            <div class="col-8">{{ card.shot_type }}</div>
          </div>

          <div class="row items-center q-mb-sm">
            <div class="col-4 text-subtitle2">转场:</div>
            <div class="col-8">
              <q-badge outline color="orange">{{ card.transition }}</q-badge>
            </div>
          </div>

          <div class="row items-center q-mb-sm">
            <div class="col-4 text-subtitle2">运镜:</div>
            <div class="col-8">
              <q-badge outline color="teal">{{ card.motion }}</q-badge>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-scroll-area>
  </div>
  <div v-else class="flex flex-center full-height">
    <div class="text-center">
      <q-icon name="info" size="3rem" color="grey-5" />
      <p class="text-grey-7 q-mt-sm">请选择一个分镜卡片查看详情</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:card'])

// 媒体类型
const mediaType = ref(props.card?.mediaType || 'video')

// 监听卡片变化，更新媒体类型
watch(
  () => props.card,
  (newCard) => {
    if (newCard) {
      mediaType.value = newCard.mediaType || 'video'
    }
  },
)

// 处理关键词，转换为数组
const formatKeywords = (keywords) => {
  if (!keywords) return []
  // 如果已经是数组，直接返回
  if (Array.isArray(keywords)) return keywords
  // 去除多余空格，并按逗号分割
  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k)
}

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

  // 根据新的媒体类型选择默认媒体
  let selected = props.card.selected

  if (newMediaType === 'video' && props.card.videos && props.card.videos.length > 0) {
    // 如果当前没有选择视频或者选择的不是视频，则选择第一个视频
    if (props.card.mediaType !== 'video' || !isVideoSelected(props.card.videos[0])) {
      selected = props.card.videos[0]
    }
    activeType.value = 'video'
  } else if (newMediaType === 'image' && props.card.images && props.card.images.length > 0) {
    // 如果当前没有选择图片或者选择的不是图片，则选择第一个图片
    if (props.card.mediaType !== 'image' || !isImageSelected(props.card.images[0])) {
      selected = props.card.images[0]
    }
    activeType.value = 'image'
  }

  emit('update:card', {
    ...props.card,
    mediaType: newMediaType,
    selected,
  })
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
