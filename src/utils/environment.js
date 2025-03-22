/**
 * Utilities to detect the application environment
 */

/**
 * Checks if the application is running in Electron
 * @returns {boolean} True if running in Electron, false otherwise
 */
export const isElectron = () => {
  // 检查多个Electron特定API
  return (
    typeof window !== 'undefined' &&
    // 检查fileSystemAPI
    (typeof window.fileSystemAPI !== 'undefined' ||
      // 检查Electron标志
      (typeof window.process !== 'undefined' &&
        typeof window.process.versions !== 'undefined' &&
        typeof window.process.versions.electron !== 'undefined') ||
      // 检查node集成
      (typeof window.process !== 'undefined' && typeof window.process.type === 'string') ||
      // 检查windowAPI（我们在preload中定义的）
      typeof window.windowAPI !== 'undefined')
  )
}

/**
 * 简单路径工具函数，在浏览器和Electron中都可工作
 */
export const pathUtils = {
  basename: (filepath) => {
    if (!filepath) return ''
    return filepath.split(/[\\/]/).pop() || ''
  },

  dirname: (filepath) => {
    if (!filepath) return ''
    return filepath.substring(0, Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\')))
  },

  join: (...args) => {
    return args.filter(Boolean).join('/')
  },

  extname: (filepath) => {
    if (!filepath) return ''
    const basename = filepath.split(/[\\/]/).pop()
    const lastDotPos = basename.lastIndexOf('.')
    return lastDotPos < 0 ? '' : basename.substring(lastDotPos)
  },
}
