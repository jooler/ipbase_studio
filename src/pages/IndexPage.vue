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
        <q-select v-model="selectedLocale" :options="locales" label="语言" filled class="q-mb-md" />
        <q-scroll-area v-if="selectedLocale" class="q-mt-md" style="height: 500px; width: 100%">
          <div class="row">
            <div v-for="i in voiceOptions" :key="i.value" class="col-4 q-pa-xs">
              <q-card
                bordered
                flat
                class="cursor-pointer hovered-item"
                :class="{ 'bg-primary': selectedVoice?.value === i.value }"
                @click="selectedVoice = i"
              >
                <div class="column flex-center q-py-md">
                  <q-avatar>
                    {{ i.Gender === 'Female' ? '女' : '男' }}
                  </q-avatar>
                  <span class="q-py-sm">{{ i.DisplayName }}</span>
                </div>
                <div
                  class="absolute-full flex flex-center hover-show transition"
                  :style="`background-color: rgba(${!$q.dark.mode ? '0, 0, 0' : '255, 255, 255'}, 0.2)`"
                >
                  <q-btn
                    round
                    color="primary"
                    :icon="playingVoice === i.value ? 'mdi-stop' : 'mdi-play'"
                    @click.stop="previewVoice(i)"
                    :loading="previewingVoice === i.value"
                  >
                    <q-tooltip>{{ playingVoice === i.value ? '停止预览' : '预览语音' }}</q-tooltip>
                  </q-btn>
                </div>
              </q-card>
            </div>
          </div>
        </q-scroll-area>

        <div class="q-mb-md q-px-sm q-mt-xl">
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

        <div class="q-mb-md q-px-sm">
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

        <div class="q-mb-md q-px-sm">
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
import { onMounted, watch, nextTick, ref } from 'vue'
import WaveSurfer from 'src/components/WaveSurfer.vue'
import TiptapSsml from 'src/components/TiptapSsml.vue'
import { useTts } from '../composeables/azure/useTts'

// Use the TTS composable
const {
  apiUrl,
  apiKey,
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

// 添加预览状态变量
const previewingVoice = ref(null)
const playingVoice = ref(null)
const previewAudio = ref(null)

// 预览语音功能
const previewVoice = async (voice) => {
  // 如果当前正在播放这个语音，则停止播放
  if (playingVoice.value === voice.value && previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value = null
    playingVoice.value = null
    return
  }

  // 如果正在播放其他语音，先停止
  if (previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value = null
  }

  previewingVoice.value = voice.value

  // 生成预览文本的SSML，根据当前选择的语言添加适当的预览文本
  let previewText = '这是一段语音预览示例。'

  // 根据不同语言选择不同的预览文本
  if (selectedLocale.value?.value?.startsWith('en')) {
    previewText = 'This is a voice preview sample.'
  } else if (selectedLocale.value?.value?.startsWith('ja')) {
    previewText = 'これは音声プレビューのサンプルです。'
  } else if (selectedLocale.value?.value?.startsWith('ko')) {
    previewText = '이것은 음성 미리보기 샘플입니다.'
  }

  const previewSsml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${selectedLocale.value.value}">
    <voice name="${voice.value}">
      <break strength="medium"/>
      <prosody  volume="${volume.value}%">
        ${previewText}
      </prosody>
      <break strength="medium"/>
    </voice>
  </speak>`

  try {
    // 直接调用API进行转换，而不修改当前选中的语音
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'AzureTTSApp/1.0',
      },
      body: previewSsml,
    })

    if (!response.ok) {
      console.error('预览语音失败:', await response.text())
      return
    }

    const audioBlob = await response.blob()
    const url = URL.createObjectURL(audioBlob)

    // 创建音频元素并播放
    const audio = new Audio(url)
    previewAudio.value = audio
    playingVoice.value = voice.value

    audio.play()

    // 播放完成后释放URL
    audio.onended = () => {
      URL.revokeObjectURL(url)
      playingVoice.value = null
      previewAudio.value = null
    }
  } catch (error) {
    console.error('预览语音出错:', error)
  } finally {
    previewingVoice.value = null
  }
}

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
