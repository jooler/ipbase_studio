import { ref, computed } from 'vue'
import { isElectron } from 'src/utils/environment'

const chooseHandle = ref()
export function useFileManager() {
  // 当前环境
  const isElectronEnv = computed(() => isElectron())

  // 当前文件管理器组件
  const fileManagerComponent = computed(() => {
    if (isElectronEnv.value) {
      return 'ElectronFileManager'
    } else {
      return 'FileManager'
    }
  })

  // 当前应用标题
  const appTitle = computed(() => {
    if (isElectronEnv.value) {
      return 'IPBase Studio (Electron)'
    } else {
      return 'IPBase Studio (Browser)'
    }
  })

  return {
    isElectronEnv,
    fileManagerComponent,
    appTitle,
    chooseHandle,
  }
}
