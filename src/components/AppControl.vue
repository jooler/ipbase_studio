<template>
  <div class="row items-center gap-xs">
    <q-btn dense size="sm" flat icon="minimize" @click="minimize" />
    <q-btn
      dense
      size="sm"
      flat
      :icon="isMaximized ? 'mdi-window-restore' : 'crop_square'"
      @click="toggleMaximize"
    />
    <q-btn dense size="sm" icon="close" color="red" @click="closeApp" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const isMaximized = ref(false)

// 初始化窗口状态
onMounted(() => {
  // 获取初始窗口状态
  if (window.windowAPI?.isMaximized) {
    isMaximized.value = window.windowAPI.isMaximized()
  }

  // 监听窗口大小变化
  window.addEventListener('resize', checkWindowState)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkWindowState)
})

// 检查窗口状态
function checkWindowState() {
  isMaximized.value = window.windowAPI?.isMaximized()
}

function minimize() {
  window.windowAPI?.minimize()
}

function toggleMaximize() {
  window.windowAPI?.toggleMaximize()
  // 切换后更新状态
  setTimeout(() => {
    checkWindowState()
  }, 100)
}

function closeApp() {
  window.windowAPI?.close()
}
</script>
