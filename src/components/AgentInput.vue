<template>
  <q-card bordered style="width: 640px">
    <q-card-section class="row items-center">
      <div class="row items-center">
        <q-icon name="auto_awesome" size="md" color="primary" />
        <span class="q-ml-lg">生成配音稿</span>
      </div>
      <q-space />
      <q-btn flat round dense icon="help_outline">
        <q-tooltip class="no-padding">
          <q-card bordered>
            <q-card-section class="q-py-sm font-medium">
              <ul class="q-pl-md">
                <li>输入您想要生成的配音稿主题、风格、长度等要求</li>
                <li>AI将生成可直接朗读的纯文本配音稿，包含标点符号</li>
                <li>不会包含任何【语速】、【音效】等指导标记</li>
                <li>如需要特定朗读效果，请在确认后在配音文稿编辑器中进行调整</li>
              </ul>
            </q-card-section>
          </q-card>
        </q-tooltip>
      </q-btn>
    </q-card-section>
    <q-card-section class="q-pt-none">
      <q-input
        v-if="!content && !isStreaming"
        v-model="agentPrompt"
        label="请描述您需要的配音稿内容和风格"
        placeholder="例如：一段介绍人工智能在医疗领域应用的配音稿，时长约1分钟，风格专业但平易近人"
        filled
        type="textarea"
        autogrow
        :rows="3"
      />
      <div v-else class="q-pa-sm">
        <q-expansion-item
          v-if="streamReasoningContent || reasoningProcess"
          v-model="expansionState"
          :label="!content ? '正在思考...' : '思考过程'"
          dense
          class="thinking-process"
          @input="onExpansionChanged"
        >
          <q-card>
            <q-card-section>
              <!-- 使用vue-markdown-render显示推理过程 -->
              <q-scroll-area class="markdown-container article">
                <vue-markdown-render v-if="isStreaming" :source="formattedReasoningContent" />
                <vue-markdown-render v-else :source="reasoningProcess" class="markdown-content" />
                <q-spinner v-if="isStreaming && streamReasoningContent" color="grey" size="1em" />
              </q-scroll-area>
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <div class="text-body1 q-my-md">
          <!-- 流式输出最终内容 -->
          {{ isStreaming ? streamContent : content }}
          <q-spinner v-if="isStreaming" color="primary" size="1em" />
        </div>

        <div class="row justify-end q-mt-sm">
          <q-btn
            flat
            dense
            size="sm"
            icon="content_copy"
            @click="copyContent"
            :disable="isStreaming"
          >
            <q-tooltip>复制内容</q-tooltip>
          </q-btn>
          <q-btn flat dense size="sm" icon="clear" @click="clearContent" :disable="isStreaming">
            <q-tooltip>清除内容</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>
    <q-card-actions align="right" class="q-pa-sm">
      <q-btn flat label="取消" @click="cancel" :disable="isStreaming" v-close-popup />
      <q-space />
      <q-btn
        v-if="!streamContent && !formattedReasoningContent"
        label="生成"
        color="primary"
        @click="generateAgentPrompt"
        :loading="isLoading && !isStreaming"
        :disable="isStreaming"
      />
      <q-btn v-if="!isStreaming && content" color="primary" label="采纳" @click="acceptContent" />
    </q-card-actions>
  </q-card>
</template>
<script setup>
import { ref, watch, computed } from 'vue'
import { useOpenrouter } from 'src/composeables/openrouter'
import { useQuasar } from 'quasar'
import VueMarkdownRender from 'vue-markdown-render'

const $q = useQuasar()
const agentPrompt = ref('')
const content = ref('')
const useStream = ref(true)
const reasoningProcess = ref('')
const expansionState = ref(true)
const hasStartedGeneration = ref(false)

const {
  generateContent,
  generateContentStream,
  isLoading,
  isStreaming,
  streamContent,
  streamReasoningContent,
} = useOpenrouter('default', 'deepseek/deepseek-r1:free')

// 计算属性：格式化实时推理内容为Markdown
const formattedReasoningContent = computed(() => {
  return formatReasoningContentToMarkdown(streamReasoningContent.value)
})

const emit = defineEmits(['close', 'accept'])

const onExpansionChanged = (val) => {
  expansionState.value = val
}

// 监听streamContent，当内容达到一定长度时折叠推理面板
watch(streamContent, (newVal) => {
  if (newVal && newVal.length > 0) {
    if (!hasStartedGeneration.value) {
      hasStartedGeneration.value = true
    }

    if (newVal.length > 50) {
      expansionState.value = false
    }
  }
})

const cancel = () => {
  emit('close')
}

// 格式化推理内容为Markdown格式
const formatReasoningContentToMarkdown = (text) => {
  if (!text) return ''

  // 添加一个前缀，说明这是推理过程
  let formatted = ''

  // 处理推理内容，添加Markdown格式
  const lines = text.split(/[。.!！?？]/g).filter((line) => line.trim())

  if (lines.length > 0) {
    lines.forEach((line, index) => {
      if (line.trim()) {
        formatted += `${index + 1}. **${line.trim()}**。\n`
      }
    })
  }

  return formatted
}

// 格式化推理内容，使其更易读（用于非流式输出的最终结果）
const formatReasoningContent = (text) => {
  return formatReasoningContentToMarkdown(text)
}

const generateAgentPrompt = async () => {
  if (!agentPrompt.value.trim()) {
    $q.notify({
      type: 'warning',
      message: '请输入配音稿需求描述',
      timeout: 2000,
    })
    return
  }

  reasoningProcess.value = ''
  hasStartedGeneration.value = false
  expansionState.value = true

  try {
    if (useStream.value) {
      // 使用流式生成
      const result = await generateContentStream(agentPrompt.value, () => {
        // 回调函数不需要做额外处理，因为我们使用computed监听数据变化
      })

      content.value = result.content

      // 对于非流式处理，需要确保推理内容被格式化
      if (result.reasoningContent && !reasoningProcess.value) {
        reasoningProcess.value = formatReasoningContent(result.reasoningContent)
      }
    } else {
      // 使用普通方式生成
      content.value = await generateContent(agentPrompt.value)
      // 非流式模式下，生成完成后关闭对话框
      emit('close')
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `生成失败: ${err.message || '未知错误'}`,
      timeout: 3000,
    })
    console.error('生成配音稿出错:', err)
  }
}

const copyContent = () => {
  const textToCopy = isStreaming.value ? streamContent.value : content.value
  if (textToCopy) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        $q.notify({
          type: 'positive',
          message: '已复制到剪贴板',
          timeout: 1500,
        })
      })
      .catch((err) => {
        console.error('复制失败:', err)
        $q.notify({
          type: 'negative',
          message: '复制失败',
          timeout: 1500,
        })
      })
  }
}

const clearContent = () => {
  content.value = ''
  agentPrompt.value = ''
  reasoningProcess.value = ''
  hasStartedGeneration.value = false
}

const acceptContent = () => {
  emit('accept', content.value)
}
</script>
<style scoped>
.thinking-process {
  border-left: 2px solid #4d4d4d;
  padding-left: 10px;
}

.markdown-container {
  height: 300px;
}

.q-spinner {
  display: inline-block;
  vertical-align: middle;
  margin-left: 2px;
}
</style>
