/**
 * Utilities to detect the application environment
 */
import { Platform } from 'quasar'
/**
 * Checks if the application is running in Electron
 * @returns {boolean} True if running in Electron, false otherwise
 */
export const isElectron = () => {
  // 检查多个Electron特定API
  return Platform.is.electron
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
