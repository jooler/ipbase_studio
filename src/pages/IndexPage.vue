<template>
  <MainContainer>
    <template #headerLeft>
      <template v-if="currentFile && studioStore.runMode === 'tts'">
        <q-chip v-if="selectedVoice?.LocalName" icon="settings_voice" outline color="deep-orange"
          :label="selectedVoice.LocalName" class="q-mr-sm" />
        <span>{{ currentFile.name }}</span>
        <q-btn v-if="isElectronEnv && mode === 'fileSystem'" flat round dense icon="save_as" class="q-ml-sm"
          @click="exportCurrentFile">
          <q-tooltip>导出为新文件</q-tooltip>
        </q-btn>
      </template>
    </template>
    <template v-if="studioStore.runMode === 'tts'" #headerRight>
      <q-btn color="primary" flat dense padding="xs md" class="q-mr-sm" label="生成配音稿" @click="showAgentDialog = true" />
      <q-chip v-if="!canConvert" square flat label="请先设置语言、角色等" class="text-deep-orange" />
      <q-btn v-else class="convert-botton text-white" :class="{ disabled: convertDisabled }" unelevated
        padding="xs md xs sm" icon="graphic_eq" :label="isConverting ? '' : '转换为语音'" @click="convertToSpeech"
        :loading="isConverting" :disable="convertDisabled">
        <template #loading>
          <q-spinner-dots color="white" size="1em" />
        </template>
      </q-btn>
      <q-dialog v-model="showAgentDialog" persistent>
        <AgentInput @accept="handleAgentAccept" />
      </q-dialog>
    </template>
    <template v-else #headerRight>
      <q-btn flat dense padding="xs md" label="离开Studio" @click="backTTS" />
    </template>
    <template #leftDrawerContent>
      <div v-if="studioStore.runMode === 'tts'" class="column fit">
        <q-toolbar class="transparent border-bottom q-pa-xs q-pr-md">
          <q-tabs v-model="mode" dense align="left" :breakpoint="0" @update:model-value="updateMode">
            <q-tab v-for="i in modes" :key="i.name" :name="i.name" :label="i.label" />
          </q-tabs>
          <q-space />
          <q-icon name="help" class="cursor-pointer unhover-op-5">
            <q-tooltip class="no-padding shadow-24">
              <q-card bordered style="width: 300px">
                <q-card-section class="q-pt-sm">
                  <div class="font-large">本地文件</div>
                  <div class="text-subtitle2 op-7 text-deep-orange">
                    你可以打开一个本地文件夹，管理你的音频文本项目
                  </div>
                </q-card-section>
                <q-card-section class="q-pt-none">
                  <div class="font-large">应用内缓存</div>
                  <div class="text-subtitle2 op-7 text-deep-orange">
                    在应用内缓存你的文本项目，若清理了浏览器缓存，则内容会丢失，注意保存重要内容！
                  </div>
                </q-card-section>
              </q-card>
            </q-tooltip>
          </q-icon>
        </q-toolbar>
        <ProjectManager v-if="mode === 'indexedDB'" ref="projectManager" class="q-pa-sm" @open-file="handleOpenFile" />
        <FileManager v-if="mode === 'fileSystem' && !isElectronEnv" />
        <ElectronFileManager v-if="mode === 'fileSystem' && isElectronEnv" />
      </div>
      <q-scroll-area v-else class="fit">
        <StoryBoard :storyboardCards="studioStore.storyboardCards" :activeItem="studioStore.selectedCard"
          @clickItem="selectItem" />
      </q-scroll-area>
    </template>
    <template #mainContent>
      <q-scroll-area v-if="studioStore.runMode === 'tts'" class="absolute-full column">
        <tiptap-ssml :key="currentFile?.id" @saveContent="saveCurrentFile" @isEmptyString="isEmptyString"
          class="q-space" />
      </q-scroll-area>
      <MainMedia v-if="studioStore.runMode === 'storyboard'" :key="selectedCard?.id" />
    </template>
    <template #rightDrawerContent>
      <div v-if="studioStore.runMode === 'tts'" class="config-container q-pa-md">
        <q-select v-model="selectedLocale" :options="locales" dense label="语言" filled
          class="q-mb-md radius-xs overflow-hidden" popup-content-class="radius-xs border z-max q-pa-xs"
          popup-content-style="transform: translateY(4px)" />

        <!-- 添加预览文本提示 -->
        <div v-if="customPreviewText" class="custom-preview-text q-mb-md q-pa-sm">
          <div class="row items-center">
            <q-icon name="record_voice_over" size="sm" color="green" class="q-mr-xs" />
            <div class="text-caption">当前预览文本: {{ customPreviewText }}</div>
          </div>
        </div>

        <q-scroll-area ref="voiceScrollArea" v-if="selectedLocale && voiceOptions.length > 0" class="q-mt-md"
          style="height: 500px; width: 100%">
          <div class="row">
            <div v-for="i in voiceOptions" :key="i.value" class="col-4 q-pa-xs">
              <q-card :id="`voice-card-${i.value}`" bordered flat class="hovered-item"
                :class="{ 'border-deep-orange bg-deep-orange': selectedVoice?.value === i.value }">
                <q-img :src="postImage(i)" :ratio="4 / 5" spinner-color="primary" spinner-size="82px"
                  class="cursor-pointer" @click="setVoice(i)">
                  <q-tooltip class="no-padding transparent">
                    <q-card bordered>
                      <q-card-section class="q-pa-sm font-medium" :class="$q.dark.mode ? 'text-white' : 'text-black'">
                        选择此语音
                      </q-card-section>
                    </q-card>
                  </q-tooltip>
                  <div v-if="i.value === showWave" class="absolute-full">
                    <AudioWave class="fit" style="background-color: #00000088" />
                  </div>
                </q-img>
                <q-card-section class="row no-wrap items-center q-py-xs q-px-sm border-top cursor-pointer"
                  @click="setVoice(i)">
                  <span class="q-py-xs">{{ reLocalName(i.LocalName) || i.DisplayName }}</span>
                </q-card-section>
                <q-card-section class="row no-wrap items-center q-px-xs q-pt-none q-pb-xs">
                  <q-btn dense size="sm" flat :icon="getPlayIcon(i.value)" @click.stop="previewVoice(i)"
                    :loading="previewingVoice === i.value">
                    <q-tooltip>{{
                      getPlayIcon(i.value) === 'mdi-play' ? '预览语音' : '暂停预览'
                    }}</q-tooltip>
                  </q-btn>
                  <q-space />
                  <q-btn dense flat round size="sm" icon="mdi-star" :color="isFavorite(i.value) ? 'yellow' : ''"
                    @click.stop="toggleFavorite(i.value)">
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
            <q-slider v-model.number="selectedRateValue" :min="50" :max="200" :step="5" dense label label-always
              color="primary" class="col" />
          </div>
        </div>

        <div class="q-mb-md q-px-sm">
          <div class="text-subtitle2 q-mb-sm">音调 ({{ selectedPitchValue }}%)</div>
          <div class="row items-center">
            <q-icon name="tune" size="sm" class="q-mr-md" />
            <q-slider v-model.number="selectedPitchValue" :min="50" :max="150" :step="5" label dense label-always
              color="primary" class="col" />
          </div>
        </div>

        <div class="q-mb-md q-px-sm">
          <div class="text-subtitle2 q-mb-sm">音量 ({{ volume }}%)</div>
          <div class="row items-center">
            <q-icon name="volume_up" size="sm" class="q-mr-md" />
            <q-slider v-model.number="volume" :min="0" :max="100" :step="5" label dense label-always color="primary"
              class="col" />
          </div>
        </div>
      </div>
      <ShortDetial v-else-if="studioStore.selectedCard" :short="studioStore.selectedCard" />
    </template>
    <template v-if="studioStore.runMode === 'tts'" #footer>
      <div v-if="currentFile && covertedAudio[currentFile.id]" :key="currentFile.id" class="q-pa-xs"
        :class="$q.dark.mode ? 'bg-black' : 'bg-white'">
        <WaveSurfer :url="covertedAudio[currentFile.id]">
          <template #more>
            <q-btn flat dense rounded padding="xs md" icon="file_download" :href="covertedAudio[currentFile.id]"
              :download="currentFile?.name ? `${currentFile.name}.mp3` : 'speech.mp3'" label="下载音频"
              :color="$q.dark.mode ? 'grey-1' : 'grey-8'" />
            <q-btn flat dense rounded padding="xs md" icon="file_download" label="进入创作"
              :color="$q.dark.mode ? 'grey-1' : 'grey-8'" @click="enterStudio" />
          </template>
        </WaveSurfer>
      </div>
      <q-bar v-if="ssmlContent?.length" dark class="transparent" :class="$q.dark.mode ? 'bg-black' : 'bg-white'">
        <q-space />
        <span class="font-small unselected" :class="ssmlContent.length / 10000 > 0.9
          ? 'text-negative'
          : ssmlContent.length / 10000 > 0.7
            ? 'text-orange'
            : 'op-3'
          ">
          {{ ssmlContent.length }} / {{ limit }}
          <q-tooltip class="no-padding transparent shadow-24">
            <q-card bordered>
              <q-card-section>
                <div class="text-subtitle2">{{ `免费用户每日限额 ${limit} 字符` }}</div>
              </q-card-section>
            </q-card>
          </q-tooltip>
        </span>
      </q-bar>
    </template>
  </MainContainer>
</template>

<script setup>
  import MainContainer from './MainContainer.vue'
  import { onMounted, watch, nextTick, ref, onBeforeMount, computed, markRaw } from 'vue'
  import WaveSurfer from 'src/components/WaveSurfer.vue'
  import TiptapSsml from 'src/components/TiptapSsml.vue'
  import MainMedia from 'src/components/MainMedia.vue'
  import { useTts } from '../composeables/azure/useTts'
  import ProjectManager from 'src/components/ProjectManager.vue'
  import FileManager from 'src/components/FileManager.vue'
  // 使用动态导入来避免在浏览器环境中直接导入报错
  // import { ElectronFileManager } from 'src/components/index'
  import AudioWave from 'src/components/AudioWave.vue'
  import { useQuasar } from 'quasar'
  import { appStore } from 'src/stores/stores'
  import localforage from 'localforage'
  import AgentInput from 'src/components/AgentInput.vue'
  import { useStudio } from 'src/composeables/useStudio'
  import { studioStore } from 'src/stores/stores'
  import StoryBoard from 'src/components/StoryBoard.vue'
  import ShortDetial from 'src/components/ShortDetial.vue'
  import { uid } from 'quasar'

  const { selectedCard } = useStudio()

  const selectItem = (card) => {
    studioStore.setSelectedCard(card)
  }

  const limit = computed(() => (appStore.settings?.azureTtsKey ? '100000' : '10000'))

  const $q = useQuasar()
  const isElectronEnv = computed(() => $q.platform.is.electron)
  const showAgentDialog = ref(false)

  // 动态加载ElectronFileManager组件
  const ElectronFileManager = markRaw({
    name: 'ElectronFileManager',
    render() {
      return null
    },
  })

  // 在Electron环境中尝试加载组件
  if (isElectronEnv.value) {
    try {
      import('src/components/ElectronFileManager.vue')
        .then((module) => {
          Object.assign(ElectronFileManager, module.default)
        })
        .catch((error) => {
          console.warn('Failed to load ElectronFileManager:', error)
        })
    } catch (error) {
      console.warn('Failed to import ElectronFileManager:', error)
    }
  }

  // Ref for scroll area and project manager
  const voiceScrollArea = ref(null)
  const projectManager = ref(null)
  const modes = [
    { name: 'fileSystem', label: '本地文件' },
    { name: 'indexedDB', label: $q.platform.is.electron ? '应用内缓存' : '浏览器缓存' },
  ]

  // Use the TTS composable
  const {
    mode,
    canConvert,
    ssmlContent,
    jsonContent,
    textContent,
    currentFile,
    isConverting,
    covertedAudio,
    covertedBlob,
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
    showWave,
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
    reLocalName,
    setVoice,
  } = useTts()

  const convertDisabled = computed(() => {
    // 如果内容来自AI生成，内容一定不为空
    if (
      jsonContent.value &&
      jsonContent.value.content &&
      jsonContent.value.content.length > 0 &&
      jsonContent.value.content.some(
        (para) =>
          para.content &&
          para.content.length > 0 &&
          para.content.some((node) => node.text && node.text.trim()),
      )
    ) {
      return !canConvert.value || !ssmlContent.value
    }
    // 原来的逻辑
    return !canConvert.value || !ssmlContent.value || !hasContent.value
  })

  const updateMode = () => {
    localStorage.setItem('mode', mode.value)

    // 当切换到indexedDB模式时，确保ProjectManager正确初始化
    if (mode.value === 'indexedDB') {
      // 在下一个tick中确保ProjectManager组件已加载
      nextTick(() => {
        if (projectManager.value) {
          // 调用ProjectManager的加载数据方法
          projectManager.value.loadProjectData()
        }
      })
    }
  }

  onBeforeMount(() => {
    // 从localStorage中获取上次保存的模式，如果没有则默认使用'fileSystem'
    mode.value = localStorage.getItem('mode') || 'fileSystem'
  })

  const handleAgentAccept = async (content) => {
    console.log('handleAgentAccept', content)
    textContent.value = content

    // 先设置空的Tiptap内容，触发一次内容更新事件
    jsonContent.value = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    }

    // 等待DOM更新完成
    await nextTick()

    // 按照句号、问号、感叹号等标点符号分割文本成句子
    // 使用正则表达式分割，保留分隔符
    const sentences = content.split(/([。！？.!?\n]+)/)

    // 将分割后的句子组合成完整的句子（包括标点符号）
    const completeSentences = []
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i]
      const punctuation = sentences[i + 1] || ''
      if (sentence.trim()) {
        completeSentences.push(sentence + punctuation)
      }
    }

    // 为每个句子创建段落节点
    const paragraphs = completeSentences.map((sentence) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: sentence.trim(),
        },
      ],
    }))

    // 如果没有段落（内容为空），则创建一个空段落
    if (paragraphs.length === 0) {
      paragraphs.push({
        type: 'paragraph',
        content: [],
      })
    }

    // 使用setTimeout确保在新的事件循环中设置实际内容
    setTimeout(() => {
      // 设置实际的JSON内容
      jsonContent.value = {
        type: 'doc',
        content: paragraphs,
      }

      // 强制更新hasContent状态为true，因为我们知道有内容
      hasContent.value = true

      // 关闭对话框
      showAgentDialog.value = false

      // 添加第二次检查，确保按钮状态更新
      setTimeout(() => {
        // 再次确认内容状态
        hasContent.value = true

        // 检查ssmlContent，如果为空但jsonContent有内容，尝试触发一次更新
        if (
          !ssmlContent.value &&
          jsonContent.value &&
          jsonContent.value.content &&
          jsonContent.value.content.length > 0
        ) {
          // 保存当前内容以触发SSML更新
          saveCurrentFile(jsonContent.value)
        }
      }, 100)
    }, 10)
  }

  const hasContent = ref(false)
  const isEmptyString = (isEmpty) => {
    hasContent.value = !isEmpty
  }

  const postImage = (i) => {
    const isElectron = $q.platform.is.electron
    const perfix = isElectron ? process.env.VITE_Images_URI : 'images'
    if (selectedLocale.value?.value === 'zh-cn') {
      return `${perfix}/${i.ShortName}.webp`
    } else {
      return `${perfix}/${i.Gender}.png`
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
      let editorContent = fileInfo.content ? JSON.parse(fileInfo.content) : null

      // 验证editorContent是否是有效的Tiptap文档格式
      if (!editorContent || !editorContent.type || editorContent.type !== 'doc') {
        // 如果不是有效的Tiptap文档，创建一个标准的空文档结构
        editorContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [],
            },
          ],
        }
      } else if (!editorContent.content || !Array.isArray(editorContent.content)) {
        // 确保content属性存在且是数组
        editorContent.content = [
          {
            type: 'paragraph',
            content: [],
          },
        ]
      } else {
        // 确保所有段落节点都有正确的类型
        editorContent.content = editorContent.content.map((node) => {
          if (!node.type) {
            return {
              type: 'paragraph',
              content: node.content || [],
            }
          }
          return node
        })
      }

      // Set the editor content using jsonContent from useTts
      jsonContent.value = editorContent
    } catch (error) {
      console.error('Error parsing file content as JSON:', error)
      // Fallback: 创建一个有效的空文档结构
      jsonContent.value = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      }
      ssmlContent.value = ''
    }
  }

  // Save current file content
  const saveCurrentFile = async (val) => {
    if (mode.value === 'indexedDB') {
      if (!currentFile.value || !projectManager.value) {
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
    } else if (mode.value === 'fileSystem') {
      if (isElectronEnv.value) {
        // Electron环境下使用Node.js的fs API保存文件
        if (currentFile.value?.path && window.fileSystemAPI) {
          try {
            // 检查文件是否仍存在
            const exists = await window.fileSystemAPI.fileExists(currentFile.value.path)
            if (!exists) {
              // 文件已被删除
              appStore.showError('文件已被删除或移动，无法保存')
              // 重置当前文件
              currentFile.value = null
              jsonContent.value = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [] }],
              }
              return
            }

            const fileContent = JSON.stringify(val)
            // 使用Electron preload中暴露的API
            await window.fileSystemAPI.writeFile(currentFile.value.path, fileContent)
            // console.log('Saved file in Electron:', currentFile.value.name)
          } catch (error) {
            console.error('Error saving file in Electron:', error)
            appStore.showError('保存文件失败: ' + error.message)
          }
        }
      } else {
        // 浏览器环境下使用File System API
        const handle = currentFile.value?.handle
        if (handle) {
          try {
            // 检查文件句柄是否仍有效
            let isValid = true
            try {
              await handle.requestPermission({ mode: 'readwrite' })
            } catch {
              isValid = false
            }

            if (!isValid) {
              // 文件句柄无效，可能是文件已被删除
              appStore.showError('文件访问权限丢失或文件已被删除，无法保存')
              // 重置当前文件
              currentFile.value = null
              jsonContent.value = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [] }],
              }
              return
            }

            // 创建可写入流
            const writable = await handle.createWritable()
            // 写入数据
            await writable.write(JSON.stringify(val))
            // 关闭流，完成保存
            await writable.close()
            console.log('Saved file in browser:', currentFile.value.name)
          } catch (error) {
            console.error('Error saving file in browser:', error)
            // 判断是否是由于文件被删除导致的错误
            if (
              error.name === 'NotFoundError' ||
              error.message.includes('not found') ||
              error.message.includes('deleted')
            ) {
              appStore.showError('文件可能已被删除或移动，无法保存')
              // 重置当前文件
              currentFile.value = null
              jsonContent.value = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [] }],
              }
            } else {
              appStore.showError('保存文件失败: ' + error.message)
            }
          }
        }
      }
    }
    await localforage.setItem('jsonContent', JSON.parse(JSON.stringify(jsonContent.value)))
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

    // 加载保存的Studio数据
    await loadStudioData()

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

    // 如果没有存储的模式，确保默认设置为fileSystem
    if (!mode.value) {
      mode.value = 'fileSystem'
      updateMode()
    } else if (mode.value === 'indexedDB') {
      // 确保indexedDB模式下的ProjectManager正确初始化
      nextTick(() => {
        if (projectManager.value) {
          projectManager.value.loadProjectData()
        }
      })
    }
    await restoreCache();

    // 触发视图更新
    nextTick(() => {
      // 强制组件重新计算渲染
      if (mode.value === 'fileSystem') {
        const temp = mode.value
        mode.value = ''
        setTimeout(() => {
          mode.value = temp
        }, 0)
      }
    })
  })

  const restoreCache = async () => {
    jsonContent.value = await localforage.getItem('jsonContent')
    if (!currentFile.value) {
      currentFile.value = {
        id: uid(),
        name: '未命名',
        jsonContent: jsonContent.value
      }
    }
    const covertedBlob = await localforage.getItem('covertedBlob') || await localforage.getItem('studioAudioBlob')
    if (covertedBlob) covertedAudio.value[currentFile.value.id] = URL.createObjectURL(covertedBlob)
  }

  // 导出当前文件为新文件
  const exportCurrentFile = async () => {
    if (!currentFile.value || !jsonContent.value || !isElectronEnv.value) return

    try {
      // 检查window.fileSystemAPI是否存在
      if (!window.fileSystemAPI || !window.fileSystemAPI.saveFileDialog) {
        console.error('fileSystemAPI.saveFileDialog is not available')
        appStore.showError('导出功能在此环境下不可用')
        return
      }

      // 获取当前文件内容的JSON字符串
      const fileContent = JSON.stringify(jsonContent.value)
      // 使用默认文件名
      const defaultPath = currentFile.value.path || currentFile.value.name || 'document.json'

      const result = await window.fileSystemAPI.saveFileDialog(defaultPath, fileContent)
      if (result) {
        appStore.showSuccess(`文件已保存至 ${result.name}`)
      }
    } catch (error) {
      console.error('Error exporting file:', error)
      appStore.showError('导出文件失败: ' + error.message)
    }
  }

  const enterStudio = async () => {
    // 创建可序列化的对象，包含文件信息
    const serializableData = {
      file: currentFile.value
        ? {
          id: currentFile.value.id,
          name: currentFile.value.name,
          jsonContent: jsonContent.value,
          textContent: textContent.value,
        }
        : null,
    }

    try {
      studioStore.studioAttrs = serializableData
      // 保存文件信息
      await localforage.setItem('studioAttrs', JSON.parse(JSON.stringify(serializableData)))

      // 如果有音频Blob，单独保存
      if (covertedBlob.value) {
        // Blob对象可以直接保存到IndexedDB
        await localforage.setItem('studioAudioBlob', covertedBlob.value)
        console.log('音频数据已保存到IndexedDB')
      }

      studioStore.setRunMode('storyboard')
      await loadStudioData();
    } catch (error) {
      console.error('保存Studio数据失败:', error)
      appStore.showError('无法保存音频数据: ' + error.message)
    }
  }
  const backTTS = async () => {
    studioStore.studioAttrs = void 0
    await localforage.removeItem('studioAttrs')
    studioStore.setRunMode('tts')
    await restoreCache();
  }

  // 从IndexedDB加载Studio数据（在组件挂载时调用）
  const loadStudioData = async () => {
    try {
      // 加载基本信息
      const savedData = await localforage.getItem('studioAttrs')
      if (savedData) {
        console.log('找到保存的Studio数据')

        // 如果有文件信息，可以在这里处理
        if (savedData.file) {
          // 可以选择性地恢复文件信息
          console.log('找到保存的文件信息:', savedData.file.name)
          currentFile.value = savedData.file
          jsonContent.value = savedData.file.jsonContent
          textContent.value = savedData.file.textContent
        }

        studioStore.studioAttrs = savedData

        // 如果有音频Blob标记，尝试加载
        const audioBlob = await localforage.getItem('studioAudioBlob')
        if (audioBlob) {
          covertedBlob.value = audioBlob
          covertedAudio.value[currentFile.value.id] = audioBlob
        }

        studioStore.setRunMode('storyboard')
      }
    } catch (error) {
      console.error('加载Studio数据失败:', error)
    }
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

  .convert-botton {
    background-image:
      linear-gradient(#121213, #121213),
      linear-gradient(#121213 50%, rgba(18, 18, 19, 0.6) 80%, rgba(18, 18, 19, 0)),
      linear-gradient(90deg,
        hsl(0deg 100% 63% / 33%),
        hsl(90deg 100% 63% / 21%),
        hsl(210deg 100% 63% / 46%),
        hsl(195deg 100% 63% / 46%),
        hsl(270, 100%, 63%));
    border: calc(0.08 * 1rem) solid transparent;
    background-origin: border-box;
    background-clip: padding-box, border-box, border-box;
    transition-property: transform;
    transition-duration: 300ms;
    transition-delay: 300ms;
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
    background-size: 200%;
    border-radius: 0.375rem;
    white-space: nowrap;
    background-color: transparent;
    box-shadow: 2px 2px 12px -5px black;
  }

  .convert-botton:hover {
    background-image:
      linear-gradient(#121213, #121213),
      linear-gradient(#121213 50%, rgba(18, 18, 19, 0.6) 80%, rgba(18, 18, 19, 0)),
      linear-gradient(90deg,
        hsl(0, 100%, 63%),
        hsl(90, 100%, 63%),
        hsl(210, 100%, 63%),
        hsl(195, 100%, 63%),
        hsl(270, 100%, 63%));
  }

  .convert-botton.disabled:hover {
    background-image:
      linear-gradient(#121213, #121213),
      linear-gradient(#121213 50%, rgba(18, 18, 19, 0.6) 80%, rgba(18, 18, 19, 0)),
      linear-gradient(90deg,
        hsl(0deg 100% 63% / 13%),
        hsl(90deg 100% 63% / 28%),
        hsl(210, 100%, 63%),
        hsl(195, 100%, 63%),
        hsl(270, 100%, 63%));
    cursor: not-allowed !important;
  }

  .convert-botton.disabled {
    opacity: 0.6 !important;
  }
</style>
