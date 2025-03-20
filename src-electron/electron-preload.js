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
import { BrowserWindow } from '@electron/remote'
import path from 'path'

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
