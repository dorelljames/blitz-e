import { BrowserWindow, app, ipcMain, shell } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'

import icon from '../../resources/icon.png?asset'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null
let focusWindow: BrowserWindow | null = null
let isFocusMode = false

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle main window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createFocusWindow(task: { title: string; id: string }): void {
  if (focusWindow) {
    focusWindow.focus()
    return
  }

  focusWindow = new BrowserWindow({
    width: 400,
    height: 80,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  const url = is.dev
    ? `file://${join(__dirname, '../../src/renderer/focus/simple-focus.html')}`
    : `file://${join(__dirname, '../renderer/focus.html')}`

  console.log('Loading focus window URL:', url)
  focusWindow.loadURL(url)

  focusWindow.webContents.once('did-finish-load', () => {
    console.log('Focus window loaded, sending task data:', task)
    focusWindow?.webContents.send('task-data', task)
  })

  focusWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Focus window failed to load:', errorCode, errorDescription)
  })

  focusWindow.on('closed', () => {
    focusWindow = null
    isFocusMode = false
    // Show main window when focus window is closed
    if (mainWindow) {
      mainWindow.show()
    }
  })
}

function enterFocusMode(task: { title: string; id: string }): void {
  if (isFocusMode) return

  isFocusMode = true

  // Hide main window
  if (mainWindow) {
    mainWindow.hide()
  }

  // Create focus window
  createFocusWindow(task)
}

function exitFocusMode(): void {
  if (!isFocusMode) return

  isFocusMode = false

  // Close focus window
  if (focusWindow) {
    focusWindow.close()
    focusWindow = null
  }

  // Show main window
  if (mainWindow) {
    mainWindow.show()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  // Handle focus mode toggle
  ipcMain.on('focus-mode', (_, task) => {
    if (isFocusMode) {
      exitFocusMode()
    } else {
      enterFocusMode(task)
    }
  })

  // Handle exit focus mode
  ipcMain.on('exit-focus-mode', () => {
    exitFocusMode()
  })

  // Handle focus complete
  ipcMain.on('focus-complete', () => {
    exitFocusMode()
  })

  // Handle request for first task
  ipcMain.handle('get-first-task', async () => {
    // This will be called from renderer to get the first task
    // Return a placeholder for now - the renderer will handle the actual task selection
    return { title: 'Focus Mode', id: 'focus' }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
