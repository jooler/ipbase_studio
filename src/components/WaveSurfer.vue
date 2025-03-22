<template>
  <q-card flat class="border" :class="$q.dark.mode ? 'bg-dark text-white' : 'bg-grey-1 text-grey-8'">
    <q-card-section>
      <div ref="containerRef"></div>
    </q-card-section>
    <q-card-section class="border-top">
      <div class="row no-wrap items-center gap-sm">
        <q-btn unelevated round size="lg" color="primary" :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
          @click="waveSurfer?.playPause()" />
        <span class="q-ml-sm">{{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}</span>
        <q-space />
        <slot name="more" />
      </div>
    </q-card-section>
  </q-card>
</template>
<script setup>
  import { ref, useTemplateRef } from 'vue'
  import { useWaveSurfer } from '@meersagor/wavesurfer-vue'
  import { onKeyStroke } from '@vueuse/core'

  const { url } = defineProps({
    url: {
      type: String,
      require: true,
    },
  })
  const containerRef = useTemplateRef('containerRef')
  const options = ref({
    height: 48,
    waveColor: 'gray',
    progressColor: 'red',
    barGap: 5,
    barWidth: 5,
    barRadius: 8,
    duration: 80,
    url: url,
  })

  const { waveSurfer, currentTime, totalDuration, isPlaying } = useWaveSurfer({
    containerRef,
    options: options.value,
  })

  onKeyStroke(' ', (e) => {
    e.preventDefault()
    document.activeElement.blur()
    waveSurfer.value?.playPause()
  });
  onKeyStroke('ArrowLeft', (e) => {
    e.preventDefault()
    waveSurfer.value.skip(-5);
  })
  onKeyStroke('ArrowRight', (e) => {
    e.preventDefault()
    waveSurfer.value.skip(5);
  })

  const formatTime = (seconds) =>
    [seconds / 60, seconds % 60].map((v) => `0${Math.floor(v)}`.slice(-2)).join(':')
</script>
