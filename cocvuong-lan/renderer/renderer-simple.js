/**
 * Renderer script cho Status Window (Cóc Vương LAN)
 */

// DOM Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const httpUrl = document.getElementById('httpUrl');
const qrCode = document.getElementById('qrCode');
const qrHint = document.getElementById('qrHint');
const btnCopyHttp = document.getElementById('btnCopyHttp');
const btnRestart = document.getElementById('btnRestart');
const btnOpenMain = document.getElementById('btnOpenMain');
const clientsList = document.getElementById('clientsList');
const clientsCount = document.getElementById('clientsCount');
const logContainer = document.getElementById('logContainer');

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// Copy HTTP URL (for mobile)
btnCopyHttp.addEventListener('click', async () => {
  const url = httpUrl.value;
  if (url && url !== '...') {
    await window.bridgeAPI.copyToClipboard(url);
    btnCopyHttp.textContent = '✓';
    setTimeout(() => { btnCopyHttp.textContent = '📋'; }, 1500);
  }
});

// Restart server
btnRestart.addEventListener('click', async () => {
  btnRestart.disabled = true;
  btnRestart.textContent = '...';
  await window.bridgeAPI.restartServer();
  setTimeout(() => {
    btnRestart.disabled = false;
    btnRestart.textContent = '🔄 Restart';
  }, 1000);
});

// Open main window (CocVuong Electron window)
btnOpenMain.addEventListener('click', () => {
  if (window.bridgeAPI.showMainWindow) {
    window.bridgeAPI.showMainWindow();
  } else if (window.bridgeAPI.openInBrowser) {
    window.bridgeAPI.openInBrowser();
  }
});

// =============================================================================
// IPC LISTENERS
// =============================================================================

// Server ready
window.bridgeAPI.onServerReady((info) => {
  statusDot.classList.add('running');
  statusText.textContent = `Đang chạy: ${info.localIP}`;
  
  const httpUrlValue = info.httpUrl || `http://${info.localIP}:3000`;
  httpUrl.value = httpUrlValue;
  
  // Update hint to show IP:port directly
  const ipPort = httpUrlValue.replace('http://', '');
  qrHint.textContent = `Quét QR hoặc nhập ${ipPort} vào trình duyệt`;
  
  if (info.qrCode) {
    qrCode.src = info.qrCode;
  }
});

// Clients update - grouped by Arena → Giám Sát → Giám Định
window.bridgeAPI.onClientsUpdate((clients) => {
  clientsCount.textContent = clients.length;
  
  if (clients.length === 0) {
    clientsList.innerHTML = '<div class="empty-text">Chưa có kết nối nào</div>';
    return;
  }
  
  // Group clients by arena
  const arenas = {};
  clients.forEach(client => {
    const arena = client.arena || '?';
    if (!arenas[arena]) {
      arenas[arena] = { gs: [], gd: [] };
    }
    if (client.type === 'giam_sat') {
      arenas[arena].gs.push(client);
    } else {
      arenas[arena].gd.push(client);
    }
  });
  
  // Render grouped clients
  let html = '';
  
  // Sort arenas numerically
  const sortedArenas = Object.keys(arenas).sort((a, b) => {
    const numA = parseInt(a) || 999;
    const numB = parseInt(b) || 999;
    return numA - numB;
  });
  
  sortedArenas.forEach(arena => {
    const arenaClients = arenas[arena];
    const totalInArena = arenaClients.gs.length + arenaClients.gd.length;
    
    html += `<div class="arena-group">`;
    html += `<div class="arena-header">🏟️ Sân ${arena} (${totalInArena})</div>`;
    
    // Giám Sát first
    arenaClients.gs.forEach(client => {
      html += renderClientItem(client, 'gs', 'GS');
    });
    
    // Then Giám Định
    arenaClients.gd.forEach(client => {
      html += renderClientItem(client, 'gd', 'GĐ');
    });
    
    html += `</div>`;
  });
  
  clientsList.innerHTML = html;
});

// Helper function to render a client item
function renderClientItem(client, typeClass, typeName) {
  return `
    <div class="client-item">
      <span class="client-dot"></span>
      <span class="client-type ${typeClass}">${typeName}</span>
      <span class="client-name">${client.name || 'Unknown'}</span>
    </div>
  `;
}

// Log
window.bridgeAPI.onLog((log) => {
  const time = new Date(log.timestamp).toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${log.type}`;
  entry.innerHTML = `<span class="log-time">${time}</span><span>${log.message}</span>`;
  
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
  
  // Giới hạn 50 entries
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.firstChild);
  }
});

// =============================================================================
// INIT
// =============================================================================

const versionFooter = document.getElementById('versionFooter');

async function init() {
  try {
    // Load version info
    if (window.bridgeAPI.getVersion) {
      const versionInfo = await window.bridgeAPI.getVersion();
      if (versionInfo) {
        versionFooter.textContent = `Build: ${versionInfo.buildDate}`;
      }
    }
    
    const info = await window.bridgeAPI.getServerInfo();
    if (info && info.localIP) {
      statusDot.classList.add('running');
      statusText.textContent = `Đang chạy: ${info.localIP}`;
      
      const httpUrlValue = info.httpUrl || `http://${info.localIP}:3000`;
      httpUrl.value = httpUrlValue;
      
      // Update hint to show IP:port directly
      const ipPort = httpUrlValue.replace('http://', '');
      qrHint.textContent = `Quét QR hoặc nhập ${ipPort} vào trình duyệt`;
      
      if (info.qrCode) {
        qrCode.src = info.qrCode;
      }
    }
  } catch (err) {
    console.error('Init error:', err);
  }
}

init();
