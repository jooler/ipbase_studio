<template>
  <div ref="artPlayerRef"></div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
  import Artplayer from 'artplayer'

  const props = defineProps({
    // 视频源
    src: {
      type: String,
      required: true,
    },
    // 封面图
    poster: {
      type: String,
      default: '',
    },
    // 标题
    title: {
      type: String,
      default: '',
    },
    // 视频类型
    type: {
      type: String,
      default: 'auto',
    },
    // 是否自动播放
    autoplay: {
      type: Boolean,
      default: false,
    },
    // 是否循环播放
    loop: {
      type: Boolean,
      default: false,
    },
    // 是否静音
    muted: {
      type: Boolean,
      default: false,
    },
    // 视频尺寸
    aspectRatio: {
      type: Boolean,
      default: true,
    },
    // 多分辨率选项
    quality: {
      type: Array,
      default: () => [],
    },
    // 默认分辨率索引
    defaultQuality: {
      type: Number,
      default: 0,
    },
    // 播放器配置
    options: {
      type: Object,
      default: () => ({}),
    },
  })

  const emit = defineEmits(['ready', 'play', 'pause', 'ended', 'qualityChange'])

  const artPlayerRef = ref(null)
  let artPlayer = null

  // 初始化播放器
  const initArtPlayer = () => {
    if (!artPlayerRef.value) return

    // 默认配置
    const defaultOptions = {
      container: artPlayerRef.value,
      url: props.src,
      poster: props.poster,
      title: props.title,
      type: props.type,
      autoplay: props.autoplay,
      loop: props.loop,
      muted: props.muted,
      aspectRatio: props.aspectRatio,
      volume: 0.7,
      autoSize: true,
      autoMini: true,
      setting: true,
      playbackRate: true,
      fullscreen: true,
      fullscreenWeb: true,
      pip: true,
      mutex: true,
      // 增加视频播放结束检测
      customType: {
        ...props.options.customType,
        // 添加自定义事件监听器
        listener: (video) => {
          // 监听原生video元素的ended事件
          video.addEventListener('ended', () => {
            console.log('原生video事件: ended')
            // 手动触发emit
            emit('ended')
          })
        },
      },
    }

    // 如果有多分辨率选项，添加到配置中
    if (props.quality && props.quality.length > 0) {
      defaultOptions.quality = props.quality
      defaultOptions.defaultQuality = props.defaultQuality
    }

    // 创建播放器实例
    artPlayer = new Artplayer({
      ...defaultOptions,
      ...props.options,
    })

    // 绑定事件
    artPlayer.on('ready', () => {
      emit('ready', artPlayer)

      // 获取播放器中的video元素
      const videoElement = artPlayer.video

      // 直接在video元素上添加ended事件监听
      if (videoElement) {
        videoElement.addEventListener('ended', () => {
          console.log('DOM Video ended event triggered')
          emit('ended')
        })
      }
    })

    artPlayer.on('play', () => {
      emit('play')
    })

    artPlayer.on('pause', () => {
      emit('pause')
    })

    artPlayer.on('ended', () => {
      console.log('ArtPlayer ended event')
      emit('ended')
    })

    // 添加视频时间更新监听，用于检测播放结束
    artPlayer.on('video:timeupdate', () => {
      const video = artPlayer.video
      // 如果视频当前时间接近总时长，认为已接近结束
      if (video && Math.abs(video.currentTime - video.duration) < 0.5) {
        console.log('Video approaching end:', video.currentTime, video.duration)
        // 接近结束时可以提前准备下一个视频
      }
    })

    // 分辨率切换事件
    if (props.quality && props.quality.length > 0) {
      artPlayer.on('quality', (quality) => {
        emit('qualityChange', quality)
      })
    }
  }

  // 监听视频源变化
  watch(
    () => props.src,
    (newValue) => {
      if (artPlayer && newValue) {
        artPlayer.switchUrl(newValue)
      }
    },
  )

  // 监听配置变化
  watch(
    () => props,
    () => {
      if (artPlayer) {
        artPlayer.destroy()
        artPlayer = null
        initArtPlayer()
      }
    },
    { deep: true },
  )

  // 组件挂载时初始化播放器
  onMounted(() => {
    initArtPlayer()
  })

  // 组件卸载前销毁播放器
  onBeforeUnmount(() => {
    if (artPlayer) {
      artPlayer.destroy()
      artPlayer = null
    }
  })

  // 暴露播放器实例和方法给父组件
  defineExpose({
    artPlayer,
    getInstance: () => artPlayer,
  })
</script>
