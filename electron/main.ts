import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { SerialManager } from './serial/SerialManager'
import { GrblController } from './grbl/GrblController'
import { Store } from './store/Store'

let mainWindow: BrowserWindow | null = null
let serialManager: SerialManager
let grblController: GrblController | null = null
let store: Store

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f0f1a',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? true : true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  checkForUpdates()
}

function checkForUpdates() {
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }
}

function setupAutoUpdater() {
  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-available')
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err.message)
  })
}

function setupIPC() {
  ipcMain.handle('serial:list-ports', async () => {
    return serialManager.listPorts()
  })

  ipcMain.handle('serial:connect', async (_, portPath: string, baudRate: number) => {
    try {
      await serialManager.connect(portPath, baudRate)
      grblController = new GrblController(serialManager, (data) => {
        mainWindow?.webContents.send('grbl:data', data)
      })
      grblController.startStatusPolling()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('serial:disconnect', async () => {
    grblController?.stopStatusPolling()
    grblController = null
    await serialManager.disconnect()
    return { success: true }
  })

  ipcMain.handle('grbl:send', async (_, command: string) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.send(command)
  })

  ipcMain.handle('grbl:jog', async (_, axis: string, distance: number, feedRate: number) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.jog(axis, distance, feedRate)
  })

  ipcMain.handle('grbl:jog-cancel', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.jogCancel()
  })

  ipcMain.handle('grbl:home', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.home()
  })

  ipcMain.handle('grbl:unlock', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.unlock()
  })

  ipcMain.handle('grbl:reset', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.reset()
  })

  ipcMain.handle('grbl:feed-hold', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.feedHold()
  })

  ipcMain.handle('grbl:resume', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.resume()
  })

  ipcMain.handle('grbl:set-zero', async (_, axis: string) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.setZero(axis)
  })

  ipcMain.handle('grbl:go-to-zero', async (_, axis: string) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.goToZero(axis)
  })

  ipcMain.handle('grbl:feed-override', async (_, value: number) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.setFeedOverride(value)
  })

  ipcMain.handle('grbl:spindle-override', async (_, value: number) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.setSpindleOverride(value)
  })

  ipcMain.handle('grbl:rapid-override', async (_, value: number) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.setRapidOverride(value)
  })

  ipcMain.handle('grbl:start-job', async (_, gcode: string[]) => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.startJob(gcode, (progress) => {
      mainWindow?.webContents.send('grbl:job-progress', progress)
    })
  })

  ipcMain.handle('grbl:stop-job', async () => {
    if (!grblController) {
      return { success: false, error: 'Not connected' }
    }
    return grblController.stopJob()
  })

  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'G-Code Files', extensions: ['nc', 'gcode', 'ngc', 'tap', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result
  })

  ipcMain.handle('store:get', async (_, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('store:set', async (_, key: string, value: unknown) => {
    store.set(key, value)
    return { success: true }
  })

  ipcMain.handle('app:get-version', async () => {
    return app.getVersion()
  })

  ipcMain.handle('updater:check', async () => {
    if (!isDev) {
      return autoUpdater.checkForUpdates()
    }
    return null
  })

  ipcMain.handle('updater:install', async () => {
    autoUpdater.quitAndInstall()
  })
}

app.whenReady().then(() => {
  store = new Store()
  serialManager = new SerialManager()
  
  setupIPC()
  setupAutoUpdater()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  grblController?.stopStatusPolling()
  serialManager?.disconnect()
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
