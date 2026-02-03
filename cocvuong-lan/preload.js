const { contextBridge, ipcRenderer } = require('electron');

// Expose API cho renderer process
contextBridge.exposeInMainWorld('bridgeAPI', {
  // Lấy thông tin server
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  
  // Lấy danh sách clients
  getClients: () => ipcRenderer.invoke('get-clients'),
  
  // Restart server
  restartServer: () => ipcRenderer.invoke('restart-server'),
  
  // Copy to clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  
  // Mở web app trong browser
  openInBrowser: () => ipcRenderer.invoke('open-in-browser'),
  
  // Hiện main window (Electron)
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  
  // Lấy version/build date
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Event listeners
  onInit: (callback) => {
    ipcRenderer.on('init', (event, data) => callback(data));
  },
  
  onServerReady: (callback) => {
    ipcRenderer.on('server-ready', (event, data) => callback(data));
  },
  
  onLog: (callback) => {
    ipcRenderer.on('log', (event, data) => callback(data));
  },
  
  onClientsUpdate: (callback) => {
    ipcRenderer.on('clients-update', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('init');
    ipcRenderer.removeAllListeners('server-ready');
    ipcRenderer.removeAllListeners('log');
    ipcRenderer.removeAllListeners('clients-update');
  }
});
