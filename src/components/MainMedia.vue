<template>
  <div class="relative-position absolute-full column no-wrap">
    <ArtPlayer
      v-if="allVideos.length > 0"
      :src="currentVideo"
      :autoplay="false"
      :options="playerOptions"
      ref="artPlayerRef"
      @ready="onPlayerReady"
      @play="onPlay"
      @pause="onPause"
      @ended="onVideoEnded"
      @waiting="onWaiting"
      @src-change="onVideoSrcChange"
      class="q-space flex flex-center bg-black hidden-controls"
    />

    <!-- 自定义控制栏 -->
    <div class="custom-controls full-width">
      <!-- 时间轴容器 -->
      <div
        class="timebar-container"
        @click="onTimebarClick"
        @mousemove="onTimebarHover"
        ref="timebarRef"
      >
        <!-- 总时间轴 -->
        <div class="timebar full-width row items-center gap-xs">
          <!-- 视频分段标记 -->
          <div
            v-for="(segment, index) in videoSegments"
            :key="index"
            class="video-segment"
            :class="{ 'active-segment': currentVideoIndex === index }"
            :style="{
              left: `${segment.startPercent}%`,
              width: `${segment.widthPercent}%`,
              backgroundColor: index % 2 === 0 ? 'rgba(99, 99, 99, 0.7)' : 'rgba(80, 80, 80, 0.7)',
            }"
            @click.stop="onSegmentClick($event, index)"
          >
            <!-- 分段进度条 -->
            <div
              class="segment-progress"
              :style="{
                width: getSegmentProgress(index),
                maxWidth: '100%',
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 音频控制界面 -->
    <div class="audio-controls q-px-md q-py-sm bg-dark">
      <div class="row no-wrap items-center gap-sm">
        <!-- 播放/暂停按钮 -->
        <q-btn
          unelevated
          round
          size="md"
          color="primary"
          :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
          @click="togglePlay"
        />

        <!-- 时间显示 -->
        <span class="text-white">
          {{ formatTime(currentTotalTime) }} / {{ formatTime(totalDuration) }}
        </span>

        <!-- 波形显示容器 -->
        <div ref="waveformRef" class="col waveform-container"></div>

        <!-- 音量控制 -->
        <q-btn
          flat
          round
          size="sm"
          :icon="isMuted ? 'volume_off' : 'volume_up'"
          color="white"
          @click="toggleMute"
        />
        <q-slider
          v-model="volume"
          :min="0"
          :max="100"
          class="q-mx-sm"
          style="width: 100px"
          color="primary"
          @change="onVolumeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, onUnmounted } from 'vue'
import { studioStore } from 'src/stores/stores'
import ArtPlayer from './ArtPlayer.vue'
import localforage from 'localforage'
import WaveSurfer from 'wavesurfer.js'
import { uid } from 'quasar'
import { useMedia } from 'src/composeables/useMedia'
const storyboardCards = computed(() => {
  return studioStore.storyboardCards
})

const videoCache = ref(new Map())
const videoDurationsLoaded = ref(false)

// 从视频文件列表中获取最小分辨率的视频
const getMinResolutionVideo = (videoFiles) => {
  if (!videoFiles || videoFiles.length === 0) return null
  // return videoFiles[0]x c

  return videoFiles.reduce((min, current) => {
    const currentWidth = parseInt(current.width) || Infinity
    const minWidth = parseInt(min.width) || Infinity
    return currentWidth < minWidth ? current : min
  })
}

// 修改视频列表获取逻辑
const allVideos = computed(() => {
  if (!storyboardCards.value || storyboardCards.value.length === 0) return []

  // 提取所有卡片中最小分辨率的视频链接
  const videoData = storyboardCards.value
    .filter(
      (card) => card.selected && card.selected.video_files && card.selected.video_files.length > 0,
    )
    .map((card) => {
      const minVideo = getMinResolutionVideo(card.selected.video_files)
      return {
        id: `video_${uid()}`,
        url: minVideo ? minVideo.link : null,
        cardId: card.id,
        originalLink: minVideo ? minVideo.link : null, // 保存原始链接
      }
    })
    .filter((data) => !!data.url)

  console.log('提取的视频数据:', videoData)
  return videoData
})

// 当前播放的视频索引
const currentVideoIndex = ref(0)

// 添加当前 Blob URL 的引用
const currentBlobUrl = ref(null)

// 修改视频播放源获取逻辑
const currentVideo = computed(() => {
  if (allVideos.value.length === 0) return ''
  const currentVideoData = allVideos.value[currentVideoIndex.value]
  if (!currentVideoData) return ''

  return currentVideoData.url
})

const artPlayerRef = ref(null)
let artPlayerInstance = null

// 播放器配置
const playerOptions = computed(() => ({
  // controls: [], // 使用空数组而不是布尔值
  // setting: false,
  // pip: false,
  // fullscreen: false,
  // fullscreenWeb: false,
  // autoSize: false,
  // autoMini: false,
  // playbackRate: false,
}))

// 视频时长信息
const videoDurations = ref([])
const totalDuration = computed(() =>
  videoDurations.value.reduce((sum, duration) => sum + duration, 0),
)
const isPlaying = ref(false)
const currentTotalTime = ref(0)
// 添加当前视频时间的响应式引用
const currentVideoTime = ref(0)

// 添加音频相关的响应式引用
const audioElement = ref(null)
const audioBlob = ref(null)
const audioUrl = ref(null)

// 获取视频时长
const { getVideoDuration } = useMedia()
// 缓存视频并获取时长
const cacheVideo = async (url) => {
  try {
    const duration = await getVideoDuration(url)
    return {
      success: true,
      duration,
    }
  } catch (error) {
    console.error('缓存视频失败:', error)
    return {
      success: false,
      url: url,
      duration: 30,
    }
  }
}

// 重写加载视频时长的函数
const loadAllVideoDurations = async () => {
  if (videoDurationsLoaded.value) return
  console.log('开始加载所有视频时长, 视频数量:', allVideos.value.length)

  try {
    // 初始化时长数组
    videoDurations.value = new Array(allVideos.value.length).fill(0)

    // 并行处理所有视频的缓存和时长获取
    const durationPromises = allVideos.value.map(async (videoData, index) => {
      if (!videoData.originalLink) return

      // 缓存视频并获取时长
      const result = await cacheVideo(videoData.originalLink)
      videoDurations.value[index] = result.duration
    })

    await Promise.all(durationPromises)
    videoDurationsLoaded.value = true
    console.log('所有视频时长加载完成:', videoDurations.value)
  } catch (error) {
    console.error('加载视频时长时发生错误:', error)
  }
}

// 监听视频源变化，重新加载时长
watch(
  allVideos,
  async (newVideos, oldVideos) => {
    // 只在视频列表实际发生变化时重新加载
    if (JSON.stringify(newVideos) !== JSON.stringify(oldVideos)) {
      console.log('视频列表已更新，重新加载所有视频时长')
      await loadAllVideoDurations()
    }
  },
  { deep: true },
)

// 监听 storyboardCards 变化
watch(
  storyboardCards,
  async (newCards) => {
    console.log('storyboardCards 发生变化')

    // 强制关闭音频同步标记，防止视频切换时操作音频
    shouldSyncAudio = false

    // 重置相关数据
    currentVideoIndex.value = 0
    videoDurationsLoaded.value = false
    currentTotalTime.value = 0
    currentVideoTime.value = 0

    // 清理不再使用的视频缓存
    const newVideoUrls = new Set(
      newCards
        .filter(
          (card) =>
            card.selected && card.selected.video_files && card.selected.video_files.length > 0,
        )
        .map((card) => {
          const minVideo = getMinResolutionVideo(card.selected.video_files)
          return minVideo ? minVideo.link : null
        })
        .filter((url) => url !== null),
    )

    // 从内存缓存中清理不再使用的视频
    for (const [url] of videoCache.value) {
      if (!newVideoUrls.has(url)) {
        console.log('清理不再使用的视频缓存:', url)
        videoCache.value.delete(url)
      }
    }

    // 从 IndexedDB 中清理不再使用的视频
    try {
      const keys = await localforage.keys()
      for (const key of keys) {
        if (key.startsWith('video_') && !newVideoUrls.has(key)) {
          console.log('从 IndexedDB 中清理不再使用的视频:', key)
          await localforage.removeItem(key)
        }
      }
    } catch (error) {
      console.error('清理 IndexedDB 缓存失败:', error)
    }

    // 重新加载视频时长
    await loadAllVideoDurations()

    // 如果播放器实例存在，更新当前视频
    if (artPlayerInstance) {
      const currentVideoUrl = currentVideo.value
      if (currentVideoUrl) {
        // 再次确保关闭同步标记
        shouldSyncAudio = false

        artPlayerInstance.url = currentVideoUrl
        // 重置播放位置
        artPlayerInstance.currentTime = 0
        // 如果之前在播放，则继续播放
        if (isPlaying.value) {
          artPlayerInstance.play().catch((err) => console.warn('无法自动播放视频:', err))
        }
      }
    }
  },
  { deep: true },
)

// 视频分段信息
const videoSegments = computed(() => {
  const segments = []
  let startPercent = 0
  const totalDurationValue = totalDuration.value || 1 // 避免除以零
  const totalSegments = videoDurations.value.length

  // 计算所有分段的总时长占比
  videoDurations.value.forEach((duration, index) => {
    // 基础宽度百分比
    const widthPercent = (duration / totalDurationValue) * 100

    segments.push({
      startPercent,
      widthPercent,
      duration,
      hasGap: index < totalSegments - 1, // 除了最后一个分段，其他都有间隔
    })

    // 更新下一个分段的起始位置
    startPercent += widthPercent
  })

  return segments
})

// 当前播放进度百分比 - 用于内部计算
const progressPercent = computed(() => {
  if (totalDuration.value === 0) return 0
  return (currentTotalTime.value / totalDuration.value) * 100
})

// 计算当前视频分段中的播放进度百分比
const currentSegmentProgressPercent = computed(() => {
  // 如果没有播放器实例或视频元素，直接使用progressPercent计算
  if (!artPlayerInstance?.video) {
    // 查找当前视频在总进度中的位置
    const previousDurationsSum = videoDurations.value
      .slice(0, currentVideoIndex.value)
      .reduce((sum, duration) => sum + duration, 0)

    // 计算当前视频进度
    const currentTime = (progressPercent.value * totalDuration.value) / 100 - previousDurationsSum
    const currentDuration = videoDurations.value[currentVideoIndex.value] || 0

    return currentDuration > 0 ? (currentTime / currentDuration) * 100 : 0
  }

  // 获取当前视频的总时长
  const currentVideoDuration = videoDurations.value[currentVideoIndex.value] || 0
  if (currentVideoDuration <= 0) return 0

  // 使用响应式引用currentVideoTime而不是直接从播放器获取
  return (currentVideoTime.value / currentVideoDuration) * 100
})

// 获取视频时长
const updateVideoDuration = async () => {
  if (!artPlayerInstance?.video) {
    console.warn('更新视频时长失败: 播放器实例或视频元素不存在')
    // 设置默认时长
    if (currentVideoIndex.value >= 0 && currentVideoIndex.value < videoDurations.value.length) {
      videoDurations.value[currentVideoIndex.value] = 30
    }
    return
  }

  console.log('正在加载当前播放视频的时长...')
  // 等待视频元数据加载
  if (artPlayerInstance.video.readyState === 0) {
    await new Promise((resolve) => {
      const handleMetadata = () => {
        console.log('当前视频元数据已加载, 时长:', artPlayerInstance.video.duration)
        resolve()
      }

      // 如果已经加载完成，直接处理
      if (artPlayerInstance.video.readyState > 0) {
        handleMetadata()
      } else {
        // 否则添加事件监听器
        artPlayerInstance.video.addEventListener('loadedmetadata', handleMetadata, { once: true })
      }

      // 监听错误
      artPlayerInstance.video.addEventListener(
        'error',
        (e) => {
          console.error('当前视频加载出错:', e)
          resolve()
        },
        { once: true },
      )

      // 设置超时处理
      setTimeout(() => {
        console.warn('当前视频加载元数据超时')
        resolve()
      }, 5000)
    })
  }

  // 更新当前视频时长，确保非0值
  const duration = artPlayerInstance.video.duration
  videoDurations.value[currentVideoIndex.value] = duration > 0 ? duration : 30
  console.log(
    `当前视频 ${currentVideoIndex.value} 最终时长:`,
    videoDurations.value[currentVideoIndex.value],
  )
}

// 计算当前总播放时间
const updateCurrentTotalTime = () => {
  if (!artPlayerInstance?.video) return

  const currentTime = artPlayerInstance.video.currentTime

  // 更新当前视频时间的响应式引用
  currentVideoTime.value = currentTime

  const previousDurations = videoDurations.value
    .slice(0, currentVideoIndex.value)
    .reduce((sum, duration) => sum + duration, 0)

  currentTotalTime.value = previousDurations + currentTime
}

// 根据总时间定位到具体视频和时间点
const seekToTotalTime = (totalTime) => {
  let accumulatedTime = 0
  let targetVideo = 0
  let targetTime = totalTime

  // 找到目标视频
  for (let i = 0; i < videoDurations.value.length; i++) {
    if (accumulatedTime + videoDurations.value[i] > totalTime) {
      targetVideo = i
      targetTime = totalTime - accumulatedTime
      break
    }
    accumulatedTime += videoDurations.value[i]
  }

  // 更新实际播放时间
  actualPlaybackTime.value = totalTime

  // 如果需要切换视频
  if (targetVideo !== currentVideoIndex.value) {
    currentVideoIndex.value = targetVideo
    // 等待视频加载后设置时间
    setTimeout(() => {
      if (artPlayerInstance?.video) {
        artPlayerInstance.video.currentTime = targetTime
      }
    }, 100)
  } else {
    // 直接设置时间
    if (artPlayerInstance?.video) {
      artPlayerInstance.video.currentTime = targetTime
    }
  }
}

// 时间轴点击事件
const timebarRef = ref(null)
const onTimebarClick = (event) => {
  if (!timebarRef.value) return

  // 设置音频同步标记，表示这是用户操作
  shouldSyncAudio = true

  const rect = timebarRef.value.getBoundingClientRect()
  const clickPosition = event.clientX - rect.left
  const clickPercent = clickPosition / rect.width
  const targetTime = totalDuration.value * clickPercent

  seekToTotalTime(targetTime)
}

// 添加一个实际播放时间变量
const actualPlaybackTime = ref(0)
let lastWaveformUpdateTime = 0

// 获取特定分段的进度
const getSegmentProgress = (segmentIndex) => {
  // 计算实际播放时间，作为音频和波形同步的基准
  if (artPlayerInstance?.video) {
    const currentTime = artPlayerInstance.video.currentTime
    const previousDurations = videoDurations.value
      .slice(0, currentVideoIndex.value)
      .reduce((sum, duration) => sum + (isFinite(duration) ? duration : 0), 0)

    // 更新实际播放时间，这个时间是所有视频段的累计时间
    actualPlaybackTime.value = previousDurations + currentTime
  }

  // 已播放完的分段，进度为100%
  if (segmentIndex < currentVideoIndex.value) {
    return '100%'
  }

  // 当前播放的分段，显示实际进度
  if (segmentIndex === currentVideoIndex.value) {
    return `${Math.min(currentSegmentProgressPercent.value, 100)}%`
  }

  // 未播放的分段，进度为0
  return '0%'
}

// 修改播放器事件处理，移除频繁音频同步
const onPlayerReady = async (player) => {
  console.log('播放器准备就绪')
  artPlayerInstance = player

  // 获取当前视频时长
  await updateVideoDuration()

  // 监听视频时间更新，但不频繁更新音频位置
  player.on('video:timeupdate', () => {
    // 更新当前总时间
    updateCurrentTotalTime()

    // 更新实际播放时间
    if (artPlayerInstance?.video) {
      const currentTime = artPlayerInstance.video.currentTime
      const previousDurations = videoDurations.value
        .slice(0, currentVideoIndex.value)
        .reduce((sum, duration) => sum + (isFinite(duration) ? duration : 0), 0)

      actualPlaybackTime.value = previousDurations + currentTime
    }

    // 只更新波形位置，不更新音频时间
    // 限制波形更新频率为每500ms一次，减少界面闪烁
    const now = Date.now()
    if (isPlaying.value && waveSurfer.value && now - lastWaveformUpdateTime > 500) {
      lastWaveformUpdateTime = now

      const videoProgressRatio = actualPlaybackTime.value / totalDuration.value

      // 只更新波形进度，不调整音频位置
      if (isFinite(videoProgressRatio) && videoProgressRatio >= 0 && videoProgressRatio <= 1) {
        try {
          waveSurfer.value.seekTo(videoProgressRatio)
        } catch (e) {
          console.warn('波形更新失败:', e)
        }
      }
    }
  })
}

// 监听视频播放状态
watch(isPlaying, (newValue) => {
  if (audioElement.value) {
    if (newValue) {
      // 如果音频已经在播放，先暂停
      if (!audioElement.value.paused) {
        audioElement.value.pause()
      }

      // 确保音频位置与视频同步
      const videoProgressRatio = actualPlaybackTime.value / totalDuration.value
      if (waveSurfer.value) {
        const audioDuration = waveSurfer.value.getDuration()
        audioElement.value.currentTime = audioDuration * videoProgressRatio
      }

      // 视频正在播放,同步播放音频
      audioElement.value.play().catch((error) => {
        console.warn('音频播放失败:', error)
      })
    } else {
      // 视频暂停,同步暂停音频
      audioElement.value.pause()
    }
  }
})

// 修改播放控制，只在首次播放或用户操作后才同步音频
const onPlay = () => {
  console.log('视频开始播放')

  // 先将状态设为播放
  isPlaying.value = true

  // 只有当是用户操作触发的播放时才同步音频位置
  // 通过检查是否有存储的用户操作标记来判断
  if (audioElement.value && waveSurfer.value && shouldSyncAudio) {
    // 先暂停所有音频播放
    audioElement.value.pause()

    // 同步位置
    const videoProgressRatio = actualPlaybackTime.value / totalDuration.value
    const audioDuration = waveSurfer.value.getDuration() || 0

    if (audioDuration > 0) {
      audioElement.value.currentTime = audioDuration * videoProgressRatio
    }

    // 开始播放音频
    audioElement.value.play().catch((error) => {
      console.warn('音频播放失败:', error)
    })

    // 重置标记
    shouldSyncAudio = false
  }
}

const onPause = () => {
  console.log('视频暂停')
  isPlaying.value = false

  // 确保音频暂停
  if (audioElement.value) {
    audioElement.value.pause()
  }
}

const onWaiting = () => {
  audioElement.value?.pause()
}

// 修改视频播放结束事件处理
const onVideoEnded = async () => {
  console.log('视频播放结束事件触发, 当前索引:', currentVideoIndex.value)

  // 视频自然结束需要处理跳转，但不应立即触发音频同步
  // 暂时记录这个状态，但不立即设置shouldSyncAudio标记
  const isNaturalEnd = true

  // 释放当前的 Blob URL
  if (currentBlobUrl.value) {
    URL.revokeObjectURL(currentBlobUrl.value)
    currentBlobUrl.value = null
  }

  // 切换到下一个视频
  if (currentVideoIndex.value < allVideos.value.length - 1) {
    // 计算当前累计播放时间（用于保持音频同步）
    const previousTotalDuration = videoDurations.value
      .slice(0, currentVideoIndex.value + 1)
      .reduce((sum, duration) => sum + (isFinite(duration) ? duration : 0), 0)

    // 更新索引
    currentVideoIndex.value++
    console.log('切换到下一个视频, 新索引:', currentVideoIndex.value)

    // 更新实际播放时间
    actualPlaybackTime.value = previousTotalDuration

    // 确保触发onVideoSrcChange前关闭音频同步标记
    shouldSyncAudio = false
    artPlayerInstance.switch = currentVideo.value

    // 手动更新音频位置，但不触发播放
    if (audioElement.value && waveSurfer.value) {
      const audioDuration = waveSurfer.value.getDuration() || 0
      const audioPositon = waveSurfer.value.getCurrentTime()
      if (audioDuration > 0) {
        // 先暂停音频
        audioElement.value.pause()

        // 更新位置
        audioElement.value.currentTime = audioPositon

        // 更新波形位置
        const videoProgressRatio = previousTotalDuration / totalDuration.value
        if (isFinite(videoProgressRatio) && videoProgressRatio >= 0 && videoProgressRatio <= 1) {
          try {
            waveSurfer.value.seekTo(audioPositon / audioDuration)
          } catch (e) {
            console.warn('波形更新失败:', e)
          }
        }
      }
    }

    // 等待视频加载完成后再播放
    if (artPlayerInstance) {
      try {
        // 等待视频加载
        await new Promise((resolve) => {
          const handleLoaded = () => {
            artPlayerInstance.video.removeEventListener('loadedmetadata', handleLoaded)
            resolve()
          }
          artPlayerInstance.video.addEventListener('loadedmetadata', handleLoaded)
        })

        // 视频结束自动切换时，应该允许音频同步
        // 这里特别允许同步一次
        if (isNaturalEnd) {
          shouldSyncAudio = true
        }

        // 开始播放视频，onPlay会处理音频播放
        await artPlayerInstance.play()
      } catch (err) {
        console.warn('无法自动播放下一个视频:', err)
      }
    }
  } else {
    // 所有视频都播放完毕
    console.log('所有视频播放完毕')
    currentVideoIndex.value = 0
    isPlaying.value = false
    actualPlaybackTime.value = 0

    // 确保音频和波形也重置到开始位置
    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.currentTime = 0
    }

    if (waveSurfer.value) {
      try {
        waveSurfer.value.seekTo(0)
      } catch (e) {
        console.warn('波形重置失败:', e)
      }
    }
  }
}

// 时间轴悬停事件
const onTimebarHover = () => {
  // 暂时不实现悬停功能
}

// 初始化音频播放器
const initAudioPlayer = async () => {
  try {
    // 从 IndexedDB 读取音频数据
    const blob = await localforage.getItem('studioAudioBlob')
    if (!blob) {
      console.warn('未找到音频数据')
      return
    }

    audioBlob.value = blob
    // 创建音频 URL
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    audioUrl.value = URL.createObjectURL(blob)

    // 创建音频元素
    if (!audioElement.value) {
      audioElement.value = new Audio()
    }
    audioElement.value.src = audioUrl.value
    audioElement.value.preload = 'auto'

    console.log('音频播放器初始化完成')
  } catch (error) {
    console.error('初始化音频播放器失败:', error)
  }
}

// 组件卸载时清理资源
const cleanupAudio = () => {
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.src = ''
    audioElement.value = null
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = null
  }
  audioBlob.value = null
}

// 音频控制相关
const waveformRef = ref(null)
const waveSurfer = ref(null)
const volume = ref(100)
const isMuted = ref(false)

// 格式化时间显示
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

// 初始化波形显示
const initWaveform = async () => {
  if (!waveformRef.value || !audioBlob.value) return

  try {
    // 销毁现有实例
    if (waveSurfer.value) {
      waveSurfer.value.destroy()
    }

    // 创建新的 WaveSurfer 实例
    waveSurfer.value = WaveSurfer.create({
      container: waveformRef.value,
      height: 40,
      waveColor: '#4a4a4a',
      progressColor: '#1976d2',
      cursorColor: '#fff',
      barWidth: 2,
      barGap: 1,
      barRadius: 3,
      responsive: true,
      normalize: true,
      interact: false, // 禁用点击交互，避免冲突
    })

    // 加载音频
    const audioUrl = URL.createObjectURL(audioBlob.value)
    await waveSurfer.value.load(audioUrl)
    URL.revokeObjectURL(audioUrl)

    // 同步音量
    waveSurfer.value.setVolume(volume.value / 100)

    // 监听波形就绪事件
    waveSurfer.value.on('ready', () => {
      console.log('波形加载完成')

      // 禁用默认音频播放 - 检查方法是否存在
      try {
        if (typeof waveSurfer.value.setDisabledEventEmissions === 'function') {
          waveSurfer.value.setDisabledEventEmissions(['play', 'pause', 'click', 'seek'])
        }
      } catch (e) {
        console.warn('波形控件不支持禁用事件:', e)
      }

      // 设置初始进度
      if (currentTotalTime.value > 0) {
        const videoProgressRatio = currentTotalTime.value / totalDuration.value
        if (videoProgressRatio >= 0 && videoProgressRatio <= 1) {
          waveSurfer.value.seekTo(videoProgressRatio)
        }
      }
    })

    console.log('波形显示初始化完成')
  } catch (error) {
    console.error('初始化波形显示失败:', error)
  }
}

// 修改播放控制，确保音频与视频同步
const togglePlay = async () => {
  if (!artPlayerInstance) return

  try {
    if (isPlaying.value) {
      await artPlayerInstance.pause()
    } else {
      // 在播放前确保视频已经加载
      if (artPlayerInstance.video.readyState === 0) {
        await new Promise((resolve) => {
          const handleLoaded = () => {
            artPlayerInstance.video.removeEventListener('loadedmetadata', handleLoaded)
            resolve()
          }
          artPlayerInstance.video.addEventListener('loadedmetadata', handleLoaded)
        })
      }
      await artPlayerInstance.play()
    }
  } catch (error) {
    console.warn('播放/暂停切换失败:', error)
  }
}

// 音量控制
const toggleMute = () => {
  isMuted.value = !isMuted.value
  if (audioElement.value) {
    audioElement.value.muted = isMuted.value
  }
  if (waveSurfer.value) {
    waveSurfer.value.setMuted(isMuted.value)
  }
}

const onVolumeChange = (value) => {
  const volumeValue = value / 100
  if (audioElement.value) {
    audioElement.value.volume = volumeValue
  }
  if (waveSurfer.value) {
    waveSurfer.value.setVolume(volumeValue)
  }
}

// 监听音频 blob 变化
watch(audioBlob, async () => {
  if (audioBlob.value) {
    await initWaveform()
  }
})

// 组件卸载时清理波形显示
onUnmounted(() => {
  if (waveSurfer.value) {
    waveSurfer.value.destroy()
  }
})

// 组件挂载后
onMounted(async () => {
  console.log('MainMedia组件挂载')
  await loadAllVideoDurations() // 组件挂载后加载所有视频时长
  await initAudioPlayer() // 初始化音频播放器
})

// 修改清理函数
const cleanup = async () => {
  // 清理当前的 Blob URL
  if (currentBlobUrl.value) {
    URL.revokeObjectURL(currentBlobUrl.value)
    currentBlobUrl.value = null
  }

  // 清空缓存 Map
  videoCache.value.clear()

  // 重置状态
  currentVideoIndex.value = 0
  videoDurationsLoaded.value = false
  currentTotalTime.value = 0
  currentVideoTime.value = 0
  isPlaying.value = false
}

// 组件卸载时
onUnmounted(() => {
  // 确保清理所有资源
  cleanup()
  cleanupAudio()
})

// 添加一个标记，用于指示是否应该同步音频
let shouldSyncAudio = false

// 修改分段点击事件处理，设置音频同步标记
const onSegmentClick = (event, segmentIndex) => {
  console.log(`点击了分段 ${segmentIndex}`)

  // 设置音频同步标记，表示这是用户操作
  shouldSyncAudio = true

  // 计算点击位置相对百分比 - 对所有情况都计算
  const segmentRect = event.currentTarget.getBoundingClientRect()
  const clickPosition = event.clientX - segmentRect.left
  const positionPercent = clickPosition / segmentRect.width
  console.log(`点击位置: ${Math.round(positionPercent * 100)}%`)

  // 计算目标时间点
  const targetTime = videoDurations.value[segmentIndex] * positionPercent

  // 计算在总时长中的位置
  const previousDurations = videoDurations.value
    .slice(0, segmentIndex)
    .reduce((sum, duration) => sum + (isFinite(duration) ? duration : 0), 0)
  const totalTargetTime = previousDurations + targetTime

  // 更新实际播放时间
  actualPlaybackTime.value = totalTargetTime

  // 计算视频总进度比例
  const videoProgressRatio = totalTargetTime / totalDuration.value

  console.log('位置同步:', {
    视频总时长: totalDuration.value,
    目标时间: totalTargetTime,
    进度比例: videoProgressRatio,
  })

  // 这是用户交互，同步更新音频位置
  if (audioElement.value && waveSurfer.value) {
    const audioDuration = waveSurfer.value.getDuration()

    // 检查是否超出音频总长度
    if (videoProgressRatio >= 1) {
      // 跳到音频末尾并停止播放
      audioElement.value.currentTime = audioDuration
      audioElement.value.pause()
      isPlaying.value = false
      // 更新波形位置到结束
      waveSurfer.value.seekTo(0.999)
    } else {
      // 正常跳转
      // 根据视频进度比例计算对应的音频时间
      const audioTargetTime = audioDuration * videoProgressRatio
      audioElement.value.currentTime = audioTargetTime

      // 更新波形位置，一次性更新
      waveSurfer.value.seekTo(videoProgressRatio)
    }
  }

  // 如果点击不同的分段，切换到该视频
  if (segmentIndex !== currentVideoIndex.value) {
    // 记录要跳转的时间点
    const jumpToTime = targetTime
    console.log(`切换到视频 ${segmentIndex}，并跳转到 ${jumpToTime.toFixed(2)}秒`)

    // 切换视频
    currentVideoIndex.value = segmentIndex

    // 预设当前视频时间，避免视觉跳跃
    currentVideoTime.value = jumpToTime

    // 等待视频加载后跳转到计算的位置
    setTimeout(() => {
      if (artPlayerInstance?.video) {
        // 设置计算的播放位置而不是从头开始
        artPlayerInstance.video.currentTime = jumpToTime
        artPlayerInstance.play().catch((err) => console.warn('无法自动播放视频:', err))
      }
    }, 100)
    return
  }

  // 如果点击当前播放的分段，根据点击位置调整播放进度
  if (artPlayerInstance?.video) {
    artPlayerInstance.video.currentTime = targetTime
    currentVideoTime.value = targetTime // 同步更新响应式引用

    console.log(
      `调整播放进度到: ${targetTime.toFixed(2)}秒 (${Math.round(positionPercent * 100)}%)`,
    )
  }
}

// ArtPlayer的src属性发生变化时的处理
const onVideoSrcChange = () => {
  // 视频源变化时不触发音频同步
  console.log('视频源已更改，不影响音频播放')

  // 强制关闭音频同步标记，确保不会因src变化触发音频操作
  shouldSyncAudio = false
}
</script>

<style scoped>
.custom-controls {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  z-index: 1;
}

.timebar-container {
  position: relative;
  height: 20px;
  cursor: pointer;
  width: 100%;
}

.timebar {
  position: relative;
  height: 20px;
  background-color: rgba(69, 69, 69, 0.2);
  display: flex;
  flex-direction: row;
  align-items: center;
}

.video-segment {
  position: absolute;
  height: 100%;
  top: 0;
  transition: background-color 0.3s;
  overflow: hidden;
  box-sizing: border-box;
  border: none;
}

.video-segment:not(:last-child) {
  margin-right: 2px;
}

.active-segment {
  z-index: 1;
  /* 活动分段使用稍微亮一点的颜色 */
  background-color: rgba(120, 120, 120, 0.7) !important;
}

.segment-progress {
  position: absolute;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--q-primary);
  transition: width 0.1s linear;
  /* 确保进度条不会影响分段宽度 */
  pointer-events: none;
}

.progress-bar {
  position: absolute;
  height: 100%;
  background-color: var(--q-primary);
  top: 0;
  left: 0;
  pointer-events: none;
}

.time-markers {
  position: absolute;
  width: 100%;
  top: 20px;
}

.time-marker {
  position: absolute;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(104, 104, 104, 0.7);
}

.audio-controls {
  position: relative;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.waveform-container {
  height: 40px;
  margin: 0 16px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.gap-sm {
  gap: 8px;
}
</style>
