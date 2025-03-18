<template>
  <MainContainer>
    <template #leftDrawerContent>
      <div>selectedLocale: {{ selectedLocale }}</div>
    </template>
    <template #mainContent>
      <q-card flat square class="absolute-full column">
        <q-card-actions align="right" class="border-bottom">
          <q-btn
            color="primary"
            unelevated
            padding="xs md"
            label="转换为语音"
            @click="convertToSpeech"
            :loading="isConverting"
            :disable="!ssmlContent"
          />
        </q-card-actions>
        <tiptap-ssml
          v-model="ssmlContent"
          :selected-voice-initial="selectedVoice"
          :selected-locale-initial="selectedLocale"
          :rate-initial="selectedRateValue"
          :pitch-initial="selectedPitchValue"
          :volume-initial="volume"
          @update:selected-voice="selectedVoice = $event"
          @update:selected-locale="selectedLocale = $event"
          @update:rate="selectedRateValue = $event"
          @update:pitch="selectedPitchValue = $event"
          @update:volume="volume = $event"
          @ssml-change="onSsmlChange"
          class="q-space"
        />
      </q-card>
    </template>
    <template #rightDrawerContent>
      <div class="config-container q-pa-md">
        <h5>语音参数配置</h5>
        <q-select v-model="selectedLocale" :options="locales" label="语言" filled class="q-mb-md" />
        <q-scroll-area v-if="selectedLocale" style="height: 500px; width: 100%">
          <div class="row">
            <div v-for="i in voiceOptions" :key="i.value" class="col-4 q-pa-xs">
              <q-card
                bordered
                flat
                class="cursor-pointer"
                :class="{ 'bg-primary': selectedVoice?.value === i.value }"
                @click="selectedVoice = i"
              >
                <div class="column flex-center q-py-md">
                  <q-avatar>
                    {{ i.Gender === 'Female' ? '女' : '男' }}
                  </q-avatar>
                  <span class="q-py-sm">{{ i.DisplayName }}</span>
                </div>
              </q-card>
            </div>
          </div>
        </q-scroll-area>

        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">语速 ({{ selectedRateValue }}%)</div>
          <div class="row items-center">
            <q-icon name="speed" size="sm" class="q-mr-md" />
            <q-slider
              v-model.number="selectedRateValue"
              :min="50"
              :max="200"
              :step="5"
              label
              label-always
              color="primary"
              class="col"
              @update:model-value="updateRate"
            />
          </div>
        </div>

        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">音调 ({{ selectedPitchValue }}%)</div>
          <div class="row items-center">
            <q-icon name="tune" size="sm" class="q-mr-md" />
            <q-slider
              v-model.number="selectedPitchValue"
              :min="50"
              :max="150"
              :step="5"
              label
              label-always
              color="primary"
              class="col"
              @update:model-value="updatePitch"
            />
          </div>
        </div>

        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">音量 ({{ volume }}%)</div>
          <div class="row items-center">
            <q-icon name="volume_up" size="sm" class="q-mr-md" />
            <q-slider
              v-model.number="volume"
              :min="0"
              :max="100"
              :step="5"
              label
              label-always
              color="primary"
              class="col"
            />
          </div>
        </div>
      </div>
    </template>
    <template v-if="audioUrl" #footer>
      <WaveSurfer :url="audioUrl">
        <template #more>
          <q-btn flat dense round icon="mdi-dots-vertical">
            <q-menu class="radius-sm">
              <q-list bordered dense class="radius-sm q-pa-xs">
                <q-item
                  clickable
                  v-close-popup
                  :href="audioUrl"
                  target="_blank"
                  download="speech.mp3"
                  class="radius-xs"
                >
                  <q-item-section>下载音频</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </template>
      </WaveSurfer>
    </template>
  </MainContainer>
</template>

<script setup>
import MainContainer from './MainContainer.vue'
import { onMounted, watch, nextTick } from 'vue'
import WaveSurfer from 'src/components/WaveSurfer.vue'
import TiptapSsml from 'src/components/TiptapSsml.vue'
import { useTts } from '../composeables/azure/useTts'

// Use the TTS composable
const {
  ssmlContent,
  isConverting,
  audioUrl,
  selectedLocale,
  selectedVoice,
  voiceOptions,
  volume,
  locales,
  selectedRateValue,
  selectedPitchValue,
  initVoices,
  convertToSpeech,
  saveConfig,
  restoreConfig,
} = useTts()

// 监听配置变化并保存
watch([selectedLocale, selectedVoice, selectedRateValue, selectedPitchValue, volume], () => {
  saveConfig()
})

// Initialize values based on selected options
onMounted(async () => {
  await nextTick()
  await initVoices()
  await restoreConfig()

  // 如果没有恢复的配置，则设置默认值
  if (!selectedRateValue.value) {
    selectedRateValue.value = 100
  }
  if (!selectedPitchValue.value) {
    selectedPitchValue.value = 100
  }
})

// Handle SSML content updates from TiptapSsml
const onSsmlChange = (value) => {
  ssmlContent.value = value
}
</script>

<style scoped>
.text-input-container,
.config-container {
  height: 100%;
  overflow-y: auto;
}

.audio-output {
  margin-top: 20px;
}
</style>
