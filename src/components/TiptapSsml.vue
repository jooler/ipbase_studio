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
        <q-card bordered :class="{ 'radius-sm': !hasTextSelection }">
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
              <q-btn
                color="green"
                @click="setSelectedTextAsPreview"
                icon="record_voice_over"
                unelevated
                :disable="!hasTextSelection"
              >
                <q-tooltip>设为预览文本</q-tooltip>
              </q-btn>
            </template>
            <q-list v-if="!hasTextSelection" dense class="column gap-xs">
              <q-item
                clickable
                class="radius-xs"
                :class="{ 'bg-primary text-white': currentBreakStrength === 'none' }"
                @click="insertOrUpdateBreak('none')"
              >
                <q-item-section>无停顿</q-item-section>
              </q-item>
              <q-item
                clickable
                class="radius-xs"
                :class="{ 'bg-primary text-white': currentBreakStrength === 'x-weak' }"
                @click="insertOrUpdateBreak('x-weak')"
              >
                <q-item-section>微弱停顿</q-item-section>
              </q-item>
              <q-item
                clickable
                class="radius-xs"
                :class="{ 'bg-primary text-white': currentBreakStrength === 'weak' }"
                @click="insertOrUpdateBreak('weak')"
              >
                <q-item-section>轻微停顿</q-item-section>
              </q-item>
              <q-item
                clickable
                class="radius-xs"
                :class="{ 'bg-primary text-white': currentBreakStrength === 'medium' }"
                @click="insertOrUpdateBreak('medium')"
              >
                <q-item-section>中等停顿</q-item-section>
              </q-item>
              <q-item
                clickable
                class="radius-xs"
                :class="{ 'bg-primary text-white': currentBreakStrength === 'strong' }"
                @click="insertOrUpdateBreak('strong')"
              >
                <q-item-section>强停顿</q-item-section>
              </q-item>
              <q-item
                clickable
                class="radius-xs"
                :class="{ 'bg-primary text-white': currentBreakStrength === 'x-strong' }"
                @click="insertOrUpdateBreak('x-strong')"
              >
                <q-item-section>超强停顿</q-item-section>
              </q-item>
              <q-item v-if="isEditingBreak" clickable class="radius-xs" @click="removeBreak">
                <q-item-section class="text-negative">删除停顿</q-item-section>
              </q-item>
            </q-list>
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

    <!-- 成功提示 -->
    <div v-if="showSuccessToast" class="preview-text-set-toast">
      <span>{{ successMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, computed, watch, onMounted } from 'vue'
import { useEditor, EditorContent, BubbleMenu, Node as TiptapNode } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { Mark, Node, Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import { useTts } from '../composeables/azure/useTts'

const props = defineProps({
  modelValue: {
    type: [String, Object],
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
  placeholder: {
    type: String,
    default: '请在此处输入文本内容...',
  },
  autofocus: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'update:selectedVoice',
  'update:selectedLocale',
  'update:rate',
  'update:pitch',
  'update:volume',
  'saveContent',
])

// Get data from useTts
const { voiceList, initVoices, setCustomPreviewText, customPreviewText, ssmlContent, jsonContent } =
  useTts()

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
      isPreviewText: {
        default: false,
        parseHTML: (element) => element.hasAttribute('data-preview-text'),
        renderHTML: (attributes) => {
          if (!attributes.isPreviewText) {
            return {}
          }
          return {
            'data-preview-text': '',
          }
        },
      },
      isEmpty: {
        default: false,
        renderHTML: (attributes) => {
          if (!attributes.isEmpty) {
            return {}
          }
          return {
            class: 'empty-paragraph',
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
            editor.value.commands.insertContent(result)
            return true // 阻止默认粘贴行为
          }

          return false // 使用默认粘贴行为
        },
      },
    ]
  },
})

// Track active preview paragraph
// const activePreviewParagraph = ref(null)

// Watch for changes in customPreviewText to update UI
watch(customPreviewText, (newValue) => {
  // If preview text is cleared, clear all paragraphs' isPreviewText attribute
  if (!newValue && editor.value) {
    // Find any paragraphs with isPreviewText=true and unset them
    editor.value.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
        editor.value
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { ...node.attrs, isPreviewText: false })
          .run()
      }
    })
  }
})

// 自定义扩展，用于检测空段落
const EmptyParagraphDetector = Extension.create({
  name: 'emptyParagraphDetector',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          // 只有在内容变化时才执行
          if (!transactions.some((tr) => tr.docChanged)) return null

          const tr = newState.tr
          let modified = false

          // 遍历所有段落
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph') {
              // 检查段落是否为空
              const isEmpty = node.content.size === 0

              // 如果当前isEmpty状态与检测到的不一致，更新它
              if (isEmpty !== node.attrs.isEmpty) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  isEmpty,
                })
                modified = true
              }
            }
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})

// Initialize editor
const editor = useEditor({
  content: props.modelValue || jsonContent.value || '',
  extensions: [
    Document,
    SsmlParagraph,
    Text,
    SsmlMark,
    // 添加SSML Break扩展
    SsmlBreak,
    // 自定义粘贴处理扩展
    CustomPasteHandler,
    // 添加占位符扩展
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
    }),
    // 添加空段落检测扩展
    EmptyParagraphDetector,
    // 移除预览文本装饰器
    History,
  ],
  autofocus: props.autofocus,
  onSelectionUpdate: ({ editor }) => {
    updateSelectionAttributes(editor)
  },
  onCreate: ({ editor }) => {
    syncSsml(editor)
  },
  onUpdate: ({ editor }) => {
    syncSsml(editor)
    emit('saveContent', editor.getJSON())
  },
})

const syncSsml = (editor) => {
  // Get editor content as JSON
  const editorJson = editor.getJSON()

  // Convert to SSML for API
  const ssml = convertToSsml(editorJson)
  ssmlOutput.value = ssml // 更新本地输出
  ssmlContent.value = ssml // 更新将发送给API的内容
}

// Watch for model changes from outside the component
watch(
  () => props.modelValue,
  (newValue) => {
    // Skip if editor not initialized or if this update came from us
    if (!editor.value || !newValue) return

    // Update editor content
    editor.value.commands.setContent(newValue)

    // Also update jsonContent in useTts
    jsonContent.value = newValue
  },
  { deep: true },
)

// Also watch jsonContent from useTts for changes
watch(
  () => jsonContent.value,
  (newValue) => {
    if (!editor.value || !newValue) return

    // Check if content actually changed to avoid loops
    const currentContent = editor.value.getJSON()
    if (JSON.stringify(currentContent) !== JSON.stringify(newValue)) {
      editor.value.commands.setContent(newValue)
    }
  },
  { deep: true },
)

// Update attribute controls based on current selection
const updateSelectionAttributes = (editor) => {
  if (!editor) return
  const { from, to } = editor.state.selection
  if (from === to) {
    // 当没有选择时，不要重置activeControl
    return
  }

  // 如果是编辑停顿模式，不改变选择属性
  if (isEditingBreak.value) return

  // 确保在普通文本选择时重置节点选择状态
  isNodeSelection.value = false

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
  return ssml
}

// SSML output
const ssmlOutput = ref('')

// Expose data for parent components
watch(
  [selectedLocale, selectedVoice, globalRate, globalPitch, globalVolume],
  ([newLocale, newVoice, newRate, newPitch, newVolume]) => {
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

// 添加一个变量跟踪是否在编辑停顿
const isEditingBreak = ref(false)
// 添加一个变量用于区分节点选择和文本选择
const isNodeSelection = ref(false)
// 添加一个变量记录当前编辑的停顿强度
const currentBreakStrength = ref(null)

// 添加显示成功提示的状态
const showSuccessToast = ref(false)
const successMessage = ref('')

// 添加一个计算属性，用于判断是否有文本被选中
const hasTextSelection = computed(() => {
  if (!editor.value) return false

  // 如果是节点选择模式（如停顿编辑），则返回false
  if (isNodeSelection.value) return false

  const { from, to } = editor.value.state.selection
  return from !== to
})

// 设置选中的文本作为预览文本
const setSelectedTextAsPreview = () => {
  if (!editor.value) return

  const { from, to } = editor.value.state.selection
  if (from === to) return // 没有选中文本

  const selectedText = editor.value.state.doc.textBetween(from, to, ' ')
  if (selectedText.trim()) {
    console.log('TiptapSsml setting customPreviewText:', selectedText.trim())
    setCustomPreviewText(selectedText.trim())

    // Clear any existing preview paragraphs
    editor.value.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
        editor.value
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { ...node.attrs, isPreviewText: false })
          .run()
      }
    })

    // Find the paragraph containing this selection and mark it as preview text
    let $pos = editor.value.state.doc.resolve(from)
    let depth = $pos.depth
    while (depth > 0) {
      let node = $pos.node(depth)
      if (node.type.name === 'paragraph') {
        // Set the current paragraph as preview text
        const paragraphPos = $pos.before(depth)
        editor.value
          .chain()
          .setNodeSelection(paragraphPos)
          .updateAttributes('paragraph', { ...node.attrs, isPreviewText: true })
          .run()
        break
      }
      depth--
    }

    // 显示提示消息
    successMessage.value = '已设置预览文本'
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 2000)
  }
}

// 清除自定义预览文本
const clearCustomPreviewText = () => {
  console.log('TiptapSsml clearing customPreviewText')
  setCustomPreviewText('')

  // Clear isPreviewText attribute from all paragraphs
  if (editor.value) {
    editor.value.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
        editor.value
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { ...node.attrs, isPreviewText: false })
          .run()
      }
    })
  }

  // 显示提示消息
  successMessage.value = '已清除预览文本'
  showSuccessToast.value = true
  setTimeout(() => {
    showSuccessToast.value = false
  }, 2000)
}

// 从段落设置预览文本
const setPreviewTextFromParagraph = (event) => {
  // 确保点击的是段落前面的区域
  const rect = event.target.getBoundingClientRect()
  const offsetX = event.clientX - rect.left

  // 查找点击的段落
  const element = event.target.closest('p')
  if (!element) return

  // 检查是否点击了设置/清理预览文本的图标区域（左侧24px）
  if (offsetX > 24) return

  // 如果是点击了停顿图标，不触发预览文本设置功能
  if (event.target.closest('.ssml-break') || event.target.closest('[data-break-edit]')) return

  if (!editor.value) return

  // 检查段落是否有文本内容
  const paragraphText = element.textContent.trim()
  if (!paragraphText) return // 如果段落没有文本内容，不执行任何操作

  // Check if this is the clear button click
  if (element.hasAttribute('data-preview-text') && offsetX <= 24) {
    clearCustomPreviewText()
    return
  }

  // Check if this is the set preview button click for a non-preview paragraph
  if (!element.hasAttribute('data-preview-text') && offsetX <= 24) {
    // 已经在上面检查过段落内容是否为空，这里直接使用paragraphText
    setCustomPreviewText(paragraphText)

    // Find and clear any existing preview paragraphs
    editor.value.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
        editor.value
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { ...node.attrs, isPreviewText: false })
          .run()
      }
    })

    // 使用更可靠的方法设置当前段落为预览文本
    try {
      // 获取元素的位置信息
      const pos = editor.value.view.posAtDOM(element, 0)
      // 查找pos对应的位置所在的段落节点
      const $pos = editor.value.state.doc.resolve(pos)
      let depth = $pos.depth
      let foundParagraph = false

      // 向上遍历节点结构寻找段落节点
      while (depth >= 0) {
        const node = $pos.node(depth)
        if (node.type.name === 'paragraph') {
          // 找到段落节点，设置它的属性
          const paragraphPos = $pos.before(depth)

          editor.value
            .chain()
            .setNodeSelection(paragraphPos)
            .updateAttributes('paragraph', { isPreviewText: true })
            .run()

          foundParagraph = true
          break
        }
        depth--
      }

      if (!foundParagraph) {
        // 备选方法：设置从当前位置开始的段落
        console.log('未找到段落节点，尝试备选方法')
        editor.value
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { isPreviewText: true })
          .run()
      }
    } catch (e) {
      console.error('设置预览段落时出错:', e)
    }

    // 显示成功提示
    successMessage.value = '已设置预览文本'
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 2000)
  }
}

// 自定义浮动菜单显示逻辑
const shouldShowBubbleMenu = ({ editor }) => {
  // 如果没有焦点或者不是停顿编辑模式，不显示
  if (!editor.isFocused && !isEditingBreak.value) {
    return false
  }

  // 检查光标是否在行首位置
  const { from, empty } = editor.state.selection

  // 如果光标处于段落开头且是单光标（没有选择文本），不显示浮动工具栏
  if (empty) {
    const $pos = editor.state.doc.resolve(from)
    const parentNode = $pos.parent

    // 检查光标是否在当前节点的开始位置
    if (parentNode.type.name === 'paragraph' && $pos.parentOffset === 0) {
      return false
    }
  }

  // 当编辑停顿或编辑器有焦点且不在行首时显示菜单
  return true
}

// 插入或更新停顿函数
const insertOrUpdateBreak = (strength) => {
  if (!editor.value) return

  // 获取当前编辑器选中内容
  const { selection } = editor.value.state
  const selectedNode = selection.node

  // 检查是否有选中节点且是停顿节点
  if (isEditingBreak.value && selectedNode && selectedNode.type.name === 'ssmlBreak') {
    // 更新现有停顿节点的强度
    editor.value
      .chain()
      .focus()
      .updateAttributes('ssmlBreak', {
        strength,
      })
      .run()
  } else {
    // 没有选中停顿节点或不在编辑停顿模式，插入新的停顿
    currentBreakStrength.value = null // 重置为默认值
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

  // 完成编辑后重置状态
  isEditingBreak.value = false
  isNodeSelection.value = false
  currentBreakStrength.value = null // 重置为默认值
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
  isNodeSelection.value = false
  currentBreakStrength.value = null // 重置为默认值
}

// 以编程方式聚焦编辑器
const focusEditor = () => {
  if (editor.value) {
    editor.value.commands.focus()
  }
}

// 暴露方法给父组件
defineExpose({
  focusEditor,
})

// 在编辑器初始化后添加行点击事件
onMounted(() => {
  if (editor.value) {
    // 使用事件委托为编辑器内的段落添加点击事件
    const editorElement = document.querySelector('.editor-content')
    if (editorElement) {
      editorElement.addEventListener('click', (event) => {
        // 处理段落预览按钮点击
        if (event.target.closest('p')) {
          setPreviewTextFromParagraph(event)
        }

        // 检查点击的是否是停顿图标
        const breakElement =
          event.target.closest('.ssml-break') || event.target.closest('[data-break-edit]')
        if (breakElement) {
          isEditingBreak.value = true
          isNodeSelection.value = true // 标记为节点选择模式
          activeControl.value = 'break'

          // 需要聚焦编辑器并选中整个停顿节点
          if (editor.value) {
            try {
              // 获取停顿节点的DOM位置
              const pos = editor.value.view.posAtDOM(breakElement, 0)

              // 在位置处找到停顿节点
              let found = false
              editor.value.state.doc.nodesBetween(
                pos,
                pos + breakElement.textContent.length + 1,
                (node, nodePos) => {
                  if (!found && node.type.name === 'ssmlBreak') {
                    // 记录当前停顿强度
                    currentBreakStrength.value = node.attrs.strength

                    // 选中整个停顿节点
                    editor.value.chain().focus().setNodeSelection(nodePos).run()
                    found = true
                    return false // 停止遍历
                  }
                  return true
                },
              )
            } catch (e) {
              console.error('选中停顿节点时出错:', e)
            }
          }
        } else {
          // 如果点击的不是停顿图标，则退出停顿编辑模式
          isEditingBreak.value = false
          isNodeSelection.value = false // 重置节点选择状态
        }
      })
    }
  }
})
</script>

<style scoped>
.tiptap-ssml-editor {
  display: flex;
  flex-direction: column;
  position: relative;
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

/* Placeholder styles */
.editor-content :deep(.is-editor-empty) {
  min-height: 100px;
}

.editor-content :deep(.is-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
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

/* CSS for preview text paragraphs and buttons */
.editor-content :deep(p) {
  position: relative;
  padding-left: 30px; /* 为按钮留出空间 */
  border-left: 3px solid #4caf5000;
  padding-top: 4px;
  padding-bottom: 4px;
}

/* Set preview button - shown on hover for paragraphs that aren't previews */
.editor-content :deep(p.empty-paragraph)::before {
  display: none !important;
}
.editor-content :deep(p.is-empty)::before {
  display: none !important;
}

.editor-content :deep(p:not([data-preview-text])):hover::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 19px;
  height: 19px;
  opacity: 1;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTU1NC42NjY2NjcgMzYyLjY2NjY2N3YyOTguNjY2NjY2YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDEtMjEuMzMzMzM0IDIxLjMzMzMzNGgtNDIuNjY2NjY2YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDEtMjEuMzMzMzM0LTIxLjMzMzMzNHYtMjk4LjY2NjY2NmEyMS4zMzMzMzMgMjEuMzMzMzMzIDAgMCAxIDIxLjMzMzMzNC0yMS4zMzMzMzRoNDIuNjY2NjY2YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDEgMjEuMzMzMzM0IDIxLjMzMzMzNHpNNzA0IDEyOGgtNDIuNjY2NjY3YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAtMjEuMzMzMzMzIDIxLjMzMzMzM3Y3MjUuMzMzMzM0YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAgMjEuMzMzMzMzIDIxLjMzMzMzM2g0Mi42NjY2NjdhMjEuMzMzMzMzIDIxLjMzMzMzMyAwIDAgMCAyMS4zMzMzMzMtMjEuMzMzMzMzdi03MjUuMzMzMzM0YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAtMjEuMzMzMzMzLTIxLjMzMzMzM3ogbSAxNzAuNjY2NjY3IDI5OC42NjY2NjdoLTQyLjY2NjY2N2EyMS4zMzMzMzMgMjEuMzMzMzMzIDAgMCAwLTIxLjMzMzMzMyAyMS4zMzMzMzN2MTI4YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAgMjEuMzMzMzMzIDIxLjMzMzMzM2g0Mi42NjY2NjdhMjEuMzMzMzMzIDIxLjMzMzMzMyAwIDAgMCAyMS4zMzMzMzMtMjEuMzMzMzMzdi0xMjhhMjEuMzMzMzMzIDIxLjMzMzMzMyAwIDAgMC0yMS4zMzMzMzMtMjEuMzMzMzMzeiBtLTY4Mi42NjY2NjcgNDIuNjY2NjY2aC00Mi42NjY2NjdhMjEuMzMzMzMzIDIxLjMzMzMzMyAwIDAgMC0yMS4zMzMzMzMgMjEuMzMzMzM0djQyLjY2NjY2NmEyMS4zMzMzMzMgMjEuMzMzMzMzIDAgMCAwIDIxLjMzMzMzMyAyMS4zMzMzMzRoNDIuNjY2NjY3YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAgMjEuMzMzMzMzLTIxLjMzMzMzNHYtNDIuNjY2NjY2YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAtMjEuMzMzMzMzLTIxLjMzMzMzNHogbSAxNzAuNjY2NjY3LTIxMy4zMzMzMzNoLTQyLjY2NjY2N2EyMS4zMzMzMzMgMjEuMzMzMzMzIDAgMCAwLTIxLjMzMzMzMyAyMS4zMzMzMzN2NDY5LjMzMzMzNGEyMS4zMzMzMzMgMjEuMzMzMzMzIDAgMCAwIDIxLjMzMzMzMyAyMS4zMzMzMzNoNDIuNjY2NjY3YTIxLjMzMzMzMyAyMS4zMzMzMzMgMCAwIDAgMjEuMzMzMzMzLTIxLjMzMzMzM3YtNDY5LjMzMzMzNGEyMS4zMzMzMzMgMjEuMzMzMzMzIDAgMCAwLTIxLjMzMzMzMy0yMS4zMzMzMzN6IiBmaWxsPSIjMTI5NmRiIi8+PC9zdmc+');
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
  z-index: 10;
}

/* Set preview button tooltip */
.editor-content :deep(p:not([data-preview-text])):hover::after {
  content: '';
  position: absolute;
  left: 26px;
  top: 2px;
  background: rgba(0, 0, 0, 0);
  color: rgb(83, 163, 255);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
  backdrop-filter: blur(5px);
}

.editor-content :deep(p:not([data-preview-text])):hover:hover::after {
  opacity: 1;
}

/* Preview paragraph styling */
.editor-content :deep(p[data-preview-text]) {
  background-color: rgba(76, 175, 80, 0.05);
  border-left: 3px solid #4caf50;
}

/* Clear preview button - always shown for preview paragraphs */
.editor-content :deep(p[data-preview-text].empty-paragraph)::before {
  display: none !important;
}

.editor-content :deep(p[data-preview-text])::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 19px;
  height: 19px;
  opacity: 1;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTUxMiA2MzJjLTIyLjA4IDAtNDAgMTcuOTItNDAgNDB2Mjg4YTQwIDQwIDAgMCAwIDgwIDB2LTI4OGMwLTIyLjA4LTE3LjkyLTQwLTQwLTQwek01MTIgMzkyYzIyLjA4IDAgNDAtMTcuOTIgNDAtNDBWNjRhNDAgNDAgMCAwIDAtODAgMHYyODhjMCAyMi4wOCAxNy45MiA0MCA0MCA0MHpNOTg2LjI0IDY0OS4wMjRMNjcuNDg4IDMwMC43MDRhNDAgNDAgMCAwIDAtMjkuNzI4IDc0LjMwNGw5MTguNzUyIDM0OC4zMmE0MCA0MCAwIDAgMCAyOS43MjgtNzQuMzA0ek03MzYgNjk2Yy0yMi4wOCAwLTQwIDE3LjkyLTQwIDQwdjY0YTQwIDQwIDAgMCAwIDgwIDB2LTY0YzAtMjIuMDgtMTcuOTItNDAtNDAtNDB6TTczNiA0ODhjMjIuMDggMCA0MC0xNy45MiA0MC00MFYyMjRhNDAgNDAgMCAwIDAtODAgMHYyMjRjMCAyMi4wOCAxNy45MiA0MCA0MCA0MHpNMjg4IDUzNmMtMjIuMDggMC00MCAxNy45Mi00MCA0MHYyMjRhNDAgNDAgMCAwIDAgODAgMHYtMjI0YzAtMjIuMDgtMTcuOTItNDAtNDAtNDB6TTI4OCAzMjhjMjIuMDggMCA0MC0xNy45MiA0MC00MFYyMjRhNDAgNDAgMCAwIDAtODAgMHY2NGMwIDIyLjA4IDE3LjkyIDQwIDQwIDQwek02NCA0NDBjLTIyLjA4IDAtNDAgMTcuOTItNDAgNDB2MTI4YTQwIDQwIDAgMCAwIDgwIDB2LTEyOGMwLTIyLjA4LTE3LjkyLTQwLTQwLTQwek05NjAgNTg0YzIyLjA4IDAgNDAtMTcuOTIgNDAtNDB2LTEyOGE0MCA0MCAwIDAgMC04MCAwdjEyOGMwIDIyLjA4IDE3LjkyIDQwIDQwIDQweiIgZmlsbD0iI2Y0NDMzNiIvPjwvc3ZnPg==');
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
  z-index: 10;
}

/* Clear preview button tooltip */
.editor-content :deep(p[data-preview-text])::after {
  content: '';
  position: absolute;
  left: 26px;
  top: 2px;
  background: rgba(0, 0, 0, 0);
  color: rgb(255, 94, 94);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
  backdrop-filter: blur(5px);
}

.editor-content :deep(p[data-preview-text]):hover::after {
  opacity: 1;
}

.preview-text-clear-btn {
  position: absolute;
  left: 0;
  top: 0;
  width: 21px;
  height: 21px;
  z-index: 10;
  cursor: pointer;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  outline: none;
}

.preview-text-clear-btn:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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

.custom-preview-text {
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

/* 成功消息提示 */
.preview-text-set-toast {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(76, 175, 80, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 100;
  animation: fadeOut 2s ease-in-out forwards;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
