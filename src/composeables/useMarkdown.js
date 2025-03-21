// import { schema } from "prosemirror-model"
// import { defaultMarkdownParser } from 'prosemirror-markdown'
import { marked } from 'marked'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { generateJSON } from '@tiptap/html'

export function useMarkdown() {
  const getJson = (markdownContent) => {
    // 初始化 Tiptap 编辑器
    const editor = new Editor({
      extensions: [StarterKit],
      content: '', // 初始为空
    })
    const htmlContent = marked(markdownContent)
    // 将 HTML 转换为 ProseMirror JSON
    return generateJSON(htmlContent, editor.extensionManager.extensions)
  }

  function isMarkdown(text) {
    const tokenTypes = new Set()
    marked(text, {
      walkTokens: (token) => tokenTypes.add(token.type),
    })
    // 检测是否存在 Markdown 特有 Token
    const markdownTokens = ['heading', 'list', 'code', 'link', 'image']
    return markdownTokens.some((t) => tokenTypes.has(t))
  }
  return {
    getJson,
    isMarkdown,
  }
}
