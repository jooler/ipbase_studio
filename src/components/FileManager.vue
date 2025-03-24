<template>
  <q-scroll-area class="q-space column no-wrap text-white q-px-sm">
    <div v-if="root.length === 0" class="q-pa-sm">
      <q-btn unelevated icon="mdi-file-tree" label="选择文件夹" class="full-width unhover-op-5 border transition"
        @click="chooseDir()" />
    </div>
    <q-tree v-else ref="treeRef" :nodes="root" dense node-key="id" text-color="white" selected-color="deep-orange"
      v-model:selected="selected" v-model:expanded="expanded">
      <template v-slot:default-header="prop">
        <div class="row full-width no-wrap" @click="readFile(prop.node.handle)">
          <q-icon :name="prop.node.icon || 'share'" color="orange" size="18px" class="q-mr-sm" />
          <div>{{ prop.node.label }}</div>
          <q-popup-proxy ref="contextMenuRef" context-menu class="shadow-24 radius-sm" @hide="contextMenuHide()">
            <q-list bordered dense class="q-pa-xs radius-sm" style="min-width: 12rem">
              <template v-if="prop.node.handle.kind === 'directory' && !renameNode && !createInNode">
                <q-item clickable v-close-popup class="radius-xs" @click="showCreate(prop.node, 'file')">
                  <q-item-section side>
                    <q-icon name="edit_note" />
                  </q-item-section>
                  <q-item-section>新建文件</q-item-section>
                </q-item>
                <q-item clickable v-close-popup class="radius-xs" @click="showCreate(prop.node, 'directory')">
                  <q-item-section side>
                    <q-icon name="create_new_folder" />
                  </q-item-section>
                  <q-item-section>新建文件夹</q-item-section>
                </q-item>
                <q-separator class="op-5 q-my-xs" />
              </template>
              <q-item v-if="createInNode === prop.node.id" class="no-padding overflow-hidden radius-xs">
                <q-item-section>
                  <q-input v-model="inputText" type="text" autofocus dense filled
                    @keydown.enter="create(prop.node, inputText)">
                    <template v-if="hasSameName(prop.node, inputText)" v-slot:hint>
                      存在同名！
                    </template>
                  </q-input>
                </q-item-section>
              </q-item>
              <q-item v-if="renameNode !== prop.node.id" clickable v-close-popup class="radius-xs"
                @click="showRename(prop)">
                <q-item-section side>
                  <i class="q-icon text-brand-primary" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H17.5C16.95,22 16,21.55 16,21C16,21.55 15.05,22 14.5,22H12V20H14A1,1 0 0,0 15,19V5A1,1 0 0,0 14,4H12V2H14.5C15.05,2 16,2.45 16,3C16,2.45 16.95,2 17.5,2H20V4H18A1,1 0 0,0 17,5V7M2,7H13V9H4V15H13V17H2V7M20,15V9H17V15H20Z">
                      </path>
                    </svg>
                  </i>
                </q-item-section>
                <q-item-section>重命名</q-item-section>
              </q-item>
              <q-item v-else class="no-padding overflow-hidden radius-xs">
                <q-item-section>
                  <q-input v-model="inputText" type="text" autofocus dense filled
                    @keydown.enter="rename(prop.node, inputText)">
                    <template v-if="hasSameName(prop.node, inputText)" v-slot:hint>
                      存在同名！
                    </template>
                  </q-input>
                </q-item-section>
              </q-item>
              <q-separator class="op-5 q-my-xs" />
              <q-item v-if="prop.node.parentTree" clickable v-close-popup class="radius-xs text-negative"
                @click="deleteItem(prop.node)">
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
    <q-popup-proxy context-menu v-if="root.length > 0">
      <q-list bordered class="radius-sm q-pa-xs">
        <q-item clickable v-ripple class="radius-xs" v-close-popup @click="refreshFileTree">
          <q-item-section avatar>
            <q-icon color="primary" name="refresh" />
          </q-item-section>
          <q-item-section class="q-pr-md">刷新</q-item-section>
        </q-item>
      </q-list>
    </q-popup-proxy>
    <q-inner-loading :showing="refreshing">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-scroll-area>
</template>

<script setup>
  import { ref, useTemplateRef, watch, onUnmounted, onMounted } from 'vue'
  import { uid, useQuasar } from 'quasar'

  import { useTts } from 'src/composeables/azure/useTts'
  import { useMarkdown } from 'src/composeables/useMarkdown'
  import { useFileManager } from 'src/composeables/useFileManager'

  const { chooseHandle } = useFileManager()

  const $q = useQuasar()

  const { jsonContent, currentFile } = useTts()
  const { isMarkdown, getJson } = useMarkdown()

  const root = ref([])
  const nodeMap = ref([])
  const treeRef = useTemplateRef('treeRef')
  const contextMenuRef = useTemplateRef('contextMenuRef')
  // const fileContent = ref();
  const selected = ref(null)
  const expanded = ref([])
  const chooseDir = async (_handle) => {
    try {
      const processHandle = async (handle, parentTree) => {
        const tree = {
          id: uid(),
          label: handle.name,
          icon: handle.kind === 'file' ? 'mdi-file' : 'mdi-folder',
          handle: handle,
          parentTree: parentTree,
          children: [],
        }
        // 存储到映射表以便快速查找
        nodeMap.value[tree.id] = tree
        if (handle.kind === 'file') {
          return tree
        }
        const iter = await handle.entries()
        for await (const entry of iter) {
          const child = await processHandle(entry[1], tree)
          tree.children.push(child)
        }
        return tree
      }

      const handle = _handle || (await window.showDirectoryPicker())
      if (handle) {
        chooseHandle.value = handle
        root.value.push(await processHandle(handle, null))
      }
    } catch (error) {
      console.error(error)
    }
  }
  onMounted(async () => {
    if (chooseHandle.value) {
      await chooseDir(chooseHandle.value)
    }
  })

  const readFile = async (handle) => {
    if (handle.kind !== 'file') return
    try {
      currentFile.value = {
        id: uid(),
        name: handle.name,
        handle: handle,
      }
      // console.log(handle);
      const file = await handle.getFile()
      const fileReader = new FileReader()
      // const content = await file.text();
      fileReader.readAsText(file)
      fileReader.onload = (e) => {
        const content = e.target.result
        if (!content) {
          jsonContent.value = {}
          return
        }
        if (isMarkdown(content) || handle.name?.endsWith('.md')) {
          jsonContent.value = getJson(content)
          return
        }
        try {
          jsonContent.value = JSON.parse(content)
        } catch (e) {
          console.warn('不是JSON字符串：', e)
          jsonContent.value = content
        }
      }
    } catch (error) {
      console.error('Error reading file:', error)
      return error
    }
  }

  const createFile = async (node, name) => {
    if (hasSameName(node, name)) {
      $q.notify({
        message: '存在同名，请修改名称再新建！',
      })
      return
    }
    const handle = node.handle
    const fileHandle = await handle.getFileHandle(name, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write('')
    await writable.close()
    if (node.children?.length) {
      node.children.push({
        id: uid(),
        label: fileHandle.name,
        icon: 'mdi-file',
        handle: fileHandle,
        parentTree: node,
        children: [],
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
    const handle = node.handle
    const directoryHandle = await handle.getDirectoryHandle(name, { create: true })

    if (node.children?.length) {
      node.children.push({
        id: uid(),
        label: directoryHandle.name,
        icon: 'mdi-folder',
        handle: directoryHandle,
        parentTree: node,
        children: [],
      })
    }
  }
  const deleteItem = async (node) => {
    // console.log(node);
    const fileId = node.id
    await node.parentTree.handle.removeEntry(node.handle.name, { recursive: true })
    const parentNode = treeRef.value.getNodeByKey(node.parentTree.id)
    // console.log(parentNode);
    parentNode.children = parentNode.children.filter((i) => i.id !== fileId)
  }
  const hasSameName = (node, val) => {
    return node.parentTree.children?.map((i) => i.label)?.includes(val)
  }

  const renameNode = ref()
  const createInNode = ref()
  const createType = ref()
  const showCreate = (node, type) => {
    createInNode.value = node.id
    createType.value = type
  }
  const create = async (node, name) => {
    ; (createType.value === 'file' && createFile(node, name)) || createDirectory(node, name)
  }
  const inputText = ref('')
  const rename = async (node, newName) => {
    if (!node || !newName) {
      return
    }
    const oldName = node.handle.name
    const handle = node.parentTree.handle
    if (node.handle.kind === 'file') {
      console.log('handle', handle)
      const fileHandle = await handle.getFileHandle(oldName)
      console.log('fileHandle', fileHandle)
      const newFileHandle = await handle.getFileHandle(newName, { create: true })
      console.log('newFileHandle', newFileHandle)
      const writable = await newFileHandle.createWritable()
      const file = await fileHandle.getFile()
      await writable.write(await file.text())
      await writable.close()
      await handle.removeEntry(oldName)

      node.handle = newFileHandle
    } else {
      const oldFolderHandle = await handle.getDirectoryHandle(oldName)
      const newFolderHandle = await handle.getDirectoryHandle(newName, { create: true })

      // 复制旧文件夹内容到新文件夹
      for await (const entry of oldFolderHandle.values()) {
        if (entry.kind === 'file') {
          const fileHandle = await oldFolderHandle.getFileHandle(entry.name)
          const newFileHandle = await newFolderHandle.getFileHandle(entry.name, { create: true })
          const writable = await newFileHandle.createWritable()
          const file = await fileHandle.getFile()
          await writable.write(await file.text())
          await writable.close()
        } else if (entry.kind === 'directory') {
          // 递归复制子文件夹
          await copyDirectory(entry.name, oldFolderHandle, newFolderHandle)
        }
      }

      // 删除旧文件夹
      await handle.removeEntry(oldName, { recursive: true })

      async function copyDirectory(name, oldParentHandle, newParentHandle) {
        const oldDirHandle = await oldParentHandle.getDirectoryHandle(name)
        const newDirHandle = await newParentHandle.getDirectoryHandle(name, { create: true })
        for await (const entry of oldDirHandle.values()) {
          if (entry.kind === 'file') {
            const fileHandle = await oldDirHandle.getFileHandle(entry.name)
            const newFileHandle = await newDirHandle.getFileHandle(entry.name, { create: true })
            const writable = await newFileHandle.createWritable()
            const file = await fileHandle.getFile()
            await writable.write(await file.text())
            await writable.close()
          } else if (entry.kind === 'directory') {
            await copyDirectory(entry.name, oldDirHandle, newDirHandle)
          }
        }
      }
      node.handle = newFolderHandle
    }
    node.label = newName
    currentFile.value.name = newName
    contextMenuRef.value?.hide()
  }
  const showRename = (prop) => {
    renameNode.value = prop.node.id
    inputText.value = prop.node.label
  }
  const contextMenuHide = () => {
    renameNode.value = void 0
    createInNode.value = void 0
    inputText.value = ''
    createType.value = ''
  }

  // 添加文件句柄有效性检查
  const checkFileHandleValidity = async (handle) => {
    if (!handle) return false
    try {
      // 尝试请求权限来检查句柄的有效性
      await handle.requestPermission({ mode: 'read' })
      return true
    } catch (e) {
      console.warn('File handle is no longer valid:', e)
      return false
    }
  }

  // 文件监视器
  let fileCheckInterval = null

  // 监视当前文件是否被删除
  watch(
    () => currentFile.value,
    (newVal) => {
      // 清除之前的监视器
      if (fileCheckInterval) {
        clearInterval(fileCheckInterval)
        fileCheckInterval = null
      }

      // 如果有当前文件，开始监视文件
      if (newVal && newVal.handle) {
        fileCheckInterval = setInterval(async () => {
          // 检查文件句柄是否仍然有效
          const isValid = await checkFileHandleValidity(newVal.handle)
          if (!isValid) {
            // 文件句柄无效，可能是文件已被删除
            console.warn('Current file handle is no longer valid')
            currentFile.value = null
            jsonContent.value = {
              type: 'doc',
              content: [{ type: 'paragraph', content: [] }],
            }
            $q.notify({
              type: 'warning',
              message: '当前文件已被删除或访问权限已被撤销',
              position: 'top',
            })
            // 清除监视器
            clearInterval(fileCheckInterval)
            fileCheckInterval = null
          }
        }, 5000) // 每5秒检查一次，浏览器环境下频率可以低一些
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

  // 刷新文件树函数
  const refreshing = ref(false)
  const refreshFileTree = async () => {
    if (root.value.length === 0) return
    refreshing.value = true
    try {
      // 清空文件树
      const rootHandles = [...root.value.map((node) => node.handle)]
      root.value = []
      nodeMap.value = []

      // 重新处理文件树
      for (const handle of rootHandles) {
        const processHandle = async (handle, parentTree) => {
          const tree = {
            id: uid(),
            label: handle.name,
            icon: handle.kind === 'file' ? 'mdi-file' : 'mdi-folder',
            handle: handle,
            parentTree: parentTree,
            children: [],
          }
          // 存储到映射表以便快速查找
          nodeMap.value[tree.id] = tree
          if (handle.kind === 'file') {
            return tree
          }
          const iter = await handle.entries()
          for await (const entry of iter) {
            const child = await processHandle(entry[1], tree)
            tree.children.push(child)
          }
          return tree
        }

        root.value.push(await processHandle(handle, null))
      }

      // 在下一个渲染周期中自动展开根节点
      setTimeout(() => {
        if (root.value.length > 0) {
          expanded.value = [root.value[0].id]
        }
      }, 100)

      refreshing.value = false
    } catch (error) {
      console.error('刷新文件树时出错:', error)
      $q.notify({
        type: 'negative',
        message: '刷新文件树失败',
        position: 'top',
      })
    }
  }
</script>
