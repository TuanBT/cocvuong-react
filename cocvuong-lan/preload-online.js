/**
 * Preload script cho main window (load online URL)
 * Inject bridge info vào page
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose API cho web page (nếu cần)
contextBridge.exposeInMainWorld('cocvuongElectron', {
  isElectron: true,
  
  // Get bridge info
  getBridgeInfo: () => ipcRenderer.invoke('get-server-info'),
  
  // Listen for bridge ready
  onBridgeReady: (callback) => {
    ipcRenderer.on('bridge-ready', (event, info) => callback(info));
  }
});

// Log for debugging
console.log('[CocVuong] Electron preload loaded');
