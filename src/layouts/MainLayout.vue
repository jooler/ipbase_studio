<template>
  <q-layout view="lHr LpR lFr">
    <q-header bordered class="transparent">
      <q-bar
        :class="`${$q.dark.mode ? 'bg-dark text-grey-1' : 'bg-white text-grey-10'} ${
          $q.platform.is.electron ? 'q-pr-sm' : ''
        }`"
      >
        <span>声工坊</span>
        <q-btn dense flat color="primary" icon="check" @click="$q.dark.toggle()" />
        <div
          class="q-space full-height"
          :class="$q.platform.is.electron ? 'q-electron-drag' : ''"
        ></div>
        <AppControl v-if="$q.platform.is.electron" />
      </q-bar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      side="left"
      bordered
      :width="64"
      :class="$q.dark.mode ? 'bg-grey-10 text-grey-1' : 'bg-grey-1 text-grey-10'"
    >
      <AppNavigation />
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" bordered>
      <!-- drawer content -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import AppNavigation from '../components/AppNavigation.vue'
import AppControl from '../components/AppControl.vue'
const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(false)
</script>

<style>
.q-electron-drag {
  cursor: move; /* 鼠标悬停时显示移动样式 */
}
</style>
