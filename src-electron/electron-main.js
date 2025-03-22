import { app, BrowserWindow, globalShortcut } from 'electron'
import { enable, initialize } from '@electron/remote/main/index.js'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
// 导入electron-store用于保存窗口状态
// 注意：需要先安装 npm install electron-store
import Store from 'electron-store'

// 创建存储实例
const store = new Store({
  name: 'window-state',
  defaults: {
    windowBounds: { width: 1200, height: 900 },
    position: { x: undefined, y: undefined },
    zoomFactor: 1.0,
  },
})

// 设置最大事件监听器数量，避免 MaxListenersExceededWarning
app.setMaxListeners(15)

initialize()
// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

const currentDir = fileURLToPath(new URL('.', import.meta.url))

let mainWindow

async function createWindow() {
  // 获取保存的窗口状态
  const { windowBounds, position, zoomFactor } = store.get()

  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: windowBounds.width,
    height: windowBounds.height,
    // 如果有保存的位置信息，则使用
    x: position.x,
    y: position.y,
    frame: false,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
      sandbox: false,
    },
  })

  // 设置缩放因子
  mainWindow.webContents.setZoomFactor(zoomFactor)

  // 增加 webContents 的最大监听器数量，避免 MaxListenersExceededWarning
  mainWindow.webContents.setMaxListeners(15)

  enable(mainWindow.webContents)

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  // 监听窗口大小和位置变化
  mainWindow.on('resize', () => saveWindowState())
  mainWindow.on('move', () => saveWindowState())

  // 监听缩放因子变化
  mainWindow.webContents.on('zoom-changed', (event, zoomDirection) => {
    console.log('event', event, 'zoomDirection', zoomDirection)

    const currentZoom = mainWindow.webContents.getZoomFactor()
    store.set('zoomFactor', currentZoom)
  })

  // 注册缩放快捷键
  registerZoomShortcuts()

  // 在窗口关闭前保存状态并清理资源
  mainWindow.on('close', () => {
    if (!mainWindow.isDestroyed()) {
      saveWindowState()

      // 清理所有 webContents 事件监听器
      if (mainWindow.webContents) {
        // 移除 zoom-changed 监听器
        mainWindow.webContents.removeAllListeners('zoom-changed')
        // 移除 devtools-opened 监听器
        mainWindow.webContents.removeAllListeners('devtools-opened')
        // 移除所有其他可能的监听器
        mainWindow.webContents.removeAllListeners()
      }
    }
    // 取消注册所有快捷键
    globalShortcut.unregisterAll()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 注册缩放快捷键
function registerZoomShortcuts() {
  // 增加缩放
  globalShortcut.register('CommandOrControl+Shift+=', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    const currentZoom = mainWindow.webContents.getZoomFactor()
    const newZoom = Math.min(currentZoom + 0.1, 3.0) // 最大放大到300%
    mainWindow.webContents.setZoomFactor(newZoom)
    store.set('zoomFactor', newZoom)
  })

  // 减少缩放
  globalShortcut.register('CommandOrControl+Shift+-', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    const currentZoom = mainWindow.webContents.getZoomFactor()
    const newZoom = Math.max(currentZoom - 0.1, 0.5) // 最小缩小到50%
    mainWindow.webContents.setZoomFactor(newZoom)
    store.set('zoomFactor', newZoom)
  })

  // 重置缩放
  globalShortcut.register('CommandOrControl+Shift+0', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    mainWindow.webContents.setZoomFactor(1.0)
    store.set('zoomFactor', 1.0)
  })
}

// 保存窗口状态的函数
function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return // 检查窗口是否已被销毁

  // 获取当前窗口的位置和大小
  const { width, height } = mainWindow.getBounds()
  const [x, y] = mainWindow.getPosition()
  const zoomFactor = mainWindow.webContents.getZoomFactor()

  // 保存到store
  store.set({
    windowBounds: { width, height },
    position: { x, y },
    zoomFactor,
  })
}

app.whenReady().then(createWindow)

// 应用退出前保存窗口状态并取消注册快捷键
app.on('before-quit', () => {
  // 不需要在这里再调用saveWindowState，因为已经在window的close事件中处理了
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
