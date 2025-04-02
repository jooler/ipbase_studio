<template>
  <q-layout view="lHr LpR lFr">
    <q-header class="transparent">
      <q-bar
        class="q-py-xs q-px-sm"
        :class="$q.dark.mode ? 'bg-dark border-bottom text-white' : 'bg-primary-dark text-grey-1'"
        style="height: 2.3rem"
      >
        <MainIcon
          :class="$q.platform.is.electron ? 'q-electron-drag' : ''"
          style="width: 1.5rem; height: 1.5rem"
        />
        <span
          class="font-small q-ml-sm unselected"
          :class="$q.platform.is.electron ? 'q-electron-drag' : ''"
          >{{ appStore.app?.name }}</span
        >{{!!covertedBlob}}
        <div
          class="q-space full-height"
          :class="$q.platform.is.electron ? 'q-electron-drag' : ''"
        ></div>
        <q-btn dense flat icon="mdi-theme-light-dark" @click="$q.dark.toggle()" />
        <q-btn dense flat icon="mdi-tune" @click="showSettings = !showSettings" />
        <AppControl v-if="$q.platform.is.electron" />
      </q-bar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      side="left"
      :width="64"
      class="q-pa-sm border-right"
      :class="$q.dark.mode ? 'bg-dark text-grey-1' : 'bg-primary-dark text-grey-1'"
    >
      <AppNavigation />
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" bordered>
      <!-- drawer content -->
    </q-drawer>

    <q-page-container v-if="inited" :class="$q.dark.mode ? 'bg-dark' : 'bg-primary-9'">
      <router-view />
      <q-dialog v-model="showSettings" persistent>
        <AppSettings />
      </q-dialog>
    </q-page-container>

    <q-footer
      v-if="studioStore.studioAttrs && covertedBlob"
      :style="{ height: `${footerHeight}px` }"
      :class="$q.dark.mode ? 'bg-grey-10' : 'bg-grey-1'"
    >
      <div
        ref="footerResizeHandle"
        class="footer-resize-handle bg-dark shadow-edge"
        :class="$q.dark.mode ? 'bg-dark' : 'bg-grey-3'"
        @mousedown="handleResizeStart"
      ></div>
      <TimeLine />
    </q-footer>
  </q-layout>
</template>

<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue'
import AppNavigation from '../components/AppNavigation.vue'
import AppControl from '../components/AppControl.vue'
import { appStore, studioStore } from 'src/stores/stores'
import MainIcon from '../components/MainIcon.vue'
import AppSettings from 'src/components/AppSettings.vue'
import TimeLine from 'components/TimeLine.vue'
import { useTts } from '../composeables/azure/useTts'

// 从localStorage获取footer高度设置或使用默认值
const loadFooterSettings = () => {
  try {
    const savedHeight = localStorage.getItem('app_footer_height')
    if (savedHeight) {
      return parseInt(savedHeight, 10)
    }
  } catch (error) {
    console.error('Failed to load footer height:', error)
  }
  return 350 // 默认高度
}

const { covertedBlob } = useTts()
const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(false)
const footerHeight = ref(loadFooterSettings())
const footerResizeHandle = ref(null)
const isResizing = ref(false)
const startY = ref(0)
const startHeight = ref(0)

const showSettings = ref(false)
const inited = ref(false)

// 保存footer高度到localStorage
const saveFooterHeight = () => {
  try {
    localStorage.setItem('app_footer_height', footerHeight.value.toString())
  } catch (error) {
    console.error('Failed to save footer height:', error)
  }
}

// 监听footer高度变化，保存设置
watch(footerHeight, saveFooterHeight)

// Footer高度的最小和最大值
const MIN_FOOTER_HEIGHT = 80
const MAX_FOOTER_HEIGHT = 600

// 鼠标按下事件处理
const handleResizeStart = (event) => {
  isResizing.value = true
  startY.value = event.clientY
  startHeight.value = footerHeight.value

  // 添加事件监听器
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)

  // 阻止默认行为和冒泡
  event.preventDefault()
  event.stopPropagation()
}

// 鼠标移动事件处理
const handleResizeMove = (event) => {
  if (!isResizing.value) return

  // 计算垂直方向的移动距离（注意方向：向上拖动使footer变大）
  const deltaY = startY.value - event.clientY

  // 更新footer高度，并限制在最小和最大值之间
  footerHeight.value = Math.min(
    Math.max(startHeight.value + deltaY, MIN_FOOTER_HEIGHT),
    MAX_FOOTER_HEIGHT,
  )

  // 阻止默认行为
  event.preventDefault()
}

// 鼠标释放事件处理
const handleResizeEnd = () => {
  isResizing.value = false

  // 移除事件监听器
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

// 在组件卸载时清理事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
})

onMounted(async () => {
  await appStore.restoreSettings()
  inited.value = true
})
</script>

<style>
.shadow-edge {
  box-shadow: 0 1px 1px 0px #00000063;
}
.q-electron-drag {
  cursor: move;
  /* 鼠标悬停时显示移动样式 */
}

.footer-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px; /* 稍微增加高度，便于操作 */
  cursor: ns-resize;
  background-color: transparent;
  transition: background-color 0.3s;
  z-index: 10;
}

.footer-resize-handle:hover {
  background-color: rgba(0, 0, 0, 0.15);
}

/* 拖拽时的样式 */
.footer-resize-handle:active {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
