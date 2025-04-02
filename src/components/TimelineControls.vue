<template>
  <div class="column gap-xs">
    <q-btn
      color="primary"
      icon="restart_alt"
      label="重新生成分镜"
      :loading="isGenerating"
      @click="regenerateStoryboard"
    />
    <q-btn
      color="secondary"
      icon="refresh"
      label="刷新媒体素材"
      :loading="isLoadingVideos || isLoadingImages"
      @click="refreshMedia"
    />
    <q-btn-toggle
      v-model="mediaType"
      toggle-color="primary"
      :options="[
        { label: '视频素材', value: 'video', icon: 'movie' },
        { label: '图片素材', value: 'image', icon: 'image' },
      ]"
      @update:model-value="handleMediaTypeChange"
    />
    <q-btn color="positive" icon="download" label="导出分镜" @click="exportStoryboard" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { saveAs } from 'file-saver'

const props = defineProps({
  storyboardCards: {
    type: Array,
    required: true,
  },
  isGenerating: {
    type: Boolean,
    default: false,
  },
  isLoadingVideos: {
    type: Boolean,
    default: false,
  },
  isLoadingImages: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['regenerate', 'refresh-videos', 'refresh-images'])
const $q = useQuasar()
const mediaType = ref('video') // 默认为视频模式

// 重新生成分镜
const regenerateStoryboard = () => {
  emit('regenerate')
}

// 刷新媒体素材
const refreshMedia = () => {
  if (mediaType.value === 'video') {
    emit('refresh-videos')
  } else {
    emit('refresh-images')
  }
}

// 处理媒体类型变更
const handleMediaTypeChange = (newType) => {
  mediaType.value = newType

  // 如果切换到图片模式且尚未加载图片，自动加载图片
  if (
    newType === 'image' &&
    !props.storyboardCards.some((card) => card.images && card.images.length > 0)
  ) {
    emit('refresh-images')
  }
  // 如果切换到视频模式且尚未加载视频，自动加载视频
  else if (
    newType === 'video' &&
    !props.storyboardCards.some((card) => card.videos && card.videos.length > 0)
  ) {
    emit('refresh-videos')
  }
}

// 导出分镜数据
const exportStoryboard = () => {
  try {
    // 准备导出数据
    const exportData = props.storyboardCards.map((card) => {
      const { id, text, duration, keywords } = card

      // 获取选中的媒体信息
      let selectedMedia = null
      let mediaType = 'none'

      if (card.selected) {
        if (card.mediaType === 'video') {
          mediaType = 'video'
          selectedMedia = {
            id: card.selected.id,
            width: card.selected.width,
            height: card.selected.height,
            url: card.selected.video_files?.[0]?.link || card.selected.url,
            preview: card.selected.image,
            duration: card.selected.duration,
          }
        } else if (card.mediaType === 'image') {
          mediaType = 'image'
          selectedMedia = {
            id: card.selected.id,
            width: card.selected.width,
            height: card.selected.height,
            url:
              card.selected.src?.large || card.selected.src?.medium || card.selected.src?.original,
            photographer: card.selected.photographer,
            photographerUrl: card.selected.photographer_url,
          }
        }
      }

      return {
        id,
        text,
        duration,
        keywords,
        mediaType,
        media: selectedMedia,
      }
    })

    // 创建Blob并下载
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const filename = `storyboard_${new Date().toISOString().slice(0, 10)}.json`
    saveAs(blob, filename)

    $q.notify({
      type: 'positive',
      message: `分镜已导出为${filename}`,
      timeout: 2000,
    })
  } catch (err) {
    console.error('导出分镜失败:', err)
    $q.notify({
      type: 'negative',
      message: '导出分镜失败: ' + (err.message || '未知错误'),
      timeout: 3000,
    })
  }
}
</script>
