import { isElectron } from 'src/utils/environment'

export default async ({ app }) => {
  // 只在浏览器环境中加载FileManager组件
  try {
    const FileManagerModule = await import('src/components/FileManager.vue')
    if (FileManagerModule && FileManagerModule.default) {
      app.component('FileManager', FileManagerModule.default)
    }
  } catch (error) {
    console.warn('FileManager component could not be loaded:', error)
  }

  // 只在Electron环境中加载ElectronFileManager组件
  if (isElectron()) {
    try {
      const ElectronFileManagerModule = await import('src/components/ElectronFileManager.vue')
      if (ElectronFileManagerModule && ElectronFileManagerModule.default) {
        app.component('ElectronFileManager', ElectronFileManagerModule.default)
      }
    } catch (error) {
      console.warn('ElectronFileManager component could not be loaded:', error)
    }
  }
}
