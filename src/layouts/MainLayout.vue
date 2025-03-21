<template>
  <q-layout view="lHr LpR lFr">
    <q-header class="transparent">
      <q-bar class="q-py-xs q-px-sm"
        :class="$q.dark.mode ? 'bg-dark border-bottom text-white' : 'bg-primary-dark text-grey-1'"
        style="height: 2.3rem">
        <span class="font-medium">{{ appStore.app?.name }}</span>
        <div class="q-space full-height" :class="$q.platform.is.electron ? 'q-electron-drag' : ''"></div>
        <q-btn dense flat icon="mdi-theme-light-dark" @click="$q.dark.toggle()" />
        <AppControl v-if="$q.platform.is.electron" />
      </q-bar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" :width="64" class="q-pa-sm border-right"
      :class="$q.dark.mode ? 'bg-dark text-grey-1' : 'bg-primary-dark text-grey-1'">
      <AppNavigation />
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" bordered>
      <!-- drawer content -->
    </q-drawer>

    <q-page-container :class="$q.dark.mode ? 'bg-dark' : 'bg-primary-9'">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
  import { ref } from 'vue'
  import AppNavigation from '../components/AppNavigation.vue'
  import AppControl from '../components/AppControl.vue'
  import { appStore } from 'src/stores/stores'

  const leftDrawerOpen = ref(true)
  const rightDrawerOpen = ref(false)

</script>

<style>
  .q-electron-drag {
    cursor: move;
    /* 鼠标悬停时显示移动样式 */
  }
</style>
