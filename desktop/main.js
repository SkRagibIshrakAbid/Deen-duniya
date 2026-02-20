const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV !== 'production'
const webAppUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../web/dist/index.html')}`

let mainWindow = null
let tray = null
let widgetWindow = null

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until ready
  })

  // Load the web app
  mainWindow.loadURL(webAppUrl)

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  // Create system tray icon
  const iconPath = path.join(__dirname, 'assets/tray-icon.png')
  const trayIcon = nativeImage.createFromPath(iconPath)
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: 'Toggle Widget',
      click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.close()
        } else {
          createWidget()
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('open-settings')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('Deen Duniya - Islamic Prayer Times')
  tray.setContextMenu(contextMenu)
  
  // Show window on tray click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  })
}

function createWidget() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // Create widget window in top-right corner
  widgetWindow = new BrowserWindow({
    width: 300,
    height: 400,
    x: width - 320,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load widget HTML
  const widgetUrl = isDev 
    ? 'http://localhost:5173/#/widget' 
    : `file://${path.join(__dirname, '../web/dist/index.html#/widget')}`
  
  widgetWindow.loadURL(widgetUrl)

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  // Make widget draggable
  widgetWindow.setIgnoreMouseEvents(false)
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow()
  createTray()
  
  app.on('activate', () => {
    // On macOS re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle IPC messages from renderer process
ipcMain.on('show-notification', (event, data) => {
  // Forward to notification system
  const { Notification } = require('electron')
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: data.title,
      body: data.body,
      icon: path.join(__dirname, 'assets/icon.png'),
      silent: !data.sound
    })
    
    notification.show()
    
    notification.on('click', () => {
      mainWindow.show()
      mainWindow.focus()
    })
  }
})

ipcMain.on('update-tray-tooltip', (event, text) => {
  if (tray) {
    tray.setToolTip(text)
  }
})

ipcMain.on('open-widget', () => {
  createWidget()
})

ipcMain.on('close-widget', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close()
  }
})

// Auto-launch on system startup (optional, requires electron-store or similar)
app.setLoginItemSettings({
  openAtLogin: false, // Can be toggled by user in settings
  openAsHidden: false
})
