import { ref } from 'vue'
import { Node, Mark, Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export function useTiptapHelpers() {
  // SSML attribute values for current selection
  const selectionVoice = ref(null)
  const selectionRate = ref(100)
  const selectionPitch = ref(100)
  const selectionVolume = ref(100)
  const activeControl = ref(null)

  // 编辑停顿相关状态
  const isEditingBreak = ref(false)
  const isNodeSelection = ref(false)
  const currentBreakStrength = ref(null)

  // 提示相关状态
  const showSuccessToast = ref(false)
  const successMessage = ref('')

  // 验证文档内容格式是否正确
  const validateTiptapDocument = (doc) => {
    // 如果不是对象或为null，则无效
    if (!doc || typeof doc !== 'object') return false

    // 验证基本结构
    if (!doc.type || doc.type !== 'doc') return false

    // 验证content数组
    if (!doc.content || !Array.isArray(doc.content)) return false

    // 递归验证所有节点
    return doc.content.every((node) => {
      // 所有节点必须有type
      if (!node.type) return false

      // 如果是段落节点，验证其内容
      if (node.type === 'paragraph') {
        // 段落可以没有内容或内容为空数组
        if (!node.content) return true
        if (!Array.isArray(node.content)) return false

        // 验证段落内的每个子节点
        return node.content.every((child) => !!child.type)
      }

      return true
    })
  }

  // 创建一个标准的Tiptap空文档结构
  const createEmptyDocument = () => {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    }
  }

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
        pronunciation: {
          default: null,
        },
        voiceName: {
          default: null,
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
              pronunciation: element.getAttribute('data-pronunciation') || null,
              voiceName: element.getAttribute('data-voice-name') || null,
            }
          },
        },
      ]
    },

    renderHTML({ HTMLAttributes }) {
      // 生成显示信息，按照语音、语速、音调、音量的顺序
      let ssmlInfo = ''

      // 1. 添加语音信息
      if (
        HTMLAttributes.voiceName &&
        HTMLAttributes.voiceName !== 'null' &&
        HTMLAttributes.voiceName !== ''
      ) {
        ssmlInfo = `演员：${HTMLAttributes.voiceName}，`
      }

      // 2. 添加语速信息
      if (HTMLAttributes.rate !== 100) {
        if (ssmlInfo) ssmlInfo += ' '
        ssmlInfo += `语速：${HTMLAttributes.rate}%，`
      }

      // 3. 添加音调信息
      if (HTMLAttributes.pitch !== 100) {
        if (ssmlInfo) ssmlInfo += ' '
        ssmlInfo += `音调：${HTMLAttributes.pitch}%，`
      }

      // 4. 添加音量信息
      if (HTMLAttributes.volume !== 100) {
        if (ssmlInfo) ssmlInfo += ' '
        ssmlInfo += `音量：${HTMLAttributes.volume}%`
      }

      return [
        'span',
        {
          'data-ssml': '',
          'data-voice': HTMLAttributes.voice,
          'data-voice-name': HTMLAttributes.voiceName || null,
          'data-rate': HTMLAttributes.rate !== 100 ? HTMLAttributes.rate : null,
          'data-pitch': HTMLAttributes.pitch !== 100 ? HTMLAttributes.pitch : null,
          'data-volume': HTMLAttributes.volume !== 100 ? HTMLAttributes.volume : null,
          'data-pronunciation': HTMLAttributes.pronunciation,
          'data-ssml-info': ssmlInfo,
        },
        0,
      ]
    },
  })

  // SSML Break 节点
  const SsmlBreak = Node.create({
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

  // 获取编辑器扩展
  const getEditorExtensions = (placeholder) => {
    return [
      StarterKit.configure({
        // Disable an included extension
        document: false,
        paragraph: false,
        text: false,
      }),
      Document,
      SsmlParagraph,
      Text,
      SsmlMark,
      SsmlBreak,
      Placeholder.configure({
        placeholder: placeholder || '请在此处输入文本内容...',
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-empty',
      }),
      EmptyParagraphDetector,
    ]
  }

  // Update attribute controls based on current selection
  const updateSelectionAttributes = (editor, voiceOptions) => {
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
        ? voiceOptions.value.find((option) => option.value === attrs.voice)
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

  // 添加一个计算属性，用于判断是否有文本被选中
  const hasTextSelection = (editor) => {
    if (!editor) return false

    // 如果是节点选择模式（如停顿编辑），则返回false
    if (isNodeSelection.value) return false

    const { from, to } = editor.state.selection
    return from !== to
  }

  // 设置编辑器事件处理
  const setupEditorEvents = (editor, handlers) => {
    if (!editor) return

    // 获取事件处理函数
    const { setPreviewTextFromParagraph = () => {}, handleBreakClick = () => {} } = handlers || {}

    // 使用事件委托为编辑器内的段落添加点击事件
    const editorElement = document.querySelector('.editor-content')
    if (editorElement) {
      editorElement.addEventListener('click', (event) => {
        // 处理段落预览按钮点击 - 仅当点击段落左侧区域(24px)时才触发
        const paragraph = event.target.closest('p')
        if (paragraph) {
          const rect = paragraph.getBoundingClientRect()
          const offsetX = event.clientX - rect.left

          // 只有点击在左侧24px区域内才触发预览文本设置
          if (offsetX <= 24) {
            // 确保不是在停顿图标上点击
            if (
              !event.target.closest('.ssml-break') &&
              !event.target.closest('[data-break-edit]')
            ) {
              setPreviewTextFromParagraph(editor, event)
            }
          }
        }

        // 检查点击的是否是停顿图标
        const breakElement =
          event.target.closest('.ssml-break') || event.target.closest('[data-break-edit]')
        if (breakElement) {
          isEditingBreak.value = true
          isNodeSelection.value = true // 标记为节点选择模式
          activeControl.value = 'break'

          // 需要聚焦编辑器并选中整个停顿节点
          if (editor) {
            try {
              // 获取停顿节点的DOM位置
              const pos = editor.view.posAtDOM(breakElement, 0)

              // 在位置处找到停顿节点
              let found = false
              editor.state.doc.nodesBetween(
                pos,
                pos + breakElement.textContent.length + 1,
                (node, nodePos) => {
                  if (!found && node.type.name === 'ssmlBreak') {
                    // 记录当前停顿强度
                    currentBreakStrength.value = node.attrs.strength

                    // 选中整个停顿节点
                    editor.chain().focus().setNodeSelection(nodePos).run()
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

          // 调用外部处理函数
          handleBreakClick(editor, breakElement)
        } else {
          // 如果点击的不是停顿图标，则退出停顿编辑模式
          isEditingBreak.value = false
          isNodeSelection.value = false // 重置节点选择状态
        }
      })
    }
  }

  // 监听jsonContent并更新编辑器内容
  const watchJsonContent = (jsonContent, editor, handlers = {}) => {
    if (!editor || !jsonContent) return

    const {
      onIsEmpty = () => {},
      updateSsmlOutput = () => {},
      updateSsmlContent = () => {},
    } = handlers

    // 执行具体的监听逻辑
    const handleJsonContentChange = () => {
      if (!editor) return
      console.log('jsonContent.value', jsonContent.value)

      // Check if content actually changed to avoid loops
      const currentContent = editor.getJSON()

      // 检查jsonContent是否为空或为空对象或无效格式
      if (
        !jsonContent.value ||
        (typeof jsonContent.value === 'object' && Object.keys(jsonContent.value).length === 0) ||
        !validateTiptapDocument(jsonContent.value)
      ) {
        // 设置为Tiptap初始文档结构
        const initialContent = createEmptyDocument()
        editor.commands.setContent(initialContent)
        updateSsmlOutput(null)
        updateSsmlContent(null)
        return
      } else {
        if (JSON.stringify(currentContent) !== JSON.stringify(jsonContent.value)) {
          try {
            editor.commands.setContent(jsonContent.value)
            const ssml = handlers.convertToSsml ? handlers.convertToSsml(jsonContent.value) : null
            updateSsmlOutput(ssml)
            updateSsmlContent(ssml)
          } catch (err) {
            console.error('设置编辑器内容时出错:', err)
            // 出错时设置为初始内容
            editor.commands.setContent(createEmptyDocument())
          }
        }
      }
      onIsEmpty(editor.isEmpty)
    }

    return handleJsonContentChange
  }

  // 清除所有SSML标记属性
  const clearAttributes = (editor) => {
    if (!editor) return

    // 创建新的属性，将所有值设为null
    const newAttrs = {
      voice: null,
      rate: null,
      pitch: null,
      volume: null,
      pronunciation: null,
    }

    // 应用新属性
    editor.chain().focus().setMark('ssml', newAttrs).run()
  }

  return {
    // 状态
    selectionVoice,
    selectionRate,
    selectionPitch,
    selectionVolume,
    activeControl,
    isEditingBreak,
    isNodeSelection,
    currentBreakStrength,
    showSuccessToast,
    successMessage,

    // 工具函数
    validateTiptapDocument,
    createEmptyDocument,
    updateSelectionAttributes,
    shouldShowBubbleMenu,
    hasTextSelection,
    setupEditorEvents,
    watchJsonContent,
    clearAttributes,

    // 扩展
    getEditorExtensions,
    SsmlParagraph,
    SsmlMark,
    SsmlBreak,
    EmptyParagraphDetector,
  }
}
