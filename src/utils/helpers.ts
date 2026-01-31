/**
 * Các hàm tiện ích cho ứng dụng
 */

/**
 * Chuyển đổi W.X hoặc L.X thành text hiển thị
 */
export const convertWinLoseFormat = (type_no: string | null | undefined): string => {
  if (!type_no || typeof type_no !== 'string') {
    return type_no || '';
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
 */
export const getModes = (array: number[]): number => {
  if (!array || array.length === 0) {
    return 0;
  }

  const frequency: Record<string, number> = {};
  let maxFreq = 0;
  const modes: string[] = [];

  for (const value of array) {
    const key = String(value);
    frequency[key] = (frequency[key] || 0) + 1;
    if (frequency[key] > maxFreq) {
      maxFreq = frequency[key];
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
 */
export const formatTime = (totalSeconds: number): string => {
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
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Resize text để fit vào container
 */
export const resizeTextToFit = (
  parentSelector: string | HTMLElement, 
  childSelector: string | HTMLElement, 
  maxFontSize: number = 100
): void => {
  // Get elements from selectors
  let parentElement: HTMLElement | null | undefined = parentSelector as HTMLElement;
  let childElement: HTMLElement | null | undefined = childSelector as HTMLElement;
  
  if (typeof parentSelector === 'string') {
    parentElement = document.getElementsByClassName(parentSelector)[0] as HTMLElement;
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
 */
export const playSound = (elementId: string = 'sound'): void => {
  const sound = document.getElementById(elementId) as HTMLAudioElement | null;
  if (!sound || !sound.paused) {
    return;
  }
  sound.currentTime = 0;
  sound.play();
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>): void {
    const later = (): void => {
      if (timeout) clearTimeout(timeout);
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return function executedFunction(...args: Parameters<T>): void {
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
