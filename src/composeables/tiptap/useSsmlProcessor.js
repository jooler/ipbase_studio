import { ref } from 'vue'
import { useTts } from '../azure/useTts'

export function useSsmlProcessor(tiptapState = {}) {
  // 使用从外部传入的状态
  const selectionVoice = tiptapState.selectionVoice || ref(null)
  const selectionRate = tiptapState.selectionRate || ref(100)
  const selectionPitch = tiptapState.selectionPitch || ref(100)
  const selectionVolume = tiptapState.selectionVolume || ref(100)

  // 获取TTS相关数据
  const {
    selectedVoice,
    selectedLocale,
    volume,
    selectedRateValue,
    selectedPitchValue,
    setCustomPreviewText,
    ssmlContent,
    voiceList,
    reLocalName,
  } = useTts()

  // SSML output
  const ssmlOutput = ref('')

  // 添加显示成功提示的状态
  const successMessage = ref('')
  const showSuccessToast = ref(false)

  // 同步编辑器内容到SSML
  const syncSsml = (editor) => {
    if (!editor) return
    // Get editor content as JSON
    const editorJson = editor.getJSON()

    // Convert to SSML for API
    const ssml = convertToSsml(editorJson)
    ssmlOutput.value = ssml // 更新本地输出
    ssmlContent.value = ssml // 更新将发送给API的内容
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
          // 获取段落级别的属性（默认语音）
          const defaultVoice = selectedVoice.value?.value

          // 段落属性直接用于初始化prosody对象
          const paraRate = node.attrs?.rate || selectedRateValue.value
          const paraPitch = node.attrs?.pitch || selectedPitchValue.value
          const paraVolume = node.attrs?.volume || volume.value

          // 检查段落内容是否已包含voice标签
          let segmentedContent = ''

          // 处理段落内容
          if (node.content) {
            // 重构：使用更精确的语音分段处理

            // 记录当前的语音片段
            const segments = []
            let currentVoice = null
            let currentText = ''
            let currentProsody = {}

            // 用于调试
            console.log('开始处理段落内容:', JSON.stringify(node.content))

            // 第一次遍历，确定每个文本片段的属性
            for (const child of node.content) {
              if (child.type === 'text') {
                let text = child.text || ''

                // 转义特殊字符
                text = text
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;')

                let voiceValue = defaultVoice
                let prosodyAttrs = {
                  rate: paraRate,
                  pitch: paraPitch,
                  volume: paraVolume,
                }
                let pronunciation = null

                // 处理文本级别SSML属性
                if (child.marks?.length) {
                  const ssmlMark = child.marks.find((mark) => mark.type === 'ssml')
                  if (ssmlMark) {
                    // 提取语音属性
                    if (ssmlMark.attrs.voice) {
                      voiceValue = ssmlMark.attrs.voice
                    }

                    // 提取prosody属性
                    if (ssmlMark.attrs.rate && ssmlMark.attrs.rate !== 100) {
                      prosodyAttrs.rate = ssmlMark.attrs.rate
                    }

                    if (ssmlMark.attrs.pitch && ssmlMark.attrs.pitch !== 100) {
                      prosodyAttrs.pitch = ssmlMark.attrs.pitch
                    }

                    if (ssmlMark.attrs.volume && ssmlMark.attrs.volume !== 100) {
                      prosodyAttrs.volume = ssmlMark.attrs.volume
                    }

                    // 提取pronunciation属性
                    if (ssmlMark.attrs.pronunciation) {
                      pronunciation = ssmlMark.attrs.pronunciation
                    }
                  }
                }

                // 检查是否需要添加新的段落
                if (currentVoice !== voiceValue) {
                  // 如果有累积的文本，先保存当前段落
                  if (currentText) {
                    segments.push({
                      voice: currentVoice,
                      text: currentText,
                      prosody: { ...currentProsody },
                    })
                    currentText = ''
                  }

                  // 更新当前语音和prosody
                  currentVoice = voiceValue
                  currentProsody = { ...prosodyAttrs }
                } else if (JSON.stringify(currentProsody) !== JSON.stringify(prosodyAttrs)) {
                  // prosody变化也需要分段
                  if (currentText) {
                    segments.push({
                      voice: currentVoice,
                      text: currentText,
                      prosody: { ...currentProsody },
                    })
                    currentText = ''
                  }

                  currentProsody = { ...prosodyAttrs }
                }

                // 处理发音标注
                if (pronunciation) {
                  // SAPI格式中文拼音示例: <phoneme alphabet="sapi" ph="xing 2">行</phoneme>
                  text = `<phoneme alphabet="sapi" ph="${pronunciation}">${text}</phoneme>`
                }

                // 累积当前文本
                currentText += text
              } else if (child.type === 'ssmlBreak') {
                // 处理停顿
                const strength = child.attrs?.strength || 'medium'
                const breakTag = `<break strength="${strength}"/>`

                // 停顿标签按当前voice分组
                currentText += breakTag
              }
            }

            // 保存最后一个段落
            if (currentText) {
              segments.push({
                voice: currentVoice,
                text: currentText,
                prosody: currentProsody,
              })
            }

            console.log('分段结果:', segments)

            // 第二次遍历，生成最终的SSML内容
            // 优化逻辑：合并相同voice的连续段落到同一个voice标签中
            if (segments.length > 0) {
              // 按voice分组处理
              let currentVoiceGroup = []
              let currentVoice = null

              // 遍历所有分段，按voice分组
              for (let i = 0; i < segments.length; i++) {
                const segment = segments[i]

                // 如果是新的voice或是第一个段落
                if (segment.voice !== currentVoice) {
                  // 处理前一个voice组
                  if (currentVoiceGroup.length > 0) {
                    // 生成前一个voice组的内容
                    const voiceContent = generateVoiceGroupContent(currentVoiceGroup)
                    segmentedContent += `<voice name="${currentVoice}">${voiceContent}</voice>`
                    // 清空当前组
                    currentVoiceGroup = []
                  }

                  // 开始新的voice组
                  currentVoice = segment.voice
                }

                // 添加到当前voice组
                currentVoiceGroup.push(segment)
              }

              // 处理最后一个voice组
              if (currentVoiceGroup.length > 0) {
                const voiceContent = generateVoiceGroupContent(currentVoiceGroup)
                segmentedContent += `<voice name="${currentVoice}">${voiceContent}</voice>`
              }
            }

            // 辅助函数：为同一个voice组生成内部内容（包含多个prosody标签）
            function generateVoiceGroupContent(voiceGroup) {
              let content = ''
              for (const segment of voiceGroup) {
                // 应用prosody
                const prosodyAttrs = []

                if (segment.prosody.rate !== 100) {
                  const relativeRate =
                    segment.prosody.rate > 100
                      ? `+${segment.prosody.rate - 100}%`
                      : `-${100 - segment.prosody.rate}%`
                  prosodyAttrs.push(`rate="${relativeRate}"`)
                }

                if (segment.prosody.pitch !== 100) {
                  const relativePitch =
                    segment.prosody.pitch > 100
                      ? `+${segment.prosody.pitch - 100}%`
                      : `-${100 - segment.prosody.pitch}%`
                  prosodyAttrs.push(`pitch="${relativePitch}"`)
                }

                if (segment.prosody.volume !== 100) {
                  const volumeValue = Math.min(100, Math.max(0, segment.prosody.volume))
                  prosodyAttrs.push(`volume="${volumeValue}%"`)
                }

                // 如果有prosody属性，添加prosody标签，否则直接添加文本
                if (prosodyAttrs.length > 0) {
                  content += `<prosody ${prosodyAttrs.join(' ')}>${segment.text}</prosody>`
                } else {
                  content += segment.text
                }
              }
              return content
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

  // 根据语音ID获取语音名称
  const getVoiceLocalName = (voiceId) => {
    if (!voiceId || !voiceList.value) return null

    const voice = voiceList.value.find((v) => v.ShortName === voiceId)
    if (voice) {
      // 使用本地化的名称显示
      return reLocalName(voice.LocalName)
    }
    return null
  }

  // 应用语音
  const applyVoice = (editor, voiceValue) => {
    if (!editor) return

    // 获取当前选区
    const { from, to } = editor.state.selection

    // 获取语音的本地名称
    const voiceLocalName = getVoiceLocalName(voiceValue)

    // 确保只对选中的文本应用样式
    editor
      .chain()
      .focus()
      .setMark('ssml', {
        voice: voiceValue,
        voiceName: voiceLocalName, // 添加语音的本地名称
        rate: selectionRate.value,
        pitch: selectionPitch.value,
        volume: selectionVolume.value,
      })
      // 明确指定选区范围，确保只应用于选中文本
      .setTextSelection({ from, to })
      .run()

    // 记录debug信息
    console.log('应用语音属性于选区:', { from, to, voice: voiceValue, voiceName: voiceLocalName })
  }

  // 应用语速
  const applyRate = (editor, rate) => {
    if (!editor) return

    // 获取当前选区
    const { from, to } = editor.state.selection

    // 获取当前的SSML属性，包括voiceName
    const attrs = editor.getAttributes('ssml')
    const voiceId = selectionVoice.value?.value || null
    // 如果切换了语音，需要更新voiceName
    const voiceName = voiceId !== attrs.voice ? getVoiceLocalName(voiceId) : attrs.voiceName

    // 确保只对选中的文本应用样式
    editor
      .chain()
      .focus()
      .setMark('ssml', {
        voice: voiceId,
        voiceName: voiceName,
        rate: rate,
        pitch: selectionPitch.value,
        volume: selectionVolume.value,
        pronunciation: attrs.pronunciation || null,
      })
      // 明确指定选区范围，确保只应用于选中文本
      .setTextSelection({ from, to })
      .run()

    // 记录debug信息
    console.log('应用语速属性于选区:', { from, to, rate, voice: voiceId, voiceName })
  }

  // 应用音调
  const applyPitch = (editor, pitch) => {
    if (!editor) return

    // 获取当前选区
    const { from, to } = editor.state.selection

    // 获取当前的SSML属性，包括voiceName
    const attrs = editor.getAttributes('ssml')
    const voiceId = selectionVoice.value?.value || null
    // 如果切换了语音，需要更新voiceName
    const voiceName = voiceId !== attrs.voice ? getVoiceLocalName(voiceId) : attrs.voiceName

    // 确保只对选中的文本应用样式
    editor
      .chain()
      .focus()
      .setMark('ssml', {
        voice: voiceId,
        voiceName: voiceName,
        rate: selectionRate.value,
        pitch: pitch,
        volume: selectionVolume.value,
        pronunciation: attrs.pronunciation || null,
      })
      // 明确指定选区范围，确保只应用于选中文本
      .setTextSelection({ from, to })
      .run()

    // 记录debug信息
    console.log('应用音调属性于选区:', { from, to, pitch, voice: voiceId, voiceName })
  }

  // 应用音量
  const applyVolume = (editor, volume) => {
    if (!editor) return

    // 获取当前选区
    const { from, to } = editor.state.selection

    // 获取当前的SSML属性，包括voiceName
    const attrs = editor.getAttributes('ssml')
    const voiceId = selectionVoice.value?.value || null
    // 如果切换了语音，需要更新voiceName
    const voiceName = voiceId !== attrs.voice ? getVoiceLocalName(voiceId) : attrs.voiceName

    // 确保只对选中的文本应用样式
    editor
      .chain()
      .focus()
      .setMark('ssml', {
        voice: voiceId,
        voiceName: voiceName,
        rate: selectionRate.value,
        pitch: selectionPitch.value,
        volume: volume,
        pronunciation: attrs.pronunciation || null,
      })
      // 明确指定选区范围，确保只应用于选中文本
      .setTextSelection({ from, to })
      .run()

    // 记录debug信息
    console.log('应用音量属性于选区:', { from, to, volume, voice: voiceId, voiceName })
  }

  // 清除属性
  const clearAttributes = (editor) => {
    if (!editor) return

    // 获取选区
    const { from, to } = editor.state.selection

    // 检查是否存在ssml标记
    const ssmlMarks = editor.state.doc.rangeHasMark(from, to, editor.state.schema.marks.ssml)

    if (ssmlMarks) {
      // 移除所有ssml标记，只针对选中区域
      editor
        .chain()
        .focus()
        .unsetMark('ssml', { from, to })
        // 重新设置选区，确保只影响选中文本
        .setTextSelection({ from, to })
        .run()

      // 清除相关状态
      selectionVoice.value = null
      selectionRate.value = 100
      selectionPitch.value = 100
      selectionVolume.value = 100

      // 消息提示
      successMessage.value = '已清除样式'
      showSuccessToast.value = true
      setTimeout(() => {
        showSuccessToast.value = false
      }, 2000)

      // 记录调试信息
      console.log('清除了选区的SSML属性:', { from, to })
    }
  }

  // 插入停顿
  const insertOrUpdateBreak = (editor, strength) => {
    if (!editor) return

    // 获取当前编辑器选中内容
    const { selection } = editor.state
    const selectedNode = selection.node

    // 检查是否有选中节点且是停顿节点
    if (selectedNode && selectedNode.type.name === 'ssmlBreak') {
      // 更新现有停顿节点的强度
      editor
        .chain()
        .focus()
        .updateAttributes('ssmlBreak', {
          strength,
        })
        .run()
      return true
    } else {
      // 没有选中停顿节点或不在编辑停顿模式，插入新的停顿
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'ssmlBreak',
          attrs: {
            strength,
          },
        })
        .run()
      return false
    }
  }

  // 删除停顿
  const removeBreak = (editor) => {
    if (!editor) return

    // 获取当前选择
    const { from, to } = editor.state.selection

    // 尝试删除选中的节点
    editor.chain().focus().deleteRange({ from, to }).run()
    return true
  }

  // 设置选中的文本作为预览文本
  const setSelectedTextAsPreview = (editor) => {
    if (!editor) return

    const { from, to } = editor.state.selection
    if (from === to) return false // 没有选中文本

    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    if (selectedText.trim()) {
      console.log('设置预览文本:', selectedText.trim())
      setCustomPreviewText(selectedText.trim())

      // Clear any existing preview paragraphs
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes('paragraph', { ...node.attrs, isPreviewText: false })
            .run()
        }
      })

      // Find the paragraph containing this selection and mark it as preview text
      let $pos = editor.state.doc.resolve(from)
      let depth = $pos.depth
      while (depth > 0) {
        let node = $pos.node(depth)
        if (node.type.name === 'paragraph') {
          // Set the current paragraph as preview text
          const paragraphPos = $pos.before(depth)
          editor
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

      return true
    }

    return false
  }

  // 清除自定义预览文本
  const clearCustomPreviewText = (editor) => {
    if (!editor) return
    console.log('清除预览文本')
    setCustomPreviewText('')

    // Clear isPreviewText attribute from all paragraphs
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { ...node.attrs, isPreviewText: false })
          .run()
      }
    })

    // 显示提示消息
    successMessage.value = '已清除预览文本'
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 2000)
  }

  // 从段落设置预览文本
  const setPreviewTextFromParagraph = (editor, event) => {
    // 查找点击的段落
    const element = event.target.closest('p')
    if (!element) return

    if (!editor) return

    // 检查段落是否有文本内容
    const paragraphText = element.textContent.trim()
    if (!paragraphText) return // 如果段落没有文本内容，不执行任何操作

    // Check if this is the clear button click (paragraph with data-preview-text attribute)
    if (element.hasAttribute('data-preview-text')) {
      clearCustomPreviewText(editor)
      return
    }

    // 如果点击的是普通段落，设置为预览文本
    const fromPos = editor.view.posAtDOM(element, 0)

    // 设置预览文本
    setCustomPreviewText(paragraphText)

    // 清除所有已设置的预览文本段落
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs.isPreviewText) {
        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes('paragraph', { isPreviewText: false })
          .run()
      }
    })

    // 标记当前段落为预览文本
    editor
      .chain()
      .setNodeSelection(fromPos)
      .updateAttributes('paragraph', { isPreviewText: true })
      .run()

    // 消息提示
    successMessage.value = '已设置预览文本'
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 2000)
  }

  // 以编程方式聚焦编辑器
  const focusEditor = (editor) => {
    if (editor) {
      editor.commands.focus()
    }
  }

  return {
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
    clearCustomPreviewText,
    setPreviewTextFromParagraph,
    focusEditor,
  }
}
