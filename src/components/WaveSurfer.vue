<template>
    <q-card flat square :class="$q.dark.mode ? 'bg-dark' : 'bg-grey-1'">
      <q-card-section>
        <div ref="containerRef"></div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row no-wrap items-center">
            <q-btn unelevated round color="primary" :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" @click="waveSurfer?.playPause()" />
            <span class="q-ml-sm">{{formatTime(currentTime)}} / {{formatTime(totalDuration)}}</span>
            <q-space />
            <slot name="more" />
        </div>
      </q-card-section>
    </q-card>
  </template>
<script setup>
import { ref, useTemplateRef } from 'vue'
import {useWaveSurfer} from '@meersagor/wavesurfer-vue'
const { url } = defineProps({
  url: {
    type: String,
    require: true
  }
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

const {waveSurfer, currentTime, totalDuration, isPlaying} = useWaveSurfer({containerRef, options: options.value})

const formatTime = (seconds) => [seconds / 60, seconds % 60].map((v) => `0${Math.floor(v)}`.slice(-2)).join(':')

</script>
