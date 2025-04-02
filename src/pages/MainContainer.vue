<template>
  <q-page>
    <q-layout view="lHr LpR lFr" container class="absolute-full">
      <q-header class="transparent">
        <q-toolbar class="border-bottom" :class="$q.dark.mode ? 'bg-grey-10 text-grey-1' : 'bg-white text-grey-10'">
          <q-btn dense flat icon="mdi-file-tree" class="q-mr-md" @click="toggleLeftDrawer" />
          <slot name="headerLeft"></slot>
          <q-space />
          <slot name="headerRight"></slot>
          <q-btn dense flat icon="mdi-tune" class="q-ml-md" @click="toggleRightDrawer" />
        </q-toolbar>
      </q-header>

      <q-drawer v-model="leftDrawerOpen" side="left" class="border-right" :width="leftDrawerWidth"
        :class="$q.dark.mode ? 'bg-grey-10 text-grey-1' : 'bg-primary-9 text-grey-1'">
        <slot name="leftDrawerContent"></slot>
        <div ref="leftResizeHandle" class="resize-handle resize-handle-right" @mousedown.prevent></div>
      </q-drawer>

      <q-drawer v-model="rightDrawerOpen" side="right" class="border-left" :width="rightDrawerWidth">
        <slot name="rightDrawerContent"></slot>
        <div ref="rightResizeHandle" class="resize-handle resize-handle-left" @mousedown.prevent></div>
      </q-drawer>

      <q-page-container :class="$q.dark.mode ? 'bg-dark' : 'bg-grey-1'">
        <q-page :style-fn="myTweak">
          <slot name="mainContent"></slot>
        </q-page>
      </q-page-container>
      <q-footer class="transparent">
        <slot name="footer"></slot>
      </q-footer>
    </q-layout>
  </q-page>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue'
  import { useDraggable } from '@vueuse/core'
  // 本地存储键
  const STORAGE_KEY = 'app_drawer_settings'

  const myTweak = (offset, height) => {
    return { minHeight: offset && height ? `calc(${height - offset - 1}px)` : '100%' }
  }

  // 从localStorage获取抽屉设置或使用默认值
  const loadDrawerSettings = () => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY)
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        return {
          leftOpen: settings.leftOpen ?? true,
          rightOpen: settings.rightOpen ?? true,
          leftWidth: settings.leftWidth ?? 220,
          rightWidth: settings.rightWidth ?? 420,
        }
      }
    } catch (error) {
      console.error('Failed to load drawer settings:', error)
    }

    return {
      leftOpen: true,
      rightOpen: true,
      leftWidth: 220,
      rightWidth: 420,
    }
  }

  // 初始化抽屉设置
  const settings = loadDrawerSettings()
  const leftDrawerOpen = ref(settings.leftOpen)
  const rightDrawerOpen = ref(settings.rightOpen)
  const leftDrawerWidth = ref(settings.leftWidth)
  const rightDrawerWidth = ref(settings.rightWidth)
  const leftResizeHandle = ref(null)
  const rightResizeHandle = ref(null)

  // 保存抽屉设置到localStorage
  const saveDrawerSettings = () => {
    try {
      const settings = {
        leftOpen: leftDrawerOpen.value,
        rightOpen: rightDrawerOpen.value,
        leftWidth: leftDrawerWidth.value,
        rightWidth: rightDrawerWidth.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save drawer settings:', error)
    }
  }

  // 监听抽屉状态变化，保存设置
  watch([leftDrawerOpen, rightDrawerOpen, leftDrawerWidth, rightDrawerWidth], saveDrawerSettings)

  // Minimum and maximum drawer widths
  const MIN_DRAWER_WIDTH = 150
  const MAX_DRAWER_WIDTH = 500

  const toggleLeftDrawer = () => {
    leftDrawerOpen.value = !leftDrawerOpen.value
  }
  const toggleRightDrawer = () => {
    rightDrawerOpen.value = !rightDrawerOpen.value
  }

  // Setup draggable for left drawer
  onMounted(() => {
    if (leftResizeHandle.value) {
      const { isDragging: isLeftDragging, x: leftX } = useDraggable(leftResizeHandle)

      watch(leftX, (newX) => {
        if (isLeftDragging.value && leftDrawerOpen.value) {
          // 获取内部布局容器的边界位置
          const layoutElement = leftResizeHandle.value.closest('.q-layout')
          if (layoutElement) {
            const layoutRect = layoutElement.getBoundingClientRect()
            // 计算相对于内部布局容器的位置
            const relativeX = newX - layoutRect.left

            // Constrain width within min and max values
            leftDrawerWidth.value = Math.min(Math.max(relativeX, MIN_DRAWER_WIDTH), MAX_DRAWER_WIDTH)
          }
        }
      })
    }

    if (rightResizeHandle.value) {
      const { isDragging: isRightDragging, x: rightX } = useDraggable(rightResizeHandle)

      watch(rightX, (newX) => {
        if (isRightDragging.value && rightDrawerOpen.value) {
          // 获取内部布局容器的边界位置
          const layoutElement = rightResizeHandle.value.closest('.q-layout')
          if (layoutElement) {
            const layoutRect = layoutElement.getBoundingClientRect()
            // 计算相对于内部布局容器右边缘的宽度
            const relativeWidth = layoutRect.right - newX

            // Constrain width within min and max values
            rightDrawerWidth.value = Math.min(
              Math.max(relativeWidth, MIN_DRAWER_WIDTH),
              MAX_DRAWER_WIDTH,
            )
          }
        }
      })
    }
  })
</script>

<style scoped>
  .resize-handle {
    position: absolute;
    top: 0;
    height: 100%;
    width: 4px;
    cursor: ew-resize;
    background-color: transparent;
    transition: background-color 0.3s;
    z-index: 10;
  }

  .resize-handle:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .resize-handle-right {
    right: 0;
  }

  .resize-handle-left {
    left: 0;
  }
</style>
