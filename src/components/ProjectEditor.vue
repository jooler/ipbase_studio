<template>
  <div class="project-editor">
    <div class="row">
      <!-- Project Manager (File Tree) -->
      <div class="col-4 q-pr-md">
        <ProjectManager ref="projectManager" @open-file="handleOpenFile" />
      </div>

      <!-- Editor Area -->
      <div class="col-8">
        <div v-if="currentFile" class="editor-container">
          <div class="editor-header q-mb-sm">
            <h5 class="q-ma-none">{{ currentFile.label }}</h5>
          </div>

          <TiptapSsml
            v-model="editorContent"
            @ssml-change="handleContentChange"
            :placeholder="'编辑文件内容...'"
          />
        </div>
        <div v-else class="no-file-selected q-pa-lg text-center">
          <q-icon name="info" size="3rem" color="grey-7" />
          <p class="text-grey-7 q-mt-md">请从左侧文件树中选择一个文件或创建新文件</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ProjectManager from './ProjectManager.vue'
import TiptapSsml from './TiptapSsml.vue'

// Current file being edited
const currentFile = ref(null)
const editorContent = ref('')
const projectManager = ref(null)

// Handle file opening from ProjectManager
const handleOpenFile = (file) => {
  currentFile.value = file
  editorContent.value = file.content || ''
}

// Watch for content changes and save them
const handleContentChange = (newContent) => {
  if (!currentFile.value) return

  // Save the content to the current file
  saveFileContent(newContent)
}

// Watch for editor content changes to save
watch(editorContent, (newContent) => {
  saveFileContent(newContent)
})

// Save file content to IndexedDB
const saveFileContent = (content) => {
  if (!currentFile.value || !projectManager.value) return

  // Update file content in ProjectManager (which will save to IndexedDB)
  projectManager.value.updateFileContent(currentFile.value.id, content)
}
</script>

<style scoped>
.project-editor {
  height: 100%;
  padding: 16px;
}

.editor-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  padding: 8px 16px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f5f5f5;
}

.no-file-selected {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 4px;
}
</style>
