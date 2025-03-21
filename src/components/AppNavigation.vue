<template>
  <div class="column no-wrap items-center gap-md q-pt-md full-height">
    <div
      v-if="$q.screen.gt.xs"
      class="row no-wrap items-center unselected q-pb-sm relative-position"
      :class="$q.platform.is.electron ? 'q-electron-drag' : ''"
    >
      <q-img
        src="https://yihu.team/logo.png"
        :ratio="1"
        height="30px"
        width="30px"
        fit="contain"
        spinner-color="primary"
        spinner-size="22px"
        class="loader"
      />
      <span
        class="radius-xs bg-black border absolute-top-right"
        style="font-size: 0.5rem; transform: translateX(7px)"
        >Alpha</span
      >
      <!-- <BrandMenu :offset="[0, -24]" /> -->
    </div>
    <NotifyBlock />
    <template v-for="i in appStore.apps" :key="i.value">
      <q-avatar
        square
        :icon="i.icon"
        class="radius-sm cursor-pointer transition"
        :class="
          appStore.app.value === i.value
            ? `bg-primary-dark border app-active`
            : 'border-placeholder'
        "
        @click="setApp(i)"
      >
        <div
          v-if="appStore.app.value === i.value"
          class="flex absolute-left full-height q-pl-xs q-py-sm"
        >
          <div style="width: 3px; background-color: var(--q-primary)"></div>
        </div>
      </q-avatar>
    </template>
    <div class="q-space full-width" :class="$q.platform.is.electron ? 'q-electron-drag' : ''"></div>
  </div>
</template>

<script setup>
import { onBeforeMount } from 'vue'
import { appStore } from 'src/stores/stores'
import { useRouter } from 'vue-router'
import NotifyBlock from './NotifyBlock.vue'

const router = useRouter()

const setApp = (value) => {
  appStore.setApp(value)
  router.push(value.path)
}
onBeforeMount(() => {
  if (!appStore.app) {
    setApp(appStore.apps[0])
  }
})
</script>
<style lang="scss" scoped>
.app-btn {
  border: 1px solid #33333300;
}
.app-btn:hover {
  border: 1px solid #333;
}
.app-active {
  box-shadow: 5px 11px 30px 0 rgb(1 14 208 / 64%);
}
.app-active:hover {
  box-shadow: 0 0 20px 1px #ffbb763f;
  border: 1px solid rgba(255, 255, 255, 0.454) !important;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

.loader {
  animation: spin 5s linear;
  animation-play-state: paused;
}

.loader.loading {
  animation-play-state: running;
}
</style>
