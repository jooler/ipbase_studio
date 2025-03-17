<template>
  <div class="column no-wrap items-center q-pt-md">
    <q-btn v-for="i in apps" :key="i.value" flat padding="sm">
      <q-icon :name="i.icon" size="md" />
    </q-btn>
  </div>
</template>

<script setup>
import { useConfig } from '../composeables/useConfig'

const { config } = useConfig()
const { apps } = config
</script>
