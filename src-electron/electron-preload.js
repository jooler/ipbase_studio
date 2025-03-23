/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.js you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */
import { contextBridge } from 'electron'
import { BrowserWindow, shell } from '@electron/remote'
import path from 'path'
import fs from 'fs'
import { dialog } from '@electron/remote'
import os from 'os'

// 检测当前操作系统
const platform = os.platform()
const isWindows = platform === 'win32'
const isMac = platform === 'darwin'
const isLinux = platform === 'linux'

contextBridge.exposeInMainWorld('windowAPI', {
  minimize() {
    BrowserWindow.getFocusedWindow().minimize()
  },

  toggleMaximize() {
    const win = BrowserWindow.getFocusedWindow()

    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  },
  isMaximized() {
    const win = BrowserWindow.getFocusedWindow()
    return win.isMaximized()
  },

  close() {
    BrowserWindow.getFocusedWindow().close()
  },
})
contextBridge.exposeInMainWorld('pathAPI', {
  pathService(_path) {
    let __path
    if (process.env.DEV) {
      __path = path.resolve(`public/${_path}`)
    } else {
      __path = path.join(process.resourcesPath, 'app.asar', _path)
    }
    return __path
  },
})

contextBridge.exposeInMainWorld('fileSystemAPI', {
  // 提供当前平台信息
  platform: platform,
  isWindows: isWindows,
  isMac: isMac,
  isLinux: isLinux,

  // Path utilities
  basename: (filePath) => path.basename(filePath),
  dirname: (filePath) => path.dirname(filePath),
  join: (...paths) => path.join(...paths),

  // Choose a directory
  chooseDirectory: async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })
      if (result.canceled) return null
      return result.filePaths[0]
    } catch (error) {
      console.error('Error choosing directory:', error)
      throw error
    }
  },

  // Read directory contents
  readDirectory: async (dirPath) => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name),
      }))
    } catch (error) {
      console.error('Error reading directory:', error)
      throw error
    }
  },

  // Read file content
  readFile: async (filePath) => {
    try {
      return await fs.promises.readFile(filePath, 'utf8')
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  },

  // Write to a file
  writeFile: async (filePath, content) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf8')
      return true
    } catch (error) {
      console.error('Error writing to file:', error)
      throw error
    }
  },

  // Create a file
  createFile: async (dirPath, fileName) => {
    try {
      const filePath = path.join(dirPath, fileName)
      await fs.promises.writeFile(filePath, '')
      return filePath
    } catch (error) {
      console.error('Error creating file:', error)
      throw error
    }
  },

  // Create a directory
  createDirectory: async (dirPath, dirName) => {
    try {
      const newDirPath = path.join(dirPath, dirName)
      // 在macOS和Linux上，需要设置目录权限
      await fs.promises.mkdir(newDirPath)

      if (isMac || isLinux) {
        // 为目录设置权限 (rwxr-xr-x)
        await fs.promises.chmod(newDirPath, 0o755)
      }

      return newDirPath
    } catch (error) {
      console.error('Error creating directory:', error)
      throw error
    }
  },

  // Delete a file or directory
  deleteItem: async (itemPath) => {
    try {
      const stats = await fs.promises.stat(itemPath)

      if (stats.isDirectory()) {
        // 在macOS和Linux上可能需要特殊处理某些权限问题
        if (isMac || isLinux) {
          try {
            // 尝试修改权限使其可删除
            await fs.promises.chmod(itemPath, 0o777)
          } catch (e) {
            console.warn('无法修改目录权限:', e)
            // 继续尝试删除
          }
        }

        await fs.promises.rm(itemPath, { recursive: true, force: true })
      } else {
        await fs.promises.unlink(itemPath)
      }
      return true
    } catch (error) {
      console.error(`Error deleting item on ${platform}:`, error)
      throw error
    }
  },

  // Rename a file or directory
  renameItem: async (oldPath, newPath) => {
    try {
      await fs.promises.rename(oldPath, newPath)
      return newPath
    } catch (error) {
      console.error('Error renaming item:', error)
      throw error
    }
  },

  // Check if a file or directory exists
  exists: async (itemPath) => {
    try {
      await fs.promises.access(itemPath)
      return true
    } catch {
      return false
    }
  },

  // Get stats of a file or directory
  getStats: async (itemPath) => {
    try {
      const stats = await fs.promises.stat(itemPath)
      return {
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      throw error
    }
  },

  // 导出文件对话框
  saveFileDialog: async (defaultPath, content) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultPath,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled) return null

      // 保存文件
      await fs.promises.writeFile(result.filePath, content, 'utf8')
      return {
        path: result.filePath,
        name: path.basename(result.filePath),
      }
    } catch (error) {
      console.error('Error in save file dialog:', error)
      throw error
    }
  },

  // 在文件管理器中打开文件夹
  openInExplorer: async (itemPath) => {
    try {
      // 如果是文件，则打开包含该文件的文件夹
      const stats = await fs.promises.stat(itemPath)
      let pathToOpen = stats.isFile() ? path.dirname(itemPath) : itemPath

      // 使用shell.openPath打开路径，它会根据不同平台使用合适的程序
      // macOS: open
      // Linux: xdg-open
      // Windows: explorer
      await shell.openPath(pathToOpen)
      return true
    } catch (error) {
      console.error(`Error opening path in ${platform}:`, error)
      throw error
    }
  },

  // 检查文件是否存在
  fileExists: async (filePath) => {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK)
      return true
    } catch {
      return false
    }
  },

  // 获取系统临时目录
  getTempDir: () => {
    return os.tmpdir()
  },

  // 获取主目录
  getHomeDir: () => {
    return os.homedir()
  },
})
