const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send notification to main process
  showNotification: (data) => {
    ipcRenderer.send('show-notification', data)
  },
  
  // Update tray tooltip
  updateTrayTooltip: (text) => {
    ipcRenderer.send('update-tray-tooltip', text)
  },
  
  // Widget controls
  openWidget: () => {
    ipcRenderer.send('open-widget')
  },
  
  closeWidget: () => {
    ipcRenderer.send('close-widget')
  },
  
  // Check if running in Electron
  isElectron: true,
  
  // Platform information
  platform: process.platform,
  
  // Register event listeners
  on: (channel, callback) => {
    const validChannels = ['open-settings', 'prayer-time-update']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
    }
  },
  
  // Remove event listeners
  removeListener: (channel, callback) => {
    const validChannels = ['open-settings', 'prayer-time-update']
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback)
    }
  }
})

// Log that preload script has loaded (for debugging)
console.log('Electron preload script loaded')
