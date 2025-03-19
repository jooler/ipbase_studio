<template>
  <MainContainer>
    <template #leftDrawerContent>
      <ProjectManager ref="projectManager" @open-file="handleOpenFile" />
    </template>
    <template #mainContent>
      <q-card flat square class="absolute-full column">
        <q-card-actions align="right" class="border-bottom">
          <q-input
            v-if="currentFile"
            v-model="currentFile.name"
            dense
            outlined
            color="primary"
            class="q-mr-md"
            style="max-width: 200px"
            @update:model-value="updateFileName"
          />
          currentOpenFile: {{ currentOpenFile }}
          <q-space />
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
          :key="currentFile?.id"
          v-model="jsonContent"
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
          @saveContent="saveCurrentFile"
          class="q-space"
        />
      </q-card>
    </template>
    <template #rightDrawerContent>
      <div class="config-container q-pa-md">
        <q-select v-model="selectedLocale" :options="locales" label="语言" filled class="q-mb-md" />

        <!-- 添加预览文本提示 -->
        <div v-if="customPreviewText" class="custom-preview-text q-mb-md q-pa-sm">
          <div class="row items-center">
            <q-icon name="record_voice_over" size="sm" color="green" class="q-mr-xs" />
            <div class="text-caption">当前预览文本: {{ customPreviewText }}</div>
          </div>
        </div>

        <q-scroll-area
          ref="voiceScrollArea"
          v-if="selectedLocale && voiceOptions.length > 0"
          class="q-mt-md"
          style="height: 500px; width: 100%"
        >
          <div class="row">
            <div v-for="i in voiceOptions" :key="i.value" class="col-4 q-pa-xs">
              <q-card
                :id="`voice-card-${i.value}`"
                bordered
                flat
                class="hovered-item"
                :class="{ 'border-orange': selectedVoice?.value === i.value }"
              >
                <div
                  class="cursor-pointer column flex-center q-py-xl"
                  :style="`background-image: url(${postImage(i)});background-size: cover;`"
                  @click="selectedVoice = i"
                >
                  <div class="q-py-xl" />
                  <q-tooltip class="no-padding transparent">
                    <q-card bordered>
                      <q-card-section
                        class="q-pa-sm font-medium"
                        :class="$q.dark.mode ? 'text-white' : 'text-black'"
                      >
                        选择此语音
                      </q-card-section>
                    </q-card>
                  </q-tooltip>
                </div>
                <q-card-section class="row no-wrap items-center q-pa-sm border-top">
                  <span class="q-py-sm">{{ i.DisplayName }}</span>
                </q-card-section>
                <q-card-section class="row no-wrap items-center q-px-sm q-pt-none q-pb-sm">
                  <q-btn
                    dense
                    size="sm"
                    flat
                    color="primary"
                    :icon="getPlayIcon(i.value)"
                    @click.stop="previewVoice(i)"
                    :loading="previewingVoice === i.value"
                  >
                    <q-tooltip>{{
                      getPlayIcon(i.value) === 'mdi-play' ? '预览语音' : '暂停预览'
                    }}</q-tooltip>
                  </q-btn>
                  <q-btn
                    dense
                    flat
                    round
                    size="sm"
                    icon="mdi-star"
                    :color="isFavorite(i.value) ? 'orange' : ''"
                    @click.stop="toggleFavorite(i.value)"
                  >
                    <q-tooltip>{{ isFavorite(i.value) ? '取消收藏' : '收藏此语音' }}</q-tooltip>
                  </q-btn>
                </q-card-section>
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
          <q-btn
            flat
            dense
            round
            icon="mdi-dots-vertical"
            :color="$q.dark.mode ? 'grey-1' : 'grey-8'"
          >
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
import ProjectManager from 'src/components/ProjectManager.vue'
import { useProjectManager } from '../composeables/project/useProjectManager'
// import { Notify } from 'quasar'

const { currentOpenFile } = useProjectManager()
// Ref for scroll area and project manager
const voiceScrollArea = ref(null)
const projectManager = ref(null)

// Current open file
const currentFile = ref(null)

// Use the TTS composable
const {
  ssmlContent,
  jsonContent,
  isConverting,
  audioUrl,
  selectedLocale,
  selectedVoice,
  voiceOptions,
  volume,
  locales,
  selectedRateValue,
  selectedPitchValue,
  // 预览相关功能
  previewingVoice,
  previewVoice,
  getPlayIcon,
  customPreviewText,
  // 收藏相关功能
  isFavorite,
  toggleFavorite,
  // 方法
  initVoices,
  convertToSpeech,
  saveConfig,
  restoreConfig,
} = useTts()

// Add updateFileName method to handle file name changes
const updateFileName = async (newName) => {
  if (!currentFile.value || !projectManager.value) return

  try {
    // Call the updateNodeName method in ProjectManager component
    const success = await projectManager.value.updateNodeName(currentFile.value.id, newName)

    if (success) {
      console.log('File name updated:', newName)
      // Update currentOpenFile reference
      if (currentOpenFile.value && currentOpenFile.value.id === currentFile.value.id) {
        currentOpenFile.value.name = newName
      }
    } else {
      console.error('Failed to update file name')
    }
  } catch (error) {
    console.error('Error updating file name:', error)
  }
}

const postImage = (i) => {
  if (selectedLocale.value?.value === 'zh-cn') {
    return `public/images/${i.ShortName}.webp`
  } else {
    return `public/images/${i.Gender}.png`
  }
}

// Handle file open event from ProjectManager
const handleOpenFile = (fileInfo) => {
  currentFile.value = {
    id: fileInfo.id,
    name: fileInfo.name,
  }

  try {
    // Parse the saved content as JSON
    // If it's not valid JSON (old format or new file), use empty object
    const editorContent = fileInfo.content ? JSON.parse(fileInfo.content) : {}

    // Set the editor content using jsonContent from useTts
    jsonContent.value = editorContent
  } catch (error) {
    console.error('Error parsing file content as JSON:', error)
    // Fallback: if content is not JSON, try to use it as is
    jsonContent.value = null
    ssmlContent.value = fileInfo.content || ''
  }
}

// Save current file content
const saveCurrentFile = async (val) => {
  if (!currentFile.value || !projectManager.value) {
    console.log('No file is currently open')
    return
  }

  try {
    // Save the editor's JSON content as a string
    const fileContent = JSON.stringify(val)
    const success = await projectManager.value.saveCurrentFile(fileContent)

    if (success) {
      console.log('Saved file: ', currentFile.value.name)
    } else {
      console.log('Failed to save file')
    }
  } catch (error) {
    console.error('Error saving file:', error)
  }
}

// 滚动到选中的语音卡片
const scrollToSelectedVoice = async () => {
  if (!selectedVoice.value?.value) return

  // 等待组件渲染完成
  await nextTick()

  // 找到要滚动到的元素
  const cardId = `voice-card-${selectedVoice.value.value}`
  const card = document.getElementById(cardId)

  if (card && voiceScrollArea.value) {
    // 使用简单方法：直接使用元素的offsetTop计算滚动位置
    // 获取当前选中的卡片在容器内的相对位置
    const content = voiceScrollArea.value.$el.querySelector('.q-scroll-area__container')
    // 计算当前卡片相对于滚动容器的偏移
    let offsetTop = 0
    let element = card
    while (element && element !== content) {
      offsetTop += element.offsetTop
      element = element.offsetParent
    }

    // 这个值可能需要调整，确保卡片不会刚好在边缘
    const scrollPadding = 20

    // 设置滚动位置
    voiceScrollArea.value.setScrollPosition('vertical', offsetTop - scrollPadding, 300)
  }
}

// 监听配置变化并保存
watch([selectedLocale, selectedVoice, selectedRateValue, selectedPitchValue, volume], () => {
  saveConfig()
})

// Add watch to debug customPreviewText changes
watch(customPreviewText, (newVal) => {
  console.log('IndexPage detected customPreviewText change:', newVal)
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

  // 如果存在选中的语音，滚动到对应位置
  if (selectedVoice.value?.value) {
    // 稍微延迟一下，确保组件已经完全渲染
    setTimeout(() => {
      scrollToSelectedVoice()
    }, 300)
  }
})
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

.custom-preview-text {
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.border-orange {
  border: 2px solid #ff9800 !important;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
