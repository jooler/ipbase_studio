<template>
  <div ref="waveContainer"></div>
</template>

<script setup>
import { ref } from 'vue'
import { useSiriWave } from 'src/composeables/useSiriWave.js' // 假设 useSiriWave.js 在同一目录

const waveContainer = ref(null)
useSiriWave(waveContainer, {
  style: 'ios9',
  amplitude: 0.5,
  frequency: 1,
  speed: 0.2,
})
</script>
