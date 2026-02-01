const { contextBridge, ipcRenderer } = require('electron');

// Expose API cho renderer process
contextBridge.exposeInMainWorld('bridgeAPI', {
  // Lấy thông tin server
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  
  // Restart server
  restartServer: () => ipcRenderer.invoke('restart-server'),
  
  // Copy to clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  
  // Event listeners
  onInit: (callback) => {
    ipcRenderer.on('init', (event, data) => callback(data));
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
    ipcRenderer.removeAllListeners('log');
    ipcRenderer.removeAllListeners('clients-update');
  }
});
