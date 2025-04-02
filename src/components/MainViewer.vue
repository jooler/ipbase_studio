<template>
  <div class="video-container">
    <canvas ref="canvasRef" class="webgl-canvas"></canvas>
    <div v-if="showControls" class="controls">
      <button @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
      <input type="range" v-model="currentTime" :max="totalDuration" step="0.1" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { GLSL } from './shaders' // WebGL着色器

const props = defineProps({
  allVideos: {
    type: Array,
    required: true,
    validator: (value) => value.every((v) => v.startsWith('http')),
  },
  showControls: {
    type: Boolean,
    default: true,
  },
})

const canvasRef = ref(null)
const glContext = ref(null)
const texture = ref(null)
const currentVideo = ref(0)
const isPlaying = ref(false)
const videoElements = ref([])
const animationFrame = ref(null)

// 初始化WebGL上下文
function initWebGL() {
  const canvas = canvasRef.value
  canvas.width = 1280
  canvas.height = 720

  glContext.value =
    canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    }) || canvas.getContext('experimental-webgl')

  if (!glContext.value) {
    console.error('WebGL初始化失败')
    return
  }

  // WebGL初始化配置
  glContext.value.clearColor(0, 0, 0, 0)
  glContext.value.enable(glContext.value.BLEND)
  glContext.value.blendFunc(glContext.value.SRC_ALPHA, glContext.value.ONE_MINUS_SRC_ALPHA)

  // 创建着色器程序（示例代码）
  const vertexShader = glContext.value.createShader(glContext.value.VERTEX_SHADER)
  glContext.value.shaderSource(vertexShader, GLSL.vertex)
  glContext.value.compileShader(vertexShader)

  // ...其他WebGL初始化代码
}

// 加载所有视频
async function loadVideos() {
  videoElements.value = props.allVideos.map((src) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = src
    video.preload = 'metadata'
    video.loop = false
    video.addEventListener('ended', playNextVideo)
    return video
  })

  // 预加载视频元数据
  await Promise.all(
    videoElements.value.map(
      (video) =>
        new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve)
        }),
    ),
  )
}

// 播放控制
function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    videoElements.value[currentVideo.value].play()
    startRendering()
  } else {
    videoElements.value[currentVideo.value].pause()
    cancelAnimationFrame(animationFrame.value)
  }
}

// 连续播放逻辑
function playNextVideo() {
  if (currentVideo.value < props.allVideos.length - 1) {
    currentVideo.value++
    videoElements.value[currentVideo.value].play()
  } else {
    isPlaying.value = false
  }
}

// 渲染循环
function startRendering() {
  const render = () => {
    if (!isPlaying.value) return

    const video = videoElements.value[currentVideo.value]
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      // WebGL绘制逻辑
      glContext.value.bindTexture(glContext.value.TEXTURE_2D, texture.value)
      glContext.value.texImage2D(
        glContext.value.TEXTURE_2D,
        0,
        glContext.value.RGBA,
        glContext.value.RGBA,
        glContext.value.UNSIGNED_BYTE,
        video,
      )

      // 执行绘制命令
      glContext.value.drawArrays(glContext.value.TRIANGLE_STRIP, 0, 4)
    }

    animationFrame.value = requestAnimationFrame(render)
  }
  animationFrame.value = requestAnimationFrame(render)
}

// 计算总时长
const totalDuration = computed(() => videoElements.value.reduce((sum, v) => sum + v.duration, 0))

// 当前播放时间
const currentTime = computed({
  get: () => {
    const current = videoElements.value
      .slice(0, currentVideo.value)
      .reduce((sum, v) => sum + v.duration, 0)
    return current + videoElements.value[currentVideo.value].currentTime
  },
  set: (value) => {
    // 时间跳转逻辑
    let accumulated = 0
    for (let i = 0; i < videoElements.value.length; i++) {
      if (value <= accumulated + videoElements.value[i].duration) {
        currentVideo.value = i
        videoElements.value[i].currentTime = value - accumulated
        break
      }
      accumulated += videoElements.value[i].duration
    }
  },
})

onMounted(async () => {
  initWebGL()
  await loadVideos()
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame.value)
  videoElements.value.forEach((v) => v.removeEventListener('ended', playNextVideo))
})
</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.webgl-canvas {
  width: 100%;
  height: 100%;
  background: transparent;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 8px;
}
</style>
