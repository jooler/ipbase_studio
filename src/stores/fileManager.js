import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref } from 'vue'
import { uid } from 'quasar'

export const useFileManagerStore = defineStore('fileManager', () => {
  // 存储文件系统根节点
  const root = ref([])
  // 存储节点映射表
  const nodeMap = ref({})
  // 存储已展开的节点
  const expanded = ref([])
  // 存储当前选中的节点
  const selected = ref(null)
  // 平台信息
  const platform = ref(null)
  const isMac = ref(false)
  const isWindows = ref(false)
  const isLinux = ref(false)

  // 初始化文件管理器
  const initialize = async () => {
    try {
      if (!window.fileSystemAPI) {
        console.warn('fileSystemAPI not available')
        return
      }

      // 获取平台信息
      platform.value = window.fileSystemAPI.platform
      isMac.value = window.fileSystemAPI.isMac
      isWindows.value = window.fileSystemAPI.isWindows
      isLinux.value = window.fileSystemAPI.isLinux

      // 确保path方法可用
      if (
        !window.fileSystemAPI.basename ||
        !window.fileSystemAPI.dirname ||
        !window.fileSystemAPI.join
      ) {
        console.error('Path utilities not available in fileSystemAPI')
        return
      }

      // 清理不存在的目录
      await cleanupNonExistentDirs()

      // 创建pathUtils对象一次，以便重用
      const pathUtils = {
        basename: window.fileSystemAPI.basename,
        dirname: window.fileSystemAPI.dirname,
        join: window.fileSystemAPI.join,
      }

      // 如果已经有加载的目录，则无需再次加载
      if (root.value.length > 0) {
        return
      }

      // 从localStorage加载上次打开的文件夹列表
      const lastOpenedDirs = JSON.parse(localStorage.getItem('lastOpenedDirs') || '[]')

      // 如果有保存的文件夹，则尝试打开它们
      for (const dirPath of lastOpenedDirs) {
        try {
          // 检查是否已经加载了该目录
          const alreadyLoaded = root.value.some((node) => node.path === dirPath)
          if (alreadyLoaded) {
            continue
          }

          const exists = await window.fileSystemAPI.exists(dirPath)
          if (exists) {
            // 如果文件夹仍然存在，添加到根节点
            const node = await processDirectory(dirPath, null, pathUtils)
            root.value.push(node)
            // 展开加载的节点
            expanded.value.push(node.id)
          }
        } catch (error) {
          console.warn('Failed to load directory:', dirPath, error)
        }
      }
    } catch (error) {
      console.error('Error initializing fileManagerStore:', error)
    }
  }

  // 保存当前打开的文件夹列表到localStorage
  const saveOpenedDirs = () => {
    const dirs = root.value.map((node) => node.path)
    localStorage.setItem('lastOpenedDirs', JSON.stringify(dirs))
  }

  // 清理不存在的目录
  const cleanupNonExistentDirs = async () => {
    if (!window.fileSystemAPI) return

    // 获取当前保存的目录列表
    const lastOpenedDirs = JSON.parse(localStorage.getItem('lastOpenedDirs') || '[]')

    // 过滤掉不存在的目录
    const existingDirs = []
    for (const dirPath of lastOpenedDirs) {
      try {
        const exists = await window.fileSystemAPI.exists(dirPath)
        if (exists) {
          existingDirs.push(dirPath)
        }
      } catch (error) {
        console.warn('Error checking if directory exists:', dirPath, error)
      }
    }

    // 如果有些目录不存在了，更新localStorage
    if (existingDirs.length !== lastOpenedDirs.length) {
      localStorage.setItem('lastOpenedDirs', JSON.stringify(existingDirs))
    }
  }

  // 处理目录结构
  const processDirectory = async (dirPath, parentId = null, path) => {
    try {
      const entries = await window.fileSystemAPI.readDirectory(dirPath)

      const node = {
        id: uid(),
        label: path.basename(dirPath),
        path: dirPath,
        icon: 'mdi-folder',
        isDirectory: true,
        parentId,
        children: [],
      }

      // 存储到映射表以便快速查找
      nodeMap.value[node.id] = node

      // 处理目录下的所有条目
      for (const entry of entries) {
        try {
          if (entry.isDirectory) {
            const childNode = await processDirectory(entry.path, node.id, path)
            node.children.push(childNode)
          } else {
            // 只显示JSON和Markdown文件
            if (entry.name.endsWith('.json') || entry.name.endsWith('.md')) {
              const fileNode = {
                id: uid(),
                label: entry.name,
                path: entry.path,
                icon: entry.name.endsWith('.md') ? 'mdi-language-markdown' : 'mdi-code-json',
                isDirectory: false,
                parentId: node.id,
              }
              nodeMap.value[fileNode.id] = fileNode
              node.children.push(fileNode)
            }
          }
        } catch (entryError) {
          console.error('Error processing entry:', entry.path, entryError)
        }
      }
      return node
    } catch (error) {
      console.error('Error in processDirectory for path:', dirPath, error)
      // Return a minimal node to prevent initialization from breaking
      return {
        id: uid(),
        label: path ? path.basename(dirPath) : 'Error loading',
        path: dirPath,
        icon: 'mdi-folder-alert',
        isDirectory: true,
        parentId,
        children: [],
        error: error.message,
      }
    }
  }

  return {
    root,
    nodeMap,
    expanded,
    selected,
    platform,
    isMac,
    isWindows,
    isLinux,
    initialize,
    saveOpenedDirs,
    processDirectory,
    cleanupNonExistentDirs,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFileManagerStore, import.meta.hot))
}
