<template>
  <div class="project-manager">
    <q-tree
      :nodes="treeData"
      node-key="id"
      dense
      selected-color="primary"
      v-model:selected="selected"
      v-model:expanded="expanded"
    >
      <template v-slot:default-header="prop">
        <div
          class="row items-center no-wrap text-no-wrap full-width"
          @contextmenu.prevent="contextMenuOpen(prop.node)"
        >
          <q-icon :name="prop.node.icon" color="orange" size="24px" class="q-mr-sm" />
          <div
            :class="selected !== prop.node.id ? 'op-7' : ''"
            @dblclick="prop.node.type === 'file' ? openFile(prop.node) : startEditing(prop.node)"
          >
            {{ prop.node.name }}
          </div>
          <q-space />
          <div
            v-if="prop.node.color && prop.node.color.length > 0"
            class="row items-center no-wrap"
            style="gap: 2px"
          >
            <q-btn
              v-for="color in prop.node.color"
              :key="color"
              round
              dense
              size="0.2rem"
              :color="color"
              @click.stop="updateNodeColormarker(prop.node.id, color)"
            />
          </div>
          <q-popup-proxy
            :ref="(el) => (contextMenuRefs[prop.node.id] = el)"
            context-menu
            class="no-padding radius-sm z-max"
          >
            <q-list bordered class="q-pa-xs radius-sm">
              <q-item class="gap-sm q-pa-sm">
                <q-btn
                  v-for="i in icons"
                  :key="i"
                  flat
                  dense
                  padding="xs"
                  :icon="i"
                  @click.stop="updateNodeIcon(prop.node.id, i)"
                />
              </q-item>
              <q-item class="gap-sm q-pa-sm">
                <div class="row items-center gap-sm">
                  <q-btn
                    v-for="i in colors"
                    :key="i"
                    dense
                    round
                    size="xs"
                    :color="i"
                    @click.stop="updateNodeColormarker(prop.node.id, i)"
                  />
                </div>
              </q-item>
              <q-item class="no-padding">
                <q-item-section>
                  <q-input
                    v-model="editingText"
                    dense
                    autofocus
                    class="radius-xs overflow-hidden border"
                    input-class="q-px-sm"
                    @update:model-value="updateNode(prop.node.id)"
                    @keyup.enter="finishEditing"
                  />
                </q-item-section>
              </q-item>
              <template v-if="prop.node.type === 'folder'">
                <q-item
                  :clickable="!showNewFolderNameInput"
                  :v-ripple="!showNewFolderNameInput"
                  class="q-pa-none radius-xs"
                  @click="createFolderHandler"
                >
                  <q-item-section :class="showNewFolderNameInput ? 'q-pa-none' : 'q-pa-sm'">
                    <q-item-label v-if="!showNewFolderNameInput">新建配音文件夹</q-item-label>
                    <q-item-label v-else>
                      <q-input
                        v-model="newFolderName"
                        dense
                        autofocus
                        class="radius-xs overflow-hidden border"
                        input-class="q-px-sm"
                        @keyup.enter="createFolder"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item
                  :clickable="!showNewFileNameInput"
                  :v-ripple="!showNewFileNameInput"
                  class="q-pa-none radius-xs"
                  @click="createFileHandler"
                >
                  <q-item-section :class="showNewFileNameInput ? 'q-pa-none' : 'q-pa-sm'">
                    <q-item-label v-if="!showNewFileNameInput">新建配音文本</q-item-label>
                    <q-item-label v-else>
                      <q-input
                        v-model="newFileName"
                        dense
                        autofocus
                        class="radius-xs overflow-hidden border"
                        input-class="q-px-sm"
                        @keyup.enter="createFile"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <q-separator class="op-5 q-my-xs" />
              <q-item class="radius-xs" clickable @click="deleteSelected">
                <q-item-section side>
                  <q-icon name="delete" color="negative" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>删除</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-popup-proxy>
        </div>
      </template>
    </q-tree>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineEmits } from 'vue'
import { uid } from 'quasar'
import localforage from 'localforage'
import { useProjectManager } from '../composeables/project/useProjectManager'

// Storage keys
const ROOT_STORAGE_KEY = 'project_root'
const EXPANDED_KEY = 'project_expanded_nodes'

const emit = defineEmits(['open-file'])

const { currentOpenFile } = useProjectManager()

// Initialize tree data
const treeData = ref([])
const selected = ref(null)
const expanded = ref([])
const editingNode = ref(null)
const editingText = ref('')

// Initialize localforage
const initStorage = () => {
  localforage.config({
    name: 'ProjectManager',
    storeName: 'projectData',
  })
}

// Load data from IndexedDB
const loadData = async () => {
  try {
    const data = await localforage.getItem(ROOT_STORAGE_KEY)
    if (data) {
      treeData.value = data
      // Load expanded state
      const expandedData = await localforage.getItem(EXPANDED_KEY)
      if (expandedData) {
        expanded.value = expandedData
      }
    } else {
      // Initialize with a root folder if no data exists
      const rootId = uid()
      treeData.value = [
        {
          id: rootId,
          name: '我的项目',
          icon: 'folder',
          type: 'folder',
          children: [],
        },
      ]
      expanded.value = [rootId] // Expand root by default
      await saveData()
      await saveExpandedState()
    }
  } catch (error) {
    console.error('Error loading project data:', error)
  }
}

// Save data to IndexedDB
const saveData = async () => {
  try {
    // Create a deep clone without circular references
    const serializedData = JSON.parse(JSON.stringify(treeData.value))
    await localforage.setItem(ROOT_STORAGE_KEY, serializedData)
  } catch (error) {
    console.error('Error saving project data:', error)
  }
}

// Save expanded state to IndexedDB
const saveExpandedState = async () => {
  try {
    // Convert the array to a serializable format
    const serializedExpanded = JSON.parse(JSON.stringify(expanded.value))
    await localforage.setItem(EXPANDED_KEY, serializedExpanded)
  } catch (error) {
    console.error('Error saving expanded state:', error)
  }
}

// Save file content to IndexedDB
const saveFileContent = async (fileId, content) => {
  try {
    await localforage.setItem(fileId, content)
  } catch (error) {
    console.error('Error saving file content:', error)
  }
}

// Load file content from IndexedDB
const loadFileContent = async (fileId) => {
  try {
    const content = await localforage.getItem(fileId)
    return content
  } catch (error) {
    console.error('Error loading file content:', error)
    return null
  }
}

// Watch for changes to save automatically
watch(
  treeData,
  () => {
    saveData()
  },
  { deep: true },
)

// Watch for changes to expanded state
watch(
  expanded,
  () => {
    saveExpandedState()
  },
  { deep: true },
)

// Create a new file
const newFileName = ref('新文本')
const showNewFileNameInput = ref(false)
const createFileHandler = () => {
  showNewFileNameInput.value = true
  showNewFolderNameInput.value = false
}
const createFolderHandler = () => {
  showNewFolderNameInput.value = true
  showNewFileNameInput.value = false
}
const createFile = async () => {
  const parentNode = selected.value ? findNode(treeData.value, selected.value) : null

  const fileId = uid()
  const newFile = {
    id: fileId,
    name: newFileName.value,
    icon: 'insert_drive_file',
    type: 'file',
  }

  if (parentNode && parentNode.type === 'folder') {
    // Ensure the parent folder is expanded
    if (!expanded.value.includes(parentNode.id)) {
      expanded.value.push(parentNode.id)
    }

    if (!parentNode.children) {
      parentNode.children = []
    }
    parentNode.children.push(newFile)
  } else {
    treeData.value.push(newFile)
  }

  // Save the new file's content to IndexedDB immediately
  saveFileContent(fileId, '')

  // Start editing the new file name
  editingNode.value = newFile.id
  editingText.value = newFile.name
  selected.value = fileId
  await contextMenuClose()
}

const newFolderName = ref('新文件夹')
const showNewFolderNameInput = ref(false)
// Create a new folder
const createFolder = async () => {
  const parentNode = selected.value ? findNode(treeData.value, selected.value) : null

  const newFolder = {
    id: uid(),
    name: newFolderName.value,
    icon: 'folder',
    type: 'folder',
    children: [],
  }

  if (parentNode && parentNode.type === 'folder') {
    // Ensure the parent folder is expanded
    if (!expanded.value.includes(parentNode.id)) {
      expanded.value.push(parentNode.id)
    }

    if (!parentNode.children) {
      parentNode.children = []
    }
    parentNode.children.push(newFolder)
  } else {
    treeData.value.push(newFolder)
  }

  // Auto-expand the new folder
  expanded.value.push(newFolder.id)

  // Start editing the new folder name
  editingNode.value = newFolder.id
  editingText.value = newFolder.name
  selected.value = newFolder.id
  await contextMenuClose()
}

// Delete selected node
const deleteSelected = () => {
  if (!selected.value) return

  const deleteNodeById = (nodes, id) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        // If it's a file, delete its content from IndexedDB
        if (nodes[i].type === 'file') {
          localforage
            .removeItem(nodes[i].id)
            .catch((error) => console.error('Error removing file content:', error))

          // If this is the currently open file, clear it
          if (currentOpenFile.value && currentOpenFile.value.id === id) {
            currentOpenFile.value = null
          }
        }
        // If it's a folder, delete all its children's content recursively
        else if (nodes[i].type === 'folder' && nodes[i].children) {
          const deleteChildrenContent = (children) => {
            children.forEach((child) => {
              if (child.type === 'file') {
                localforage
                  .removeItem(child.id)
                  .catch((error) => console.error('Error removing file content:', error))

                // If this is the currently open file, clear it
                if (currentOpenFile.value && currentOpenFile.value.id === child.id) {
                  currentOpenFile.value = null
                }
              } else if (child.type === 'folder' && child.children) {
                deleteChildrenContent(child.children)
              }
            })
          }
          deleteChildrenContent(nodes[i].children)
        }

        nodes.splice(i, 1)
        return true
      }

      if (nodes[i].children && nodes[i].children.length) {
        if (deleteNodeById(nodes[i].children, id)) {
          return true
        }
      }
    }
    return false
  }

  deleteNodeById(treeData.value, selected.value)
  selected.value = null
}

// Find node by id
const findNode = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }

    if (node.children && node.children.length) {
      const found = findNode(node.children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}

// Add contextMenuRefs object to store all popup refs
const contextMenuRefs = ref({})

// Modify contextMenuOpen method
const contextMenuOpen = (node) => {
  startEditing(node)
  selected.value = node.id
  const menuRef = contextMenuRefs.value[node.id]
  if (menuRef) {
    menuRef.show()
  }
}

// Modify contextMenuClose method
const contextMenuClose = async () => {
  await finishEditing()
  const menuRef = contextMenuRefs.value[selected.value]
  if (menuRef) {
    menuRef.hide()
  }
}

// Modify finishEditing method
const finishEditing = async () => {
  const menuRef = contextMenuRefs.value[selected.value]
  if (menuRef) {
    menuRef.hide()
  }
  if (editingNode.value) {
    updateNode(editingNode.value)
    editingNode.value = null
  }
  showNewFileNameInput.value = false
}

// Start editing node name
const startEditing = (node) => {
  editingNode.value = node.id
  editingText.value = node.name || ''
}

const updateNode = (nodeId) => {
  const _node = findNode(treeData.value, nodeId)
  if (_node) {
    _node.name = editingText.value
    // If this is the currently open file, update its name
    if (currentOpenFile.value && currentOpenFile.value.id === _node.id) {
      currentOpenFile.value.name = editingText.value
    }
  }
}

const icons = ['mdi-folder', 'mdi-file', 'mdi-flag']
const colors = ['primary', 'secondary', 'accent', 'positive', 'negative', 'info', 'warning']
const updateNodeIcon = (nodeId, icon) => {
  console.log(nodeId, icon)
  const _node = findNode(treeData.value, nodeId)
  if (_node) {
    _node.icon = icon
    // If this is the currently open file, update its name
    if (currentOpenFile.value && currentOpenFile.value.id === _node.id) {
      currentOpenFile.value.icon = icon
    }
  }
}
const updateNodeColormarker = (nodeId, color) => {
  console.log(nodeId, color)
  const _node = findNode(treeData.value, nodeId)
  if (_node) {
    if (!_node.color || _node.color.length === 0) {
      _node.color = [color]
    } else if (_node.color.includes(color)) {
      _node.color = _node.color.filter((c) => c !== color)
    } else {
      _node.color.push(color)
    }
    // If this is the currently open file, update its name
    if (currentOpenFile.value && currentOpenFile.value.id === _node.id) {
      currentOpenFile.value.color = _node.color
    }
  }
}

// Open a file in the editor
const openFile = async (node) => {
  if (node.type !== 'file') return

  try {
    // Load file content from IndexedDB
    const content = (await loadFileContent(node.id)) || ''

    // Set as current open file
    currentOpenFile.value = {
      id: node.id,
      name: node.name,
    }

    // Emit an event to parent component with file info and content
    emit('open-file', {
      id: node.id,
      name: node.name,
      content: content,
    })
  } catch (error) {
    console.error('Error opening file:', error)
  }
}

// Update file content in IndexedDB
const updateFileContent = async (fileId, content) => {
  try {
    await saveFileContent(fileId, content)
  } catch (error) {
    console.error('Error updating file content:', error)
  }
}

// Update node name by ID
const updateNodeName = async (nodeId, newName) => {
  const node = findNode(treeData.value, nodeId)
  if (!node) {
    console.error('Node not found:', nodeId)
    return false
  }

  // Update the node name
  node.name = newName

  // Update currentOpenFile if it's the current file
  if (currentOpenFile.value && currentOpenFile.value.id === nodeId) {
    currentOpenFile.value.name = newName
  }

  // Save to local storage
  await saveData()
  return true
}

// Save content to the currently open file
const saveCurrentFile = async (content) => {
  if (!currentOpenFile.value) {
    console.error('No file is currently open')
    return false
  }

  try {
    // Save the content as is - it should already be JSON string from IndexPage
    await saveFileContent(currentOpenFile.value.id, content)
    return true
  } catch (error) {
    console.error('Error saving current file:', error)
    return false
  }
}

// Get current open file info
const getCurrentFile = () => {
  return currentOpenFile.value
}

// Initialize on component mount
onMounted(() => {
  initStorage()
  loadData()
})

// Expose functions for parent components
defineExpose({
  updateFileContent,
  saveCurrentFile,
  getCurrentFile,
  updateNodeName,
})
</script>

<style scoped>
.project-manager {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
}
</style>
