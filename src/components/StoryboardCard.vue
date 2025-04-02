<template>
  <q-card square flat class="storyboard-card full-height cursor-pointer" @click="selectCard">
    <!-- 媒体预览部分 -->
    <div class="media-preview-container">
      <!-- 视频预览（使用ArtPlayer） -->
      <div
        v-if="card.mediaType === 'video' && card.selected && card.selected.video_files"
        class="media-preview"
      >
        <img :src="card.selected.image" class="media-preview" :alt="card.id" />
      </div>

      <!-- 图片预览 -->
      <img
        v-else-if="card.mediaType === 'image' && card.selected"
        :src="getImageUrl(card.selected)"
        class="media-preview"
        :alt="card.id"
      />

      <!-- 加载中状态 -->
      <div v-else-if="card.isLoading" class="media-loading">
        <q-spinner color="primary" size="2em" />
        <div class="q-mt-sm">正在获取素材...</div>
      </div>

      <!-- 空状态 -->
      <div v-else class="media-empty">
        <q-icon name="movie" size="2em" />
        <div class="q-mt-sm text-caption">暂无素材</div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
// 这里不需要导入defineProps和defineEmits，因为它们是编译时宏
const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:card', 'search-pexels', 'select-card'])

// 选择当前卡片
const selectCard = () => {
  emit('select-card', props.card)
}

// 获取图片URL
const getImageUrl = (image) => {
  if (!image || !image.src) {
    return ''
  }

  // 优先使用large尺寸
  return image.src.large || image.src.medium || image.src.original
}
</script>

<style scoped>
.storyboard-card {
  width: 210px;
  max-width: 100%;
  transition: all 0.3s;
}

.storyboard-card:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.media-preview-container {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.media-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-loading,
.media-empty {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

.media-type-toggle {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  padding: 2px;
  z-index: 10;
}

.media-thumbnails {
  height: 70px;
}

.media-thumbnail {
  width: 80px;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
  margin-right: 4px;
}

.media-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-selected {
  border: 2px solid #42b883;
}
</style>
