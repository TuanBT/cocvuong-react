// DOM Elements
const elements = {
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.getElementById('statusText'),
  localIP: document.getElementById('localIP'),
  wsPort: document.getElementById('wsPort'),
  qrCode: document.getElementById('qrCode'),
  qrLoading: document.getElementById('qrLoading'),
  wsUrl: document.getElementById('wsUrl'),
  btnCopy: document.getElementById('btnCopy'),
  connectionsList: document.getElementById('connectionsList'),
  gsListA: document.getElementById('gsListA'),
  gdListA: document.getElementById('gdListA'),
  gsListB: document.getElementById('gsListB'),
  gdListB: document.getElementById('gdListB'),
  logContainer: document.getElementById('logContainer'),
  btnRestart: document.getElementById('btnRestart')
};

// State
let serverInfo = null;
let logs = [];
const MAX_LOGS = 50;

/**
 * Khởi tạo app
 */
async function init() {
  // Đăng ký event listeners từ main process
  window.bridgeAPI.onInit(handleInit);
  window.bridgeAPI.onLog(handleLog);
  window.bridgeAPI.onClientsUpdate(handleClientsUpdate);

  // Button handlers
  elements.btnCopy.addEventListener('click', handleCopy);
  elements.btnRestart.addEventListener('click', handleRestart);

  // Log initial message
  addLog('info', 'Đang khởi động ứng dụng...');
  
  // Fallback: Nếu sau 3 giây chưa nhận init event, tự lấy info
  setTimeout(async () => {
    if (!serverInfo) {
      try {
        const data = await window.bridgeAPI.getServerInfo();
        if (data && data.localIP) {
          handleInit(data);
        }
      } catch (err) {
        // Silent fail - server may not be ready yet
      }
    }
  }, 3000);
}

/**
 * Xử lý init từ main process
 */
function handleInit(data) {
  serverInfo = data;
  
  // Update UI - hiển thị IP:port thay vì ws:// URL
  elements.localIP.textContent = data.localIP;
  elements.wsPort.textContent = data.wsPort;
  
  const addressDisplay = `${data.localIP}:${data.wsPort}`;
  elements.wsUrl.value = addressDisplay;
  
  // Update QR Code (nếu có)
  if (data.qrCode) {
    elements.qrCode.src = data.qrCode;
    elements.qrCode.classList.add('loaded');
  }
  
  // Update status
  updateStatus('running', 'Đang chạy');
  addLog('success', `Khởi động thành công tại ${addressDisplay}`);
}

/**
 * Cập nhật trạng thái hiển thị
 */
function updateStatus(status, text) {
  elements.statusText.textContent = text;
  
  const statusCard = document.querySelector('.status-card');
  statusCard.classList.remove('error');
  
  if (status === 'error') {
    statusCard.classList.add('error');
  }
}

/**
 * Xử lý log từ main process
 */
function handleLog(data) {
  addLog(data.type, data.message);
}

/**
 * Thêm log entry
 */
function addLog(type, message) {
  const now = new Date();
  const time = now.toLocaleTimeString('vi-VN');
  
  logs.unshift({ type, message, time });
  
  // Giữ tối đa MAX_LOGS
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS);
  }
  
  renderLogs();
}

/**
 * Render logs
 */
function renderLogs() {
  elements.logContainer.innerHTML = logs.map(log => `
    <div class="log-entry ${log.type}">
      <span class="time">${log.time}</span>
      <span class="message">${log.message}</span>
    </div>
  `).join('');
}

/**
 * Cập nhật danh sách kết nối - Hiển thị rõ role và sân
 */
function handleClientsUpdate(clients) {
  const container = elements.connectionsList;
  if (!container) return;

  // Nếu không có client nào
  if (!clients || clients.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📱</span>
        <span class="empty-text">Chưa có thiết bị kết nối</span>
      </div>
    `;
    return;
  }

  // Render danh sách với badge role và arena
  container.innerHTML = clients.map(client => {
    const isGiamSat = client.type === 'giam_sat';
    const roleClass = isGiamSat ? 'role-gs' : 'role-gd';
    const roleLabel = isGiamSat ? 'Giám Sát' : 'Giám Định';
    const arenaLabel = client.arena ? `Sân ${client.arena}` : '';
    
    return `
      <div class="connection-item connected">
        <span class="dot"></span>
        <div class="conn-info">
          <span class="name">${client.name}</span>
          <div class="badges">
            <span class="badge ${roleClass}">${roleLabel}</span>
            ${arenaLabel ? `<span class="badge arena">${arenaLabel}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render danh sách kết nối cho một nhóm
 */
function renderConnectionList(container, clients) {
  if (!container) return;
  
  if (!clients || clients.length === 0) {
    container.innerHTML = `
      <div class="connection-item empty">
        <span class="dot"></span>
        <span class="name">Chưa kết nối</span>
      </div>
    `;
    return;
  }

  container.innerHTML = clients.map(client => {
    return `
      <div class="connection-item ${client.connected ? 'connected' : ''}">
        <span class="dot"></span>
        <span class="name">${client.name}</span>
      </div>
    `;
  }).join('');
}

/**
 * Lấy label cho loại client
 */
function getClientTypeLabel(type) {
  const labels = {
    'giam_sat': 'Giám Sát',
    'giam_dinh': 'Giám Định',
    'unknown': 'Chưa xác định'
  };
  
  if (type.startsWith('giam_dinh_')) {
    return `GĐ ${type.split('_')[2]}`;
  }
  
  return labels[type] || type;
}

/**
 * Copy link to clipboard
 */
async function handleCopy() {
  try {
    await window.bridgeAPI.copyToClipboard(elements.wsUrl.value);
    
    // Visual feedback
    elements.btnCopy.textContent = '✓';
    elements.btnCopy.classList.add('copied');
    
    setTimeout(() => {
      elements.btnCopy.textContent = '📋';
      elements.btnCopy.classList.remove('copied');
    }, 2000);
    
    addLog('info', 'Đã copy link vào clipboard');
  } catch (err) {
    addLog('error', 'Không thể copy link');
  }
}

/**
 * Restart server
 */
async function handleRestart() {
  elements.btnRestart.disabled = true;
  elements.btnRestart.textContent = '⏳ Đang khởi động lại...';
  updateStatus('info', 'Đang khởi động lại...');
  
  try {
    await window.bridgeAPI.restartServer();
    
    // Refresh server info
    const newInfo = await window.bridgeAPI.getServerInfo();
    handleInit(newInfo);
    
  } catch (err) {
    addLog('error', `Lỗi khởi động lại: ${err.message}`);
    updateStatus('error', 'Lỗi');
  }
  
  elements.btnRestart.disabled = false;
  elements.btnRestart.textContent = '🔄 Khởi động lại Server';
}

// Start app
init();
