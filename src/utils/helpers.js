/**
 * Các hàm tiện ích cho ứng dụng
 */

/**
 * Chuyển đổi W.X hoặc L.X thành text hiển thị
 * @param {string} type_no - Chuỗi dạng "W.1" hoặc "L.1" hoặc tên vận động viên
 * @returns {string} - Chuỗi đã được chuyển đổi
 */
export const convertWinLoseFormat = (type_no) => {
  if (!type_no || typeof type_no !== 'string') {
    return type_no;
  }
  
  const parts = type_no.split('.');
  const type = parts[0];
  const no = parts[1];

  if (type === "W" && no) {
    return `THẮNG TRẬN ${no}`;
  } else if (type === "L" && no) {
    return `THUA TRẬN ${no}`;
  }
  
  return type_no;
};

/**
 * Lấy mode (giá trị xuất hiện nhiều nhất) từ mảng số
 * @param {Array<number>} array - Mảng các số
 * @returns {number} - Mode hoặc 0 nếu có nhiều mode
 */
export const getModes = (array) => {
  if (!array || array.length === 0) {
    return 0;
  }

  const frequency = {};
  let maxFreq = 0;
  const modes = [];

  for (const value of array) {
    frequency[value] = (frequency[value] || 0) + 1;
    if (frequency[value] > maxFreq) {
      maxFreq = frequency[value];
    }
  }

  for (const key in frequency) {
    if (frequency[key] === maxFreq) {
      modes.push(key);
    }
  }

  // Nếu chỉ có 1 mode, trả về giá trị đó
  if (modes.length === 1) {
    return +modes[0];
  }

  // Nếu có nhiều mode (hòa), trả về 0
  return 0;
};

/**
 * Format thời gian từ giây sang MM:SS
 * @param {number} totalSeconds - Tổng số giây
 * @returns {string} - Chuỗi dạng "MM:SS"
 */
export const formatTime = (totalSeconds) => {
  if (totalSeconds < 0) {
    return "00:00";
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds - (minutes * 60));
  
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  
  return `${minutesStr}:${secondsStr}`;
};

/**
 * Deep clone một object
 * @param {any} obj - Object cần clone
 * @returns {any} - Object đã được clone
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Resize text để fit vào container
 * @param {string|HTMLElement} parentSelector - Element cha hoặc class name (không có dấu .)
 * @param {string|HTMLElement} childSelector - Element chứa text hoặc id (không có dấu #)
 * @param {number} maxFontSize - Font size tối đa (mặc định 100px)
 */
export const resizeTextToFit = (parentSelector, childSelector, maxFontSize = 100) => {
  // Get elements from selectors
  let parentElement = parentSelector;
  let childElement = childSelector;
  
  if (typeof parentSelector === 'string') {
    parentElement = document.getElementsByClassName(parentSelector)[0];
  }
  
  if (typeof childSelector === 'string') {
    childElement = document.getElementById(childSelector);
  }
  
  if (!parentElement || !childElement) return;
  
  let fontSize = 10;
  childElement.style.fontSize = `${fontSize}px`;

  // Tăng font size đến khi fit
  while (childElement.offsetHeight < parentElement.offsetHeight && fontSize < maxFontSize) {
    fontSize++;
    childElement.style.fontSize = `${fontSize}px`;
  }

  // Giảm nếu bị overflow
  while (childElement.offsetHeight > parentElement.offsetHeight && fontSize > 0) {
    fontSize--;
    childElement.style.fontSize = `${fontSize}px`;
  }
};

/**
 * Phát âm thanh
 * @param {string} elementId - ID của element audio
 */
export const playSound = (elementId = 'sound') => {
  const sound = document.getElementById(elementId);
  if (!sound || !sound.paused) {
    return;
  }
  sound.currentTime = 0;
  sound.play();
};

/**
 * Debounce function
 * @param {Function} func - Hàm cần debounce
 * @param {number} wait - Thời gian chờ (ms)
 * @returns {Function}
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Hàm cần throttle
 * @param {number} limit - Giới hạn thời gian (ms)
 * @returns {Function}
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default {
  convertWinLoseFormat,
  getModes,
  formatTime,
  deepClone,
  resizeTextToFit,
  playSound,
  debounce,
  throttle
};
