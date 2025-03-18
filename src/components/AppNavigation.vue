<template>
  <div class="column no-wrap items-center q-pt-md full-height">
    <q-btn v-for="i in apps" :key="i.value" flat padding="sm" :to="i.path">
      <q-icon :name="i.icon" size="md" />
      <q-tooltip>{{ i.name }}</q-tooltip>
    </q-btn>
    <div class="q-space full-width" :class="$q.platform.is.electron ? 'q-electron-drag' : ''"></div>
  </div>
</template>

<script setup>
import { useConfig } from '../composeables/useConfig'

const { config } = useConfig()
const { apps } = config
</script>
