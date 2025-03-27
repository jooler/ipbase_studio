<template>
  <q-layout view="lHr LpR lFr">
    <q-header class="transparent">
      <q-bar class="q-py-xs q-px-sm"
        :class="$q.dark.mode ? 'bg-dark border-bottom text-white' : 'bg-primary-dark text-grey-1'"
        style="height: 2.3rem">
        <MainIcon :class="$q.platform.is.electron ? 'q-electron-drag' : ''" style="width: 1.5rem; height: 1.5rem" />
        <span class="font-small q-ml-sm unselected" :class="$q.platform.is.electron ? 'q-electron-drag' : ''">{{
          appStore.app?.name }}</span>
        <div class="q-space full-height" :class="$q.platform.is.electron ? 'q-electron-drag' : ''"></div>
        <q-btn dense flat icon="mdi-theme-light-dark" @click="$q.dark.toggle()" />
        <q-btn dense flat icon="mdi-tune" @click="showSettings = !showSettings" />
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

    <q-page-container v-if="inited" :class="$q.dark.mode ? 'bg-dark' : 'bg-primary-9'">
      <router-view />
      <q-dialog v-model="showSettings" persistent>
        <AppSettings />
      </q-dialog>
    </q-page-container>
    <q-footer v-if="studioAttrs && false">
      <TimeLine />
    </q-footer>
  </q-layout>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import AppNavigation from '../components/AppNavigation.vue'
  import AppControl from '../components/AppControl.vue'
  import { appStore } from 'src/stores/stores'
  import MainIcon from '../components/MainIcon.vue'
  import AppSettings from 'src/components/AppSettings.vue'
  import TimeLine from 'components/TimeLine.vue'
  import { useTts } from '../composeables/azure/useTts'

  const { studioAttrs } = useTts();
  const leftDrawerOpen = ref(true)
  const rightDrawerOpen = ref(false)

  const showSettings = ref(false)
  const inited = ref(false)
  onMounted(async () => {
    await appStore.restoreSettings()
    inited.value = true
  })
</script>

<style>
  .q-electron-drag {
    cursor: move;
    /* 鼠标悬停时显示移动样式 */
  }
</style>
