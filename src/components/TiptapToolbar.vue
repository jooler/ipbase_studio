<template>
  <q-card bordered class="toolbar-container q-mb-md">
    <q-toolbar v-if="hasTextSelection" class="transparent row gap-xs q-px-xs">
      <q-select
        :model-value="selectionVoice"
        @update:model-value="
          (val) => {
            $emit('update:selectionVoice', val)
            applyVoice(editor, val?.value)
          }
        "
        :options="voiceOptions"
        label="语音"
        dense
        options-dense
        filled
        square
        menu-anchor="bottom middle"
        menu-self="top middle"
        class="full-width radius-xs overflow-hidden border z-max"
        popup-content-class="radius-xs border q-pa-xs"
        style="min-width: 220px"
        :disable="!hasTextSelection"
      />
      <!-- 多音字发音选择下拉菜单 -->
      <q-select
        v-if="showPolyphonicOptions"
        :model-value="selectedPronunciation"
        @update:model-value="
          (val) => {
            $emit('update:selectedPronunciation', val)
            applyPronunciation(editor, val?.value)
          }
        "
        :options="polyphonicOptions"
        label="多音"
        dense
        options-dense
        filled
        menu-anchor="bottom middle"
        menu-self="top middle"
        option-label="label"
        option-value="value"
        class="full-width radius-xs overflow-hidden border"
        popup-content-class="radius-xs border q-pa-xs z-max"
        style="min-width: 160px"
        :disable="!hasTextSelection"
      />
    </q-toolbar>
    <q-card-section
      class="row no-wrap items-center gap-xs q-pa-xs"
      :class="{ 'border-top': hasTextSelection }"
    >
      <template v-if="hasTextSelection">
        <q-btn
          :color="activeControl === 'rate' ? 'primary' : void 0"
          @click="$emit('update:activeControl', activeControl === 'rate' ? null : 'rate')"
          icon="speed"
          unelevated
          :disable="!hasTextSelection"
        >
          <q-tooltip>语速</q-tooltip>
        </q-btn>
        <q-btn
          :color="activeControl === 'pitch' ? 'primary' : void 0"
          @click="$emit('update:activeControl', activeControl === 'pitch' ? null : 'pitch')"
          icon="tune"
          unelevated
          :disable="!hasTextSelection"
        >
          <q-tooltip>音调</q-tooltip>
        </q-btn>
        <q-btn
          :color="activeControl === 'volume' ? 'primary' : void 0"
          @click="$emit('update:activeControl', activeControl === 'volume' ? null : 'volume')"
          icon="volume_up"
          unelevated
          :disable="!hasTextSelection"
        >
          <q-tooltip>音量</q-tooltip>
        </q-btn>
      </template>
      <q-btn color="primary" icon="check" label="停顿">
        <q-menu>
          <q-list v-if="!hasTextSelection || isEditingBreak" dense class="column gap-xs">
            <q-item
              clickable
              class="radius-xs"
              :class="{ 'bg-primary text-white': currentBreakStrength === 'none' }"
              @click="insertOrUpdateBreak(editor, 'none')"
            >
              <q-item-section>无停顿</q-item-section>
            </q-item>
            <q-item
              clickable
              class="radius-xs"
              :class="{ 'bg-primary text-white': currentBreakStrength === 'x-weak' }"
              @click="insertOrUpdateBreak(editor, 'x-weak')"
            >
              <q-item-section>微弱停顿</q-item-section>
            </q-item>
            <q-item
              clickable
              class="radius-xs"
              :class="{ 'bg-primary text-white': currentBreakStrength === 'weak' }"
              @click="insertOrUpdateBreak(editor, 'weak')"
            >
              <q-item-section>轻微停顿</q-item-section>
            </q-item>
            <q-item
              clickable
              class="radius-xs"
              :class="{ 'bg-primary text-white': currentBreakStrength === 'medium' }"
              @click="insertOrUpdateBreak(editor, 'medium')"
            >
              <q-item-section>中等停顿</q-item-section>
            </q-item>
            <q-item
              clickable
              class="radius-xs"
              :class="{ 'bg-primary text-white': currentBreakStrength === 'strong' }"
              @click="insertOrUpdateBreak(editor, 'strong')"
            >
              <q-item-section>强停顿</q-item-section>
            </q-item>
            <q-item
              clickable
              class="radius-xs"
              :class="{ 'bg-primary text-white': currentBreakStrength === 'x-strong' }"
              @click="insertOrUpdateBreak(editor, 'x-strong')"
            >
              <q-item-section>超强停顿</q-item-section>
            </q-item>
            <q-item v-if="isEditingBreak" clickable class="radius-xs" @click="removeBreak(editor)">
              <q-item-section class="text-negative">删除停顿</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
      <q-space />
      <q-btn
        v-if="hasTextSelection"
        color="negative"
        flat
        @click="clearAttributes(editor)"
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
        :model-value="selectionRate"
        @update:model-value="
          (val) => {
            $emit('update:selectionRate', val)
            applyRate(editor, val)
          }
        "
        :min="50"
        :max="200"
        :step="5"
        label
        :label-value="'语速: ' + selectionRate + '%'"
        label-always
      />
      <q-slider
        v-if="activeControl === 'pitch'"
        :model-value="selectionPitch"
        @update:model-value="
          (val) => {
            $emit('update:selectionPitch', val)
            applyPitch(editor, val)
          }
        "
        :min="50"
        :max="150"
        :step="5"
        label
        :label-value="'音调: ' + selectionPitch + '%'"
        label-always
      />
      <q-slider
        v-if="activeControl === 'volume'"
        :model-value="selectionVolume"
        @update:model-value="
          (val) => {
            $emit('update:selectionVolume', val)
            applyVolume(editor, val)
          }
        "
        :min="0"
        :max="100"
        :step="5"
        label
        :label-value="'音量: ' + selectionVolume + '%'"
        label-always
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, watch } from 'vue'

// Props
const props = defineProps({
  editor: {
    type: Object,
    required: true,
  },
  selectionVoice: {
    type: Object,
    default: null,
  },
  selectionRate: {
    type: Number,
    default: 100,
  },
  selectionPitch: {
    type: Number,
    default: 100,
  },
  selectionVolume: {
    type: Number,
    default: 100,
  },
  activeControl: {
    type: String,
    default: null,
  },
  isEditingBreak: {
    type: Boolean,
    default: false,
  },
  isNodeSelection: {
    type: Boolean,
    default: false,
  },
  currentBreakStrength: {
    type: String,
    default: null,
  },
  voiceOptions: {
    type: Array,
    default: () => [],
  },
  // 多音字相关的Props
  showPolyphonicOptions: {
    type: Boolean,
    default: false,
  },
  polyphonicOptions: {
    type: Array,
    default: () => [],
  },
  selectedPronunciation: {
    type: Object,
    default: null,
  },
  // 方法相关props
  applyVoice: {
    type: Function,
    required: true,
  },
  applyRate: {
    type: Function,
    required: true,
  },
  applyPitch: {
    type: Function,
    required: true,
  },
  applyVolume: {
    type: Function,
    required: true,
  },
  clearAttributes: {
    type: Function,
    required: true,
  },
  insertOrUpdateBreak: {
    type: Function,
    required: true,
  },
  removeBreak: {
    type: Function,
    required: true,
  },
  setSelectedTextAsPreview: {
    type: Function,
    required: true,
  },
  applyPronunciation: {
    type: Function,
    required: true,
  },
  handlePolyphonicOptionClick: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'update:selectionVoice',
  'update:selectionRate',
  'update:selectionPitch',
  'update:selectionVolume',
  'update:activeControl',
  'update:selectedPronunciation',
  'check-polyphonic',
  'clear-polyphonic',
])

// Computed properties
const hasTextSelection = computed(() => {
  if (!props.editor) return false
  // 如果是节点选择模式（如停顿编辑），则返回false
  if (props.isNodeSelection) return false
  const { from, to } = props.editor.state.selection
  return from !== to
})

// 获取当前选中文本的发音属性
const currentPronunciation = computed(() => {
  if (!props.editor || !hasTextSelection.value) return null
  const attrs = props.editor.getAttributes('ssml')
  return attrs.pronunciation || null
})

// 监听选择变化，在有单个字符选中时检查是否为多音字
watch(
  () => props.editor?.state.selection,
  (newSelection) => {
    if (!newSelection || !hasTextSelection.value) return

    const { from, to } = newSelection

    // 获取选中的文本
    const selectedText = props.editor.state.doc.textBetween(from, to)

    // 只有当选中了单个字符，并且是中文字符时才检查多音字
    if (selectedText && selectedText.length === 1 && /[\u4e00-\u9fa5]/.test(selectedText)) {
      emit('check-polyphonic', selectedText)

      // 调试输出，帮助诊断选中的文本和当前的发音属性
      console.log('选中中文字符:', selectedText, '当前发音属性:', currentPronunciation.value)
    } else {
      // 如果选中的不是单个中文字符，清除多音字相关状态
      emit('clear-polyphonic')
    }
  },
  { deep: true },
)
</script>

<style lang="scss" scoped>
.toolbar-container {
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 20;
  transition: opacity 0.2s ease;
}
</style>
