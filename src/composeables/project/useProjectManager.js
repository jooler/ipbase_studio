import { ref } from 'vue'

export const useProjectManager = () => {
  const currentOpenFile = ref(null) // Track currently open file
  return {
    currentOpenFile,
  }
}
