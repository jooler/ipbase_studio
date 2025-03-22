<template>
  <div class="tiptap-ssml-editor">
    <div v-if="editor?.isEmpty" class="absolute-full editor-content q-pa-md op-5">
      <p>在此输入你要转换的文本内容</p>
    </div>
    <EditorContent :editor="editor" class="editor-content" />

    <template v-if="editor">
      <!-- 使用新的TiptapBubbleMenu组件 -->
      <TiptapBubbleMenu
        :editor="editor"
        v-model:selectionVoice="selectionVoice"
        v-model:selectionRate="selectionRate"
        v-model:selectionPitch="selectionPitch"
        v-model:selectionVolume="selectionVolume"
        v-model:activeControl="activeControl"
        :isEditingBreak="isEditingBreak"
        :isNodeSelection="isNodeSelection"
        :currentBreakStrength="currentBreakStrength"
        :voiceOptions="voiceOptions"
        :shouldShowBubbleMenu="shouldShowBubbleMenu"
        :applyVoice="applyVoice"
        :applyRate="applyRate"
        :applyPitch="applyPitch"
        :applyVolume="applyVolume"
        :clearAttributes="clearAttributes"
        :insertOrUpdateBreak="insertOrUpdateBreak"
        :removeBreak="removeBreak"
        :setSelectedTextAsPreview="setSelectedTextAsPreview"
        :showPolyphonicOptions="showPolyphonicOptions"
        :polyphonicOptions="polyphonicOptions"
        :selectedPronunciation="selectedPronunciation"
        :applyPronunciation="applyPronunciation"
        :handlePolyphonicOptionClick="handlePolyphonicOptionClick"
        @check-polyphonic="onCheckPolyphonic"
        @clear-polyphonic="onClearPolyphonic"
        @update:selectedPronunciation="selectedPronunciation = $event"
      />
    </template>

    <!-- 成功提示 -->
    <div v-if="showSuccessToast" class="preview-text-set-toast">
      <span>{{ successMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, watch, onMounted, ref } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import TiptapBubbleMenu from './TiptapBubbleMenu.vue'

// 引入新的钩子函数
import { useTiptapHelpers } from '../composeables/tiptap/useTiptapHelpers'
import { useSsmlProcessor } from '../composeables/tiptap/useSsmlProcessor'
import { usePolyphonicProcessor } from '../composeables/tiptap/usePolyphonicProcessor'
import { useTts } from '../composeables/azure/useTts'

const props = defineProps({
  placeholder: {
    type: String,
    default: '请在此处输入文本内容...',
  },
  autofocus: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['saveContent', 'isEmptyString'])

// Get data from useTts
const {
  selectedVoice,
  selectedLocale,
  volume,
  selectedRateValue,
  selectedPitchValue,
  voiceOptions,
  customPreviewText,
  ssmlContent,
  jsonContent,
} = useTts()

// 获取Tiptap辅助函数
const {
  selectionVoice,
  selectionRate,
  selectionPitch,
  selectionVolume,
  activeControl,
  isEditingBreak,
  isNodeSelection,
  currentBreakStrength,
  createEmptyDocument,
  getEditorExtensions,
  shouldShowBubbleMenu,
  setupEditorEvents,
  watchJsonContent,
  updateSelectionAttributes,
} = useTiptapHelpers()

// 获取SSML处理相关函数
const {
  ssmlOutput,
  showSuccessToast,
  successMessage,
  syncSsml,
  convertToSsml,
  applyVoice,
  applyRate,
  applyPitch,
  applyVolume,
  clearAttributes,
  insertOrUpdateBreak,
  removeBreak,
  setSelectedTextAsPreview,
  setPreviewTextFromParagraph,
  focusEditor: focusEditorMethod,
} = useSsmlProcessor({
  selectionVoice,
  selectionRate,
  selectionPitch,
  selectionVolume,
})

// 获取多音字处理相关函数
const { polyphonicOptions, showPolyphonicOptions, checkPolyphonic, applyPronunciation } =
  usePolyphonicProcessor()

// 选中的发音
const selectedPronunciation = ref(null)

// 处理多音字选项点击事件
const handlePolyphonicOptionClick = (option) => {
  // 更新选中的发音
  selectedPronunciation.value = option

  // 无论是否是已选中的选项，都应用发音标签
  if (editor.value && option?.value) {
    // 记录详细日志
    console.log('手动点击多音字选项:', option)

    // 直接应用发音，不通过事件传递
    applyPronunciation(editor.value, option.value)
  }
}

// 处理检查多音字事件
const onCheckPolyphonic = async (text) => {
  // 每次检查新的字符时，先重置发音选择
  selectedPronunciation.value = null

  // 检查是否是多音字
  const isPolyphonic = await checkPolyphonic(text)

  // 如果是多音字
  if (isPolyphonic && polyphonicOptions.value.length > 0) {
    // 检查当前选中文本是否已有标记的发音
    if (editor.value) {
      const attrs = editor.value.getAttributes('ssml')

      if (attrs.pronunciation) {
        // 找到已经标记的发音，在选项中查找匹配项
        const match = polyphonicOptions.value.find((option) => option.value === attrs.pronunciation)

        if (match) {
          // 仅当文本已有标记的发音时才设置选中项
          selectedPronunciation.value = match
        }
      }
      // 否则保持为null，不自动选中第一项
    }
  }
}

// 处理清除多音字状态事件
const onClearPolyphonic = () => {
  // 重置选中的发音
  selectedPronunciation.value = null

  // 清空多音字选项
  if (typeof polyphonicOptions.value.length !== 'undefined') {
    polyphonicOptions.value = []
  }

  console.log('清除多音字状态')
}

// Initialize editor
const editor = useEditor({
  content: jsonContent.value || createEmptyDocument(),
  on: {
    paste: ({ editor, event }) => {
      event.preventDefault()
      const text = event.clipboardData.getData('text/plain')
      const sentences = text.split(/([。！？.!?\n]+)/g).filter((s) => s.trim() !== '')
      const paragraphs = sentences.map((s) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: s.trim() }],
      }))
      editor.commands.insertContent({
        type: 'doc',
        content: paragraphs,
      })
    },
  },
  extensions: getEditorExtensions(props.placeholder),
  autofocus: props.autofocus,
  onSelectionUpdate: ({ editor }) => {
    // 使用useTiptapHelpers中的updateSelectionAttributes
    updateSelectionAttributes(editor, voiceOptions)
  },
  onCreate: ({ editor }) => {
    syncSsml(editor)
    emit('isEmptyString', editor.isEmpty)
  },
  onUpdate: ({ editor }) => {
    syncSsml(editor)
    emit('saveContent', editor.getJSON())
    emit('isEmptyString', editor.isEmpty)
  },
})

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

// Expose data for parent components
watch(
  [selectedLocale, selectedVoice, selectedRateValue, selectedPitchValue, volume],
  () => {
    syncSsml(editor.value)
  },
  { deep: true },
)

// Watch jsonContent from useTts for changes
watch(
  jsonContent,
  () => {
    // 使用从 useTiptapHelpers 抽离出来的 watchJsonContent 函数
    watchJsonContent(jsonContent, editor.value, {
      onIsEmpty: (isEmpty) => emit('isEmptyString', isEmpty),
      updateSsmlOutput: (ssml) => (ssmlOutput.value = ssml),
      updateSsmlContent: (ssml) => (ssmlContent.value = ssml),
      convertToSsml,
    })
  },
  { deep: true },
)

// 暴露方法给父组件
const focusEditor = () => {
  focusEditorMethod(editor.value)
}

// Cleanup on component unmount
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

// 在编辑器初始化后添加行点击事件
onMounted(() => {
  if (editor.value) {
    // 使用从useTiptapHelpers中抽离的setupEditorEvents函数替代内联的事件处理逻辑
    setupEditorEvents(editor.value, {
      setPreviewTextFromParagraph,
      handleBreakClick: () => {}, // 这里暂时不需要额外的break处理逻辑
    })
  }
})

// 对外暴露的方法
defineExpose({
  focusEditor,
})
</script>

<style lang="scss" scoped>
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

  /* Placeholder styles */
  :deep(.is-editor-empty) {
    min-height: 100px;
  }

  :deep(.is-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  /* Visualization of SSML attributes in the editor */
  :deep([data-ssml]) {
    background-color: rgba(25, 118, 210, 0.1);
    border-radius: 2px;
  }

  :deep([data-voice]) {
    border-bottom: 2px solid #1976d2;
  }

  :deep([data-pronunciation]) {
    border-bottom: 2px dashed #9c27b0;
    background-color: rgba(156, 39, 176, 0.1);
  }

  :deep([data-rate]) {
    text-decoration: wavy underline #f44336;
  }

  :deep([data-pitch]) {
    text-decoration: wavy underline #4caf50;
  }

  :deep([data-volume]) {
    text-decoration: wavy underline #ff9800;
  }

  /* CSS for paragraphs and buttons */
  :deep(p) {
    position: relative;
    padding-left: 30px;
    border-left: 3px solid #4caf5000;
    padding-top: 8px;
    padding-bottom: 4px;
    font-size: 18px;

    &.empty-paragraph,
    &.is-empty {
      &::before {
        display: none !important;
      }
    }

    /* Set preview button - shown on hover for paragraphs that aren't previews */
    &:not([data-preview-text]) {
      &:hover {
        &::before {
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

        &::after {
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

          &:hover {
            opacity: 1;
          }
        }
      }
    }

    /* Preview paragraph styling */
    &[data-preview-text] {
      background-color: rgba(76, 175, 80, 0.05);
      border-left: 3px solid #4caf50;

      &::before {
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

      &::after {
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

      &:hover::after {
        opacity: 1;
      }

      &.empty-paragraph::before {
        display: none !important;
      }
    }
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

  &:hover {
    background: #f5f5f5;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
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
