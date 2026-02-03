/**
 * Preload script cho Remote URL (main window)
 * Inject thông tin Bridge vào web context
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal API cho web page
contextBridge.exposeInMainWorld('cocvuongElectron', {
  // Kiểm tra đang chạy trong Electron
  isElectron: true,
  
  // Lấy thông tin bridge
  getBridgeInfo: () => ipcRenderer.invoke('get-server-info'),
  
  // Event listener khi bridge ready
  onBridgeReady: (callback) => {
    window.addEventListener('cocvuong-bridge-ready', (event) => {
      callback(event.detail);
    });
  }
});

// Log để debug
console.log('[CocVuong Desktop] Preload loaded for remote URL');
