<template>
  <div class="project-manager">
    <div class="toolbar q-mb-md">
      <q-btn color="primary" icon="add" label="New Folder" @click="createFolder" />
      <q-btn
        color="secondary"
        icon="insert_drive_file"
        label="New File"
        @click="createFile"
        class="q-ml-sm"
      />
      <q-btn
        color="negative"
        icon="delete"
        label="Delete"
        @click="deleteSelected"
        class="q-ml-sm"
        :disable="!selected"
      />
    </div>

    <q-tree :nodes="treeData" node-key="id" v-model:selected="selected" v-model:expanded="expanded">
      <template v-slot:default-header="prop">
        <div class="row items-center">
          <q-icon :name="prop.node.icon" size="28px" class="q-mr-sm" />
          <div v-if="editingNode === prop.node.id">
            <q-input
              v-model="editingText"
              dense
              autofocus
              @blur="finishEditing"
              @keyup.enter="finishEditing"
            />
          </div>
          <div
            v-else
            @dblclick="prop.node.type === 'file' ? openFile(prop.node) : startEditing(prop.node)"
          >
            {{ prop.node.name }}
          </div>
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
          name: 'My Project',
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

// Create a new folder
const createFolder = () => {
  const parentNode = selected.value ? findNode(treeData.value, selected.value) : null

  const newFolder = {
    id: uid(),
    name: 'New Folder',
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
}

// Create a new file
const createFile = () => {
  const parentNode = selected.value ? findNode(treeData.value, selected.value) : null

  const fileId = uid()
  const newFile = {
    id: fileId,
    name: 'New File',
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

// Start editing node name
const startEditing = (node) => {
  editingNode.value = node.id
  editingText.value = node.name
}

// Finish editing node name
const finishEditing = () => {
  if (editingNode.value) {
    const node = findNode(treeData.value, editingNode.value)
    if (node) {
      node.name = editingText.value

      // If this is the currently open file, update its name
      if (currentOpenFile.value && currentOpenFile.value.id === node.id) {
        currentOpenFile.value.name = editingText.value
      }
    }
    editingNode.value = null
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
