<template>
  <div class="q-space column no-wrap text-white">
    <q-scroll-area v-if="fileManagerStore.root.length > 0" class="q-space">
      <q-tree
        ref="treeRef"
        :nodes="fileManagerStore.root"
        node-key="id"
        text-color="white"
        selected-color="deep-orange"
        v-model:selected="fileManagerStore.selected"
        v-model:expanded="fileManagerStore.expanded"
      >
        <template v-slot:default-header="prop">
          <div class="row items-center full-width" @click="readFile(prop.node.path)">
            <q-icon :name="prop.node.icon || 'share'" color="orange" size="28px" class="q-mr-sm" />
            <div>{{ prop.node.label }}</div>
            <q-popup-proxy
              ref="contextMenuRef"
              context-menu
              class="shadow-24 radius-sm"
              @hide="contextMenuHide()"
            >
              <q-list bordered dense class="q-pa-xs radius-sm" style="min-width: 12rem">
                <template v-if="prop.node.isDirectory && !renameNode && !createInNode">
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="showCreate(prop.node, 'file')"
                  >
                    <q-item-section side>
                      <q-icon name="edit_note" />
                    </q-item-section>
                    <q-item-section>新建文件</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    class="radius-xs"
                    @click="showCreate(prop.node, 'directory')"
                  >
                    <q-item-section side>
                      <q-icon name="create_new_folder" />
                    </q-item-section>
                    <q-item-section>新建文件夹</q-item-section>
                  </q-item>
                  <q-separator class="op-5 q-my-xs" />
                </template>
                <q-item
                  v-if="createInNode === prop.node.id"
                  class="no-padding overflow-hidden radius-xs"
                >
                  <q-item-section>
                    <q-input
                      v-model="inputText"
                      type="text"
                      autofocus
                      dense
                      filled
                      @keydown.enter="create(prop.node, inputText)"
                    >
                      <template v-if="hasSameName(prop.node, inputText)" v-slot:hint>
                        存在同名！
                      </template>
                    </q-input>
                  </q-item-section>
                </q-item>
                <q-item
                  v-if="renameNode !== prop.node.id"
                  clickable
                  v-close-popup
                  class="radius-xs"
                  @click="showRename(prop)"
                >
                  <q-item-section side>
                    <i class="q-icon text-brand-primary" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H17.5C16.95,22 16,21.55 16,21C16,21.55 15.05,22 14.5,22H12V20H14A1,1 0 0,0 15,19V5A1,1 0 0,0 14,4H12V2H14.5C15.05,2 16,2.45 16,3C16,2.45 16.95,2 17.5,2H20V4H18A1,1 0 0,0 17,5V7M2,7H13V9H4V15H13V17H2V7M20,15V9H17V15H20Z"
                        ></path>
                      </svg>
                    </i>
                  </q-item-section>
                  <q-item-section>重命名</q-item-section>
                </q-item>
                <q-item v-else class="no-padding overflow-hidden radius-xs">
                  <q-item-section>
                    <q-input
                      v-model="inputText"
                      type="text"
                      autofocus
                      dense
                      filled
                      @keydown.enter="rename(prop.node, inputText)"
                    >
                      <template v-if="hasSameName(prop.node, inputText)" v-slot:hint>
                        存在同名！
                      </template>
                    </q-input>
                  </q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  class="radius-xs"
                  @click="openInExplorer(prop.node)"
                >
                  <q-item-section side>
                    <q-icon name="folder_open" />
                  </q-item-section>
                  <q-item-section>
                    <template v-if="isMac">在Finder中打开</template>
                    <template v-else-if="isLinux">在文件管理器中打开</template>
                    <template v-else>在资源管理器中打开</template>
                  </q-item-section>
                </q-item>
                <q-separator class="op-5 q-my-xs" />
                <q-item
                  v-if="!prop.node.parentId"
                  clickable
                  v-close-popup
                  class="radius-xs text-warning"
                  @click="removeFromRoot(prop.node)"
                >
                  <q-item-section side>
                    <q-icon name="mdi-link-off" color="warning" />
                  </q-item-section>
                  <q-item-section>从列表中移除</q-item-section>
                </q-item>
                <q-item
                  v-if="prop.node.parentId"
                  clickable
                  v-close-popup
                  class="radius-xs text-negative"
                  @click="deleteItem(prop.node)"
                >
                  <q-item-section side>
                    <q-icon name="close" color="negative" />
                  </q-item-section>
                  <q-item-section>删除</q-item-section>
                </q-item>
              </q-list>
            </q-popup-proxy>
          </div>
        </template>
      </q-tree>
    </q-scroll-area>

    <div class="q-pa-sm">
      <q-btn
        unelevated
        icon="mdi-file-tree"
        label="选择文件夹"
        class="full-width unhover-op-5 border transition"
        @click="chooseDir()"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, useTemplateRef, watch, onUnmounted, onMounted } from 'vue'
import { uid, useQuasar } from 'quasar'

import { useTts } from 'src/composeables/azure/useTts'
import { useMarkdown } from 'src/composeables/useMarkdown'
import { pathUtils } from 'src/utils/environment'
import { useFileManagerStore } from 'src/stores/fileManager'

const $q = useQuasar()

const { jsonContent, currentFile } = useTts()
const { isMarkdown, getJson } = useMarkdown()

// 使用导入的pathUtils替代之前的自定义path对象
// 优先使用Electron提供的path函数
const path = {
  basename: window.fileSystemAPI?.basename || pathUtils.basename,
  dirname: window.fileSystemAPI?.dirname || pathUtils.dirname,
  join: window.fileSystemAPI?.join || pathUtils.join,
}

// 使用文件管理器的Store
const fileManagerStore = useFileManagerStore()
const contextMenuRef = useTemplateRef('contextMenuRef')

// 文件监视器
let fileCheckInterval = null

// 平台信息
const isMac = fileManagerStore.isMac
const isWindows = fileManagerStore.isWindows
const isLinux = fileManagerStore.isLinux

// 在组件加载时初始化
onMounted(async () => {
  // 只初始化一次，避免重复加载同一目录
  if (fileManagerStore.root.length === 0) {
    try {
      await fileManagerStore.initialize()
    } catch (error) {
      console.error('Error during initialization:', error)
      $q.notify({
        type: 'negative',
        message: '初始化文件管理器失败',
        timeout: 3000,
      })
    }
  }
})

// 监视当前文件是否被删除
watch(
  () => currentFile.value,
  (newVal) => {
    // 清除之前的监视器
    if (fileCheckInterval) {
      clearInterval(fileCheckInterval)
      fileCheckInterval = null
    }

    // 如果有当前文件且在Electron环境中，开始监视文件
    if (newVal && newVal.path && window.fileSystemAPI) {
      fileCheckInterval = setInterval(async () => {
        // 检查文件是否仍然存在
        const exists = await window.fileSystemAPI.fileExists(newVal.path)
        if (!exists) {
          // 文件不存在了，清除当前文件和编辑器内容
          console.warn('Current file has been deleted:', newVal.path)
          currentFile.value = null
          jsonContent.value = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }],
          }
          $q.notify({
            type: 'warning',
            message: '当前文件已被删除或移动',
            position: 'top',
          })
          // 清除监视器
          clearInterval(fileCheckInterval)
          fileCheckInterval = null
        }
      }, 2000) // 每2秒检查一次
    }
  },
  { immediate: true },
)

// 组件卸载时清除监视器
onUnmounted(() => {
  if (fileCheckInterval) {
    clearInterval(fileCheckInterval)
    fileCheckInterval = null
  }
})

const chooseDir = async () => {
  try {
    const dirPath = await window.fileSystemAPI.chooseDirectory()
    if (!dirPath) return

    console.log('Selected directory:', dirPath)
    console.log('Path utils:', path)

    // 确保pathUtils有所有必要的方法
    if (!path || !path.basename || !path.dirname || !path.join) {
      console.error('Path utils is invalid:', path)
      $q.notify({
        type: 'negative',
        message: '文件路径处理工具不可用',
      })
      return
    }

    // 检查是否已经加载了该目录
    const alreadyLoaded = fileManagerStore.root.some((node) => node.path === dirPath)
    if (alreadyLoaded) {
      console.log('Directory already loaded:', dirPath)
      $q.notify({
        type: 'info',
        message: '该文件夹已经在列表中',
        timeout: 2000,
      })
      return
    }

    // 处理选中的目录
    const node = await fileManagerStore.processDirectory(dirPath, null, path)
    console.log('Processed directory node:', node)

    fileManagerStore.root.push(node)

    // 展开新添加的节点
    fileManagerStore.expanded.push(node.id)

    // 保存到localStorage
    fileManagerStore.saveOpenedDirs()

    $q.notify({
      type: 'positive',
      message: '已添加文件夹: ' + path.basename(dirPath),
      timeout: 2000,
    })
  } catch (error) {
    console.error('Error choosing directory:', error)
    $q.notify({
      type: 'negative',
      message: '选择文件夹失败: ' + error.message,
    })
  }
}

// 保存当前打开的文件夹列表到localStorage方法直接用store里的
const saveOpenedDirs = fileManagerStore.saveOpenedDirs

const readFile = async (filePath) => {
  if (!filePath) return

  try {
    const stats = await window.fileSystemAPI.getStats(filePath)
    if (!stats.isFile) return // 是目录则不处理

    currentFile.value = {
      id: uid(),
      name: path.basename(filePath),
      path: filePath,
    }

    const content = await window.fileSystemAPI.readFile(filePath)
    if (!content) {
      jsonContent.value = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      }
      return
    }

    if (isMarkdown(content) || filePath.endsWith('.md')) {
      jsonContent.value = getJson(content)
      return
    }

    try {
      const parsedContent = JSON.parse(content)
      // 验证是否是有效的Tiptap文档格式
      if (!parsedContent || !parsedContent.type || parsedContent.type !== 'doc') {
        // 如果不是有效的Tiptap文档，创建一个标准的空文档结构
        jsonContent.value = {
          type: 'doc',
          content: [{ type: 'paragraph', content: [] }],
        }
      } else {
        jsonContent.value = parsedContent
      }
    } catch (e) {
      console.warn('不是JSON字符串或格式不正确：', e)
      // 创建一个新的空文档
      jsonContent.value = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      }
    }
  } catch (error) {
    console.error('Error reading file:', error)
    $q.notify({
      type: 'negative',
      message: '读取文件失败: ' + error.message,
    })
  }
}

const createFile = async (node, name) => {
  // 如果没有添加.json后缀，自动添加
  if (!name.endsWith('.json') && !name.endsWith('.md')) {
    name += '.json'
  }

  if (hasSameName(node, name)) {
    $q.notify({
      message: '存在同名，请修改名称再新建！',
    })
    return
  }

  try {
    const filePath = await window.fileSystemAPI.createFile(node.path, name)

    // 如果是JSON文件，初始化为空的Tiptap文档结构
    if (name.endsWith('.json')) {
      const emptyDocument = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      })
      await window.fileSystemAPI.writeFile(filePath, emptyDocument)
    }

    if (node.children) {
      const newNode = {
        id: uid(),
        label: name,
        path: filePath,
        icon: name.endsWith('.md') ? 'mdi-language-markdown' : 'mdi-code-json',
        isDirectory: false,
        parentId: node.id,
      }
      node.children.push(newNode)
      fileManagerStore.nodeMap.value[newNode.id] = newNode
    }
  } catch (error) {
    console.error('Error creating file:', error)
    $q.notify({
      type: 'negative',
      message: '创建文件失败: ' + error.message,
    })
  }
}

const createDirectory = async (node, name) => {
  if (hasSameName(node, name)) {
    $q.notify({
      message: '存在同名，请修改名称再新建！',
    })
    return
  }

  try {
    const dirPath = await window.fileSystemAPI.createDirectory(node.path, name)
    if (node.children) {
      const newNode = {
        id: uid(),
        label: name,
        path: dirPath,
        icon: 'mdi-folder',
        isDirectory: true,
        parentId: node.id,
        children: [],
      }
      node.children.push(newNode)
      fileManagerStore.nodeMap.value[newNode.id] = newNode
    }
  } catch (error) {
    console.error('Error creating directory:', error)
    $q.notify({
      type: 'negative',
      message: '创建文件夹失败: ' + error.message,
    })
  }
}

const deleteItem = async (node) => {
  try {
    await window.fileSystemAPI.deleteItem(node.path)

    if (node.parentId) {
      // 如果是子节点，从父节点的children中删除
      const parentNode = fileManagerStore.nodeMap.value[node.parentId]
      if (parentNode) {
        parentNode.children = parentNode.children.filter((child) => child.id !== node.id)
      }
    } else {
      // 如果是根节点，从root数组中删除
      fileManagerStore.root.value = fileManagerStore.root.value.filter(
        (item) => item.id !== node.id,
      )
      // 更新保存的文件夹列表
      saveOpenedDirs()
    }

    // 从nodeMap中删除节点
    delete fileManagerStore.nodeMap.value[node.id]

    $q.notify({
      message: `已删除 ${node.label}`,
      color: 'positive',
    })
  } catch (error) {
    console.error('Error deleting item:', error)
    $q.notify({
      message: `删除失败: ${error.message}`,
      color: 'negative',
    })
  }
}

const hasSameName = (node, val) => {
  if (!node.children) return false
  return node.children.some((child) => child.label === val)
}

const renameNode = ref()
const createInNode = ref()
const createType = ref()
const showCreate = (node, type) => {
  createInNode.value = node.id
  createType.value = type
}

const create = async (node, name) => {
  if (createType.value === 'file') {
    await createFile(node, name)
  } else {
    await createDirectory(node, name)
  }
  contextMenuHide()
}

const inputText = ref('')
const showRename = (prop) => {
  renameNode.value = prop.node.id
  inputText.value = prop.node.label
}

const rename = async (node, newName) => {
  if (!node || !newName) {
    return
  }

  try {
    const dirPath = path.dirname(node.path)
    const newPath = path.join(dirPath, newName)

    // 使用fileSystemAPI重命名
    await window.fileSystemAPI.renameItem(node.path, newPath)

    // 更新节点信息
    node.label = newName
    node.path = newPath

    // 如果是根节点，需要更新localStorage
    if (!node.parentId) {
      saveOpenedDirs()
    }

    $q.notify({
      message: `重命名成功: ${newName}`,
      color: 'positive',
    })
  } catch (error) {
    console.error('Error renaming item:', error)
    $q.notify({
      message: `重命名失败: ${error.message}`,
      color: 'negative',
    })
  }

  contextMenuRef.value?.hide()
}

const contextMenuHide = () => {
  renameNode.value = void 0
  createInNode.value = void 0
  inputText.value = ''
  createType.value = ''
}

// 在文件管理器中打开
const openInExplorer = async (node) => {
  try {
    await window.fileSystemAPI.openInExplorer(node.path)
  } catch (error) {
    console.error('Error opening in file manager:', error)

    // 根据不同平台显示不同的错误消息
    let errorMessage = '打开失败: ' + error.message
    if (isWindows.value) {
      errorMessage = '无法在资源管理器中打开: ' + error.message
    } else if (isMac.value) {
      errorMessage = '无法在Finder中打开: ' + error.message
    } else if (isLinux.value) {
      errorMessage = '无法在文件管理器中打开: ' + error.message
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
    })
  }
}

// 从根节点移除目录，但不删除文件
const removeFromRoot = (node) => {
  // 从根节点数组中移除
  fileManagerStore.root.value = fileManagerStore.root.value.filter((item) => item.id !== node.id)

  // 从nodeMap中删除所有相关节点(递归清除)
  const removeFromNodeMap = (nodeId) => {
    const node = fileManagerStore.nodeMap.value[nodeId]
    if (node) {
      // 如果有子节点，递归删除
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          removeFromNodeMap(child.id)
        }
      }
      // 从nodeMap中删除当前节点
      delete fileManagerStore.nodeMap.value[nodeId]
    }
  }
  removeFromNodeMap(node.id)

  // 更新localStorage中的文件夹列表
  saveOpenedDirs()

  $q.notify({
    message: `已从列表中移除 ${node.label}`,
    color: 'info',
  })
}
</script>
