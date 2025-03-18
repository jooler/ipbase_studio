<template>
  <div class="tiptap-ssml-editor">
    <EditorContent :editor="editor" class="editor-content" />

    <template v-if="editor">
      <BubbleMenu
        :editor="editor"
        :tippy-options="{ duration: 100, maxWidth: 'none' }"
        class="bubble-menu transparent"
        :should-show="shouldShowBubbleMenu"
      >
        <q-card bordered>
          <q-toolbar v-if="hasTextSelection" class="transparent row gap-xs q-px-xs">
            <q-select
              v-model="selectionVoice"
              :options="filteredVoiceOptions"
              label="语音"
              dense
              options-dense
              filled
              square
              popup-content-style="z-index: 99999;"
              menu-anchor="bottom middle"
              menu-self="top middle"
              class="full-width"
              style="min-width: 220px"
              @update:model-value="applyVoice"
              :disable="!hasTextSelection"
            />
          </q-toolbar>
          <q-card-section class="row no-wrap items-center gap-xs border-top q-pa-xs">
            <template v-if="hasTextSelection">
              <q-btn
                :color="activeControl === 'rate' ? 'primary' : void 0"
                @click="activeControl = activeControl === 'rate' ? null : 'rate'"
                icon="speed"
                unelevated
                :disable="!hasTextSelection"
              >
                <q-tooltip>语速</q-tooltip>
              </q-btn>
              <q-btn
                :color="activeControl === 'pitch' ? 'primary' : void 0"
                @click="activeControl = activeControl === 'pitch' ? null : 'pitch'"
                icon="tune"
                unelevated
                :disable="!hasTextSelection"
              >
                <q-tooltip>音调</q-tooltip>
              </q-btn>
              <q-btn
                :color="activeControl === 'volume' ? 'primary' : void 0"
                @click="activeControl = activeControl === 'volume' ? null : 'volume'"
                icon="volume_up"
                unelevated
                :disable="!hasTextSelection"
              >
                <q-tooltip>音量</q-tooltip>
              </q-btn>
            </template>
            <q-btn v-if="!hasTextSelection" flat icon="pause">
              <q-menu>
                <q-list bordered dense class="radius-sm q-pa-xs column gap-xs">
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="insertOrUpdateBreak('none')"
                  >
                    <q-item-section>无停顿</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="insertOrUpdateBreak('x-weak')"
                  >
                    <q-item-section>微弱停顿</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="insertOrUpdateBreak('weak')"
                  >
                    <q-item-section>轻微停顿</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="insertOrUpdateBreak('medium')"
                  >
                    <q-item-section>中等停顿</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="insertOrUpdateBreak('strong')"
                  >
                    <q-item-section>强停顿</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="insertOrUpdateBreak('x-strong')"
                  >
                    <q-item-section>超强停顿</q-item-section>
                  </q-item>
                  <q-item
                    v-if="isEditingBreak"
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="removeBreak"
                  >
                    <q-item-section class="text-negative">删除停顿</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
            <q-btn
              v-if="hasTextSelection"
              color="negative"
              flat
              @click="clearAttributes"
              icon="backspace"
              :disable="!hasTextSelection"
            >
              <q-tooltip>清除样式</q-tooltip>
            </q-btn>
          </q-card-section>
          <q-card-section
            v-if="hasTextSelection && activeControl && activeControl !== 'break'"
            class="q-px-md q-pt-lg q-pb-xs border-top"
          >
            <q-slider
              v-if="activeControl === 'rate'"
              v-model="selectionRate"
              :min="50"
              :max="200"
              :step="5"
              @update:model-value="applyRate"
              label
              :label-value="'语速: ' + selectionRate + '%'"
              label-always
            />
            <q-slider
              v-if="activeControl === 'pitch'"
              v-model="selectionPitch"
              :min="50"
              :max="150"
              :step="5"
              @update:model-value="applyPitch"
              label
              :label-value="'音调: ' + selectionPitch + '%'"
              label-always
            />
            <q-slider
              v-if="activeControl === 'volume'"
              v-model="selectionVolume"
              :min="0"
              :max="100"
              :step="5"
              @update:model-value="applyVolume"
              label
              :label-value="'音量: ' + selectionVolume + '%'"
              label-always
            />
          </q-card-section>
        </q-card>
      </BubbleMenu>
    </template>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, computed, watch, onMounted } from 'vue'
import { useEditor, EditorContent, BubbleMenu, Node as TiptapNode } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { Mark, Node, Extension } from '@tiptap/core'
import History from '@tiptap/extension-history'
import { useTts } from '../composeables/azure/useTts'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  selectedVoiceInitial: {
    type: Object,
    default: null,
  },
  selectedLocaleInitial: {
    type: Object,
    default: null,
  },
  rateInitial: {
    type: [Number, Object],
    default: 100,
  },
  pitchInitial: {
    type: [Number, Object],
    default: 100,
  },
  volumeInitial: {
    type: Number,
    default: 100,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'ssml-change',
  'update:selectedVoice',
  'update:selectedLocale',
  'update:rate',
  'update:pitch',
  'update:volume',
])

// Get data from useTts
const { voiceList, initVoices } = useTts()

// Initialize voices
initVoices()

// Global settings for SSML
const selectedLocale = ref(props.selectedLocaleInitial)
const selectedVoice = ref(props.selectedVoiceInitial)
const globalRate = ref(typeof props.rateInitial === 'number' ? props.rateInitial : 100)
const globalPitch = ref(typeof props.pitchInitial === 'number' ? props.pitchInitial : 100)
const globalVolume = ref(props.volumeInitial || 100)

// Filtered voice options based on selected locale
const filteredVoiceOptions = computed(() => {
  if (!selectedLocale.value || !voiceList.value?.length) return []

  const filtered = voiceList.value.filter(
    (voice) => voice.Locale.toLowerCase() === selectedLocale.value.value.toLowerCase(),
  )

  return filtered.map((voice) => ({
    label: `${voice.DisplayName} - ${voice.Gender === 'Male' ? '男声' : '女声'}`,
    value: voice.ShortName,
    ...voice,
  }))
})

// Watch for locale changes
// function onLocaleChange() {
//   // Reset voice when locale changes
//   selectedVoice.value = null
// }

// SSML attribute values for current selection
const selectionVoice = ref(null)
const selectionRate = ref(100)
const selectionPitch = ref(100)
const selectionVolume = ref(100)
const activeControl = ref(null)

// Paragraph node extension with SSML attributes
const SsmlParagraph = Node.create({
  name: 'paragraph',
  priority: 1000,
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      voice: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-voice'),
        renderHTML: (attributes) => {
          if (!attributes.voice) {
            return {}
          }
          return {
            'data-voice': attributes.voice,
          }
        },
      },
      rate: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-rate')
          return value ? parseInt(value) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.rate) {
            return {}
          }
          return {
            'data-rate': attributes.rate,
          }
        },
      },
      pitch: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-pitch')
          return value ? parseInt(value) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.pitch) {
            return {}
          }
          return {
            'data-pitch': attributes.pitch,
          }
        },
      },
      volume: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-volume')
          return value ? parseInt(value) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.volume) {
            return {}
          }
          return {
            'data-volume': attributes.volume,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'p' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', HTMLAttributes, 0]
  },

  content: 'inline*',
  group: 'block',
})

// Custom mark for SSML attributes
const SsmlMark = Mark.create({
  name: 'ssml',

  addAttributes() {
    return {
      voice: {
        default: null,
      },
      rate: {
        default: 100,
      },
      pitch: {
        default: 100,
      },
      volume: {
        default: 100,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-ssml]',
        getAttrs: (element) => {
          return {
            voice: element.getAttribute('data-voice'),
            rate: element.getAttribute('data-rate')
              ? parseInt(element.getAttribute('data-rate'))
              : 100,
            pitch: element.getAttribute('data-pitch')
              ? parseInt(element.getAttribute('data-pitch'))
              : 100,
            volume: element.getAttribute('data-volume')
              ? parseInt(element.getAttribute('data-volume'))
              : 100,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        'data-ssml': '',
        'data-voice': HTMLAttributes.voice,
        'data-rate': HTMLAttributes.rate !== 100 ? HTMLAttributes.rate : null,
        'data-pitch': HTMLAttributes.pitch !== 100 ? HTMLAttributes.pitch : null,
        'data-volume': HTMLAttributes.volume !== 100 ? HTMLAttributes.volume : null,
      },
      0,
    ]
  },
})

// SSML Break 节点
const SsmlBreak = TiptapNode.create({
  name: 'ssmlBreak',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      strength: {
        default: 'medium',
        parseHTML: (element) => element.getAttribute('data-strength'),
        renderHTML: (attributes) => {
          return {
            'data-strength': attributes.strength,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span.ssml-break' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { class: 'ssml-break', ...HTMLAttributes, 'data-break-edit': 'true' }, '⏸️']
  },

  toText() {
    return ''
  },
})

// 自定义粘贴处理扩展
const CustomPasteHandler = Extension.create({
  name: 'customPasteHandler',

  addPasteRules() {
    return [
      {
        // 匹配纯文本粘贴
        filter: (node) => node.nodeName === '#text',
        handler: ({ content, editor }) => {
          // 使用正则表达式分割文本，包括中文句号、逗号、分号、感叹号、问号、顿号等标点作为分割点
          const sentences = content.split(/([。！？.!?\n]+)/g)
          let result = ''
          let currentSentence = ''

          // 获取当前的全局设置值
          const defaultAttrs = {
            voice: selectedVoice.value?.value || null,
            rate: globalRate.value !== 100 ? globalRate.value : null,
            pitch: globalPitch.value !== 100 ? globalPitch.value : null,
            volume: globalVolume.value !== 100 ? globalVolume.value : null,
          }

          for (let i = 0; i < sentences.length; i++) {
            if (i % 2 === 0) {
              // 文本内容
              currentSentence += sentences[i]
            } else {
              // 标点符号
              currentSentence += sentences[i]

              // 如果遇到句号、感叹号、问号或换行符，结束当前段落
              if (/[。！？.!?\n]/.test(sentences[i])) {
                // 创建带有属性的段落
                result += `<p data-type="paragraph" 
                  ${defaultAttrs.voice ? `data-voice="${defaultAttrs.voice}"` : ''} 
                  ${defaultAttrs.rate ? `data-rate="${defaultAttrs.rate}"` : ''} 
                  ${defaultAttrs.pitch ? `data-pitch="${defaultAttrs.pitch}"` : ''} 
                  ${defaultAttrs.volume ? `data-volume="${defaultAttrs.volume}"` : ''}>${currentSentence}</p>`
                currentSentence = ''
              }
            }
          }

          // 添加最后一个可能未完成的段落
          if (currentSentence.trim()) {
            result += `<p data-type="paragraph" 
              ${defaultAttrs.voice ? `data-voice="${defaultAttrs.voice}"` : ''} 
              ${defaultAttrs.rate ? `data-rate="${defaultAttrs.rate}"` : ''} 
              ${defaultAttrs.pitch ? `data-pitch="${defaultAttrs.pitch}"` : ''} 
              ${defaultAttrs.volume ? `data-volume="${defaultAttrs.volume}"` : ''}>${currentSentence}</p>`
          }

          // 如果处理结果不为空，插入HTML
          if (result) {
            editor.commands.insertContent(result)
            return true // 阻止默认粘贴行为
          }

          return false // 使用默认粘贴行为
        },
      },
    ]
  },
})

// Initialize editor
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    Document,
    SsmlParagraph,
    Text,
    SsmlMark,
    // 添加SSML Break扩展
    SsmlBreak,
    // 自定义粘贴处理扩展
    CustomPasteHandler,
    History,
  ],
  onSelectionUpdate: ({ editor }) => {
    updateSelectionAttributes(editor)
  },
  onUpdate: ({ editor }) => {
    // Update model value with HTML content
    emit('update:modelValue', editor.getHTML())

    // Convert to SSML
    const json = editor.state.doc.toJSON()
    const ssml = convertToSsml(json)
    ssmlOutput.value = ssml // 更新本地输出
    ssmlContent.value = ssml // 更新将发送给API的内容
    emit('ssml-change', ssml)
  },
})

// Update attribute controls based on current selection
const updateSelectionAttributes = (editor) => {
  if (!editor) return
  const { from, to } = editor.state.selection
  if (from === to) {
    // 当没有选择时，不要重置activeControl
    return
  }

  // Check if the ssml mark is active
  if (editor.isActive('ssml')) {
    const attrs = editor.getAttributes('ssml')

    selectionVoice.value = attrs.voice
      ? filteredVoiceOptions.value.find((option) => option.value === attrs.voice)
      : null
    selectionRate.value = attrs.rate || 100
    selectionPitch.value = attrs.pitch || 100
    selectionVolume.value = attrs.volume || 100

    // 根据所选文本的属性，自动设置activeControl
    if (attrs.rate !== 100 && activeControl.value === null) {
      activeControl.value = 'rate'
    } else if (attrs.pitch !== 100 && activeControl.value === null) {
      activeControl.value = 'pitch'
    } else if (attrs.volume !== 100 && activeControl.value === null) {
      activeControl.value = 'volume'
    }
  } else {
    // No SSML attributes found
    selectionVoice.value = null
    selectionRate.value = 100
    selectionPitch.value = 100
    selectionVolume.value = 100
    // 不重置activeControl，让用户可以继续使用当前的控件
  }
}

// Apply SSML attributes to selected text
const applyVoice = () => {
  if (!editor.value) return

  // Set mark with all current values
  editor.value
    .chain()
    .focus()
    .setMark('ssml', {
      voice: selectionVoice.value?.value || null,
      rate: selectionRate.value,
      pitch: selectionPitch.value,
      volume: selectionVolume.value,
    })
    .run()
}

const applyRate = () => {
  if (!editor.value) return

  // Set mark with all current values
  editor.value
    .chain()
    .focus()
    .setMark('ssml', {
      voice: selectionVoice.value?.value || null,
      rate: selectionRate.value,
      pitch: selectionPitch.value,
      volume: selectionVolume.value,
    })
    .run()
}

const applyPitch = () => {
  if (!editor.value) return

  // Set mark with all current values
  editor.value
    .chain()
    .focus()
    .setMark('ssml', {
      voice: selectionVoice.value?.value || null,
      rate: selectionRate.value,
      pitch: selectionPitch.value,
      volume: selectionVolume.value,
    })
    .run()
}

const applyVolume = () => {
  if (!editor.value) return

  // Set mark with all current values
  editor.value
    .chain()
    .focus()
    .setMark('ssml', {
      voice: selectionVoice.value?.value || null,
      rate: selectionRate.value,
      pitch: selectionPitch.value,
      volume: selectionVolume.value,
    })
    .run()
}

const clearAttributes = () => {
  if (!editor.value) return
  editor.value.chain().focus().unsetMark('ssml').run()
  selectionVoice.value = null
  selectionRate.value = 100
  selectionPitch.value = 100
  selectionVolume.value = 100
  // Reset the active control
  activeControl.value = null
}

// Convert editor JSON to SSML format
const convertToSsml = (json) => {
  if (!json) return ''

  // 设置正确的语言
  const langCode = selectedLocale.value?.value?.toLowerCase() || 'zh-cn'

  // 添加mstts命名空间，以支持更多高级功能
  let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${langCode}">`

  // 处理所有段落
  if (json.content) {
    for (const node of json.content) {
      if (node.type === 'paragraph') {
        // 获取段落级别的属性
        const paraVoice = node.attrs?.voice || selectedVoice.value?.value
        const paraRate = node.attrs?.rate || globalRate.value
        const paraPitch = node.attrs?.pitch || globalPitch.value
        const paraVolume = node.attrs?.volume || globalVolume.value

        // 段落级prosody属性
        const paraProsodyAttrs = []
        let paraHasChanges = false

        // 只在值不是默认值时添加属性，使用百分比而不是关键字
        if (paraRate && paraRate !== 100) {
          paraHasChanges = true
          // 计算相对于100%的百分比变化
          const relativeRate = paraRate > 100 ? `+${paraRate - 100}%` : `-${100 - paraRate}%`
          paraProsodyAttrs.push(`rate="${relativeRate}"`)
        }

        if (paraPitch && paraPitch !== 100) {
          paraHasChanges = true
          // 计算相对于100%的百分比变化
          const relativePitch = paraPitch > 100 ? `+${paraPitch - 100}%` : `-${100 - paraPitch}%`
          paraProsodyAttrs.push(`pitch="${relativePitch}"`)
        }

        if (paraVolume && paraVolume !== 100) {
          paraHasChanges = true
          // 直接使用百分比值
          const volumeValue = Math.min(100, Math.max(0, paraVolume))
          paraProsodyAttrs.push(`volume="${volumeValue}%"`)
        }

        // 检查段落内容是否已包含voice标签
        let segmentedContent = ''

        // 处理段落内容
        if (node.content) {
          let currentSegment = ''
          let currentVoice = paraVoice

          // 遍历段落内所有内容
          for (const child of node.content) {
            // 处理普通文本
            if (child.type === 'text') {
              let text = child.text || ''

              // 转义特殊字符
              text = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;')

              // 应用文本级别SSML属性
              if (child.marks?.length) {
                const ssmlMark = child.marks.find((mark) => mark.type === 'ssml')
                if (ssmlMark) {
                  // 处理文本级别的prosody属性
                  const prosodyAttrs = []

                  if (ssmlMark.attrs.rate && ssmlMark.attrs.rate !== 100) {
                    // 直接使用百分比值
                    const rateValue = ssmlMark.attrs.rate
                    // 计算相对于100%的百分比变化
                    const relativeRate =
                      rateValue > 100 ? `+${rateValue - 100}%` : `-${100 - rateValue}%`
                    prosodyAttrs.push(`rate="${relativeRate}"`)
                  }

                  if (ssmlMark.attrs.pitch && ssmlMark.attrs.pitch !== 100) {
                    // 直接使用百分比值
                    const pitchValue = ssmlMark.attrs.pitch
                    // 计算相对于100%的百分比变化
                    const relativePitch =
                      pitchValue > 100 ? `+${pitchValue - 100}%` : `-${100 - pitchValue}%`
                    prosodyAttrs.push(`pitch="${relativePitch}"`)
                  }

                  if (ssmlMark.attrs.volume && ssmlMark.attrs.volume !== 100) {
                    // 直接使用百分比值
                    const volumeValue = Math.min(100, Math.max(0, ssmlMark.attrs.volume))
                    prosodyAttrs.push(`volume="${volumeValue}%"`)
                  }

                  // 检查是否有语音变化
                  if (ssmlMark.attrs.voice && ssmlMark.attrs.voice !== currentVoice) {
                    // 如果当前有未处理的文本段，先处理它
                    if (currentSegment) {
                      // 应用段落级prosody
                      if (paraHasChanges && paraProsodyAttrs.length > 0) {
                        currentSegment = `<prosody ${paraProsodyAttrs.join(' ')}>${currentSegment}</prosody>`
                      }

                      // 添加当前语音标签
                      if (currentVoice) {
                        segmentedContent += `<voice name="${currentVoice}">${currentSegment}</voice>`
                      } else {
                        segmentedContent += currentSegment
                      }

                      currentSegment = ''
                    }

                    // 更新当前语音
                    currentVoice = ssmlMark.attrs.voice

                    // 创建新的带有prosody的文本
                    if (prosodyAttrs.length > 0) {
                      text = `<prosody ${prosodyAttrs.join(' ')}>${text}</prosody>`
                    }

                    // 将文本添加到新段落
                    currentSegment += text
                  } else {
                    // 语音相同，只应用prosody属性
                    if (prosodyAttrs.length > 0) {
                      text = `<prosody ${prosodyAttrs.join(' ')}>${text}</prosody>`
                    }
                    currentSegment += text
                  }
                } else {
                  // 没有特殊标记，直接添加文本
                  currentSegment += text
                }
              } else {
                // 没有mark，直接添加文本
                currentSegment += text
              }
            }
            // 处理ssmlBreak节点
            else if (child.type === 'ssmlBreak') {
              const strength = child.attrs?.strength || 'medium'
              currentSegment += `<break strength="${strength}"/>`
            }
          }

          // 处理最后一段文本
          if (currentSegment) {
            // 应用段落级prosody
            if (paraHasChanges && paraProsodyAttrs.length > 0) {
              currentSegment = `<prosody ${paraProsodyAttrs.join(' ')}>${currentSegment}</prosody>`
            }

            // 添加最后的语音标签
            if (currentVoice) {
              segmentedContent += `<voice name="${currentVoice}">${currentSegment}</voice>`
            } else {
              segmentedContent += currentSegment
            }
          }
        }

        // 添加段落内容到SSML
        if (segmentedContent) {
          ssml += segmentedContent
        }
      }
    }
  }

  ssml += '</speak>'

  // 输出调试信息
  console.log('生成的SSML:', ssml)

  return ssml
}

// SSML output
const ssmlOutput = ref('')
// 添加本地ssmlContent以避免混淆
const ssmlContent = ref('')

// Expose data for parent components
watch(
  [selectedLocale, selectedVoice, globalRate, globalPitch, globalVolume],
  ([newLocale, newVoice, newRate, newPitch, newVolume]) => {
    if (editor.value) {
      // Update content to trigger SSML conversion
      const json = editor.value.state.doc.toJSON()
      const ssml = convertToSsml(json)
      ssmlOutput.value = ssml
      ssmlContent.value = ssml // 同时更新本地值
      emit('ssml-change', ssml)
    }

    // Emit global setting changes to parent
    if (newLocale) emit('update:selectedLocale', newLocale)
    if (newVoice) emit('update:selectedVoice', newVoice)
    emit('update:rate', newRate)
    emit('update:pitch', newPitch)
    emit('update:volume', newVolume)
  },
  { deep: true },
)

// Get locales and options from useTts
// const locales = computed(() => ttsLocales.value || [])

// Initialize global values
watch(
  () => props.selectedLocaleInitial,
  (newValue) => {
    if (newValue) {
      selectedLocale.value = newValue
    }
  },
  { immediate: true },
)

watch(
  () => props.selectedVoiceInitial,
  (newValue) => {
    if (newValue) {
      selectedVoice.value = newValue
    }
  },
  { immediate: true },
)

watch(
  () => props.rateInitial,
  (newValue) => {
    if (typeof newValue === 'number') {
      globalRate.value = newValue
    }
  },
  { immediate: true },
)

watch(
  () => props.pitchInitial,
  (newValue) => {
    if (typeof newValue === 'number') {
      globalPitch.value = newValue
    }
  },
  { immediate: true },
)

watch(
  () => props.volumeInitial,
  (newValue) => {
    if (typeof newValue === 'number') {
      globalVolume.value = newValue
    }
  },
  { immediate: true },
)

// Cleanup
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

// 添加一个计算属性，用于判断是否有文本被选中
const hasTextSelection = computed(() => {
  if (!editor.value) return false
  const { from, to } = editor.value.state.selection
  return from !== to
})

// 添加一个变量跟踪是否在编辑停顿
const isEditingBreak = ref(false)

// 在编辑器初始化后，添加停顿图标的点击处理
onMounted(() => {
  if (editor.value) {
    // 使用事件委托为编辑器内的break图标添加点击事件
    const editorElement = document.querySelector('.editor-content')
    if (editorElement) {
      editorElement.addEventListener('click', (event) => {
        // 检查点击的是否是停顿图标
        if (event.target.closest('.ssml-break') || event.target.closest('[data-break-edit]')) {
          isEditingBreak.value = true
          activeControl.value = 'break'

          // 需要聚焦编辑器，否则浮动菜单不会显示
          editor.value.commands.focus()
        } else {
          // 如果点击的不是停顿图标，则退出停顿编辑模式
          isEditingBreak.value = false
        }
      })
    }
  }
})

// 自定义浮动菜单显示逻辑
const shouldShowBubbleMenu = ({ editor }) => {
  // 当编辑停顿或编辑器有焦点时显示菜单
  return editor.isFocused || isEditingBreak.value
}

// 插入或更新停顿函数
const insertOrUpdateBreak = (strength) => {
  if (!editor.value) return

  if (isEditingBreak.value) {
    // 获取当前编辑的停顿节点
    const node = editor.value.state.selection.node

    if (node && node.type.name === 'ssmlBreak') {
      // 更新现有停顿节点的强度
      editor.value
        .chain()
        .focus()
        .updateAttributes('ssmlBreak', {
          strength,
        })
        .run()
    } else {
      // 如果没有选中节点，则插入新的停顿
      insertBreak(strength)
    }

    // 完成编辑后，退出停顿编辑模式
    isEditingBreak.value = false
  } else {
    // 正常插入新的停顿
    insertBreak(strength)
  }
}

// 删除停顿函数
const removeBreak = () => {
  if (!editor.value) return

  // 获取当前选择
  const { from, to } = editor.value.state.selection

  // 尝试删除选中的节点
  editor.value.chain().focus().deleteRange({ from, to }).run()

  // 完成编辑后，退出停顿编辑模式
  isEditingBreak.value = false
}

// 插入停顿函数
const insertBreak = (strength) => {
  if (!editor.value) return

  // 使用自定义节点插入停顿标记
  editor.value
    .chain()
    .focus()
    .insertContent({
      type: 'ssmlBreak',
      attrs: {
        strength,
      },
    })
    .run()
}
</script>

<style scoped>
.tiptap-ssml-editor {
  display: flex;
  flex-direction: column;
}

.global-controls {
  background-color: rgba(25, 118, 210, 0.05);
  border-radius: 4px;
  padding: 1rem;
  border: 1px solid #e0e0e0;
}

.editor-content {
  flex-grow: 1;
  overflow-y: auto;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  min-height: 200px;
}

/* Visualization of SSML attributes in the editor */
.editor-content :deep([data-ssml]) {
  background-color: rgba(25, 118, 210, 0.1);
  border-radius: 2px;
}

.editor-content :deep([data-voice]) {
  border-bottom: 2px solid #1976d2;
}

.editor-content :deep([data-rate]) {
  text-decoration: wavy underline #f44336;
}

.editor-content :deep([data-pitch]) {
  text-decoration: wavy underline #4caf50;
}

.editor-content :deep([data-volume]) {
  text-decoration: wavy underline #ff9800;
}

.bubble-menu {
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 20;
  transition: opacity 0.2s ease;
}

.ssml-preview {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.8rem;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
}

/* Break node styling */
:deep(.ssml-break) {
  display: inline-block;
  background-color: rgba(156, 39, 176, 0.2);
  border-radius: 4px;
  padding: 0 4px;
  margin: 0 2px;
  color: #9c27b0;
  font-size: 0.9em;
  cursor: pointer;
}

/* 覆盖tippy-box的最大宽度 */
:deep(.tippy-box) {
  max-width: none !important;
}
</style>
