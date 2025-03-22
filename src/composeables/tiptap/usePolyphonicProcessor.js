import { ref, computed } from 'vue'

export function usePolyphonicProcessor() {
  // 保存当前选中的文本
  const selectedText = ref('')
  // 保存多音字判断结果
  const polyphonicOptions = ref([])
  // 是否显示多音选项
  const showPolyphonicOptions = computed(
    () => polyphonicOptions.value && polyphonicOptions.value.length > 1,
  )

  // 检查单个汉字是否为多音字及其可能的读音
  // 使用 pinyin-pro 库，因为它支持获取多音字的所有读音
  const checkPolyphonic = async (text) => {
    // 验证参数：必须是单个中文字符
    if (!text || text.length !== 1 || !/[\u4e00-\u9fa5]/.test(text)) {
      console.log('不是单个中文字符，跳过多音字检查:', text)
      polyphonicOptions.value = []
      return false
    }

    console.log('检查中文字符是否为多音字:', text)

    try {
      // 动态导入 pinyin-pro 库，这样可以按需加载
      const { pinyin } = await import('pinyin-pro')

      // 获取多音字的所有读音 - 使用带声调符号的拼音
      const pinyinWithSymbol = pinyin(text, {
        multiple: true,
        type: 'array',
        toneType: 'symbol', // 带声调符号模式
      })

      // 获取多音字的不带声调的拼音
      const pinyinWithoutTone = pinyin(text, {
        multiple: true,
        type: 'array',
        toneType: 'none', // 不带声调模式
      })

      // 获取多音字的带数字声调的拼音
      const pinyinWithTone = pinyin(text, {
        multiple: true,
        type: 'array',
        toneType: 'num', // 数字声调模式 (如 hao3)
      })

      console.log('拼音结果:', {
        withSymbol: pinyinWithSymbol,
        withoutTone: pinyinWithoutTone,
        withNum: pinyinWithTone,
      })

      // 将多种格式组合，确保符合Azure文档要求
      const result = pinyinWithTone.map((item, index) => {
        // 从数字声调格式中获取声调数字
        // 确保有声调数字，如果没有默认为轻声(5)
        const tone = item && item.slice(-1) ? item.slice(-1) : '5'

        // 使用带声调符号的拼音作为显示标签，更直观
        // 如果没有声调符号拼音，回退到数字声调拼音，再回退到基本拼音
        const displayPinyin =
          (pinyinWithSymbol && pinyinWithSymbol[index]) ||
          (item && item.slice(0, -1)) ||
          (pinyinWithoutTone && pinyinWithoutTone[index]) ||
          `拼音${index + 1}`

        // 使用不带声调的拼音构建SAPI格式
        // 确保有基本拼音，如果没有使用前面的降级选项
        const basePinyin =
          (pinyinWithoutTone && pinyinWithoutTone[index]) ||
          (item && item.slice(0, -1)) ||
          displayPinyin

        // 修改格式：确保拼音和声调数字之间有空格
        // 将"xing2"格式改为"xing 2"格式，即拼音和数字之间添加空格
        const formattedPinyin = `${basePinyin} ${tone}`

        // 记录详细的调试信息
        console.log(`选项${index + 1}:`, {
          original: item,
          symbol: pinyinWithSymbol && pinyinWithSymbol[index],
          basePinyin: basePinyin,
          tone: tone,
          display: displayPinyin,
          formatted: formattedPinyin,
        })

        // 使用带声调符号的拼音作为显示，使用正确格式的数字声调作为值
        return {
          label: `${displayPinyin} (${tone}声)`, // 如 "xíng (2声)"
          value: formattedPinyin, // 如 "xing 2" - 注意空格
        }
      })

      polyphonicOptions.value = result
      selectedText.value = text

      // 调试输出
      console.log('多音字选项:', polyphonicOptions.value)

      return polyphonicOptions.value.length > 1
    } catch (error) {
      console.error('获取多音字读音失败:', error)
      polyphonicOptions.value = []
      return false
    }
  }

  // 应用选择的读音到编辑器 - 与其他SSML属性保持一致的应用方式
  const applyPronunciation = (editor, pronunciation) => {
    if (!editor || !pronunciation) return

    // 获取当前的SSML标记属性（如果有）
    const attrs = editor.getAttributes('ssml')

    // 获取当前选区
    const { from, to } = editor.state.selection

    // 记录应用发音
    console.log('应用发音:', {
      pronunciation,
      currentAttrs: attrs,
      selectionRange: { from, to },
    })

    // 应用标记，保留其他属性并添加pronunciation
    // 即使pronunciation与当前值相同，也强制应用以确保标记一定被设置
    editor
      .chain()
      .focus()
      .setMark('ssml', {
        ...attrs,
        pronunciation,
      })
      // 明确指定选区范围，确保只应用于选中文本
      .setTextSelection({ from, to })
      .run()

    // 记录成功应用标记
    console.log('发音标记已应用')
  }

  return {
    selectedText,
    polyphonicOptions,
    showPolyphonicOptions,
    checkPolyphonic,
    applyPronunciation,
  }
}
