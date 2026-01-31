/**
 * Các màu sắc sử dụng trong ứng dụng
 * Dựa trên bảng màu Flat UI
 */

export const COLORS = {
  // Màu chính cho trạng thái
  GREEN: "#27ae60",      // Lục - Green (đang chạy)
  YELLOW: "#f1c40f",     // Vàng - Yellow (tạm dừng)
  RED: "#e74c3c",        // Đỏ - Red (hết giờ/cảnh báo)
  ORANGE: "#e67e22",     // Cam - Orange (nghỉ giữa hiệp)
  
  // Màu trung tính
  GRAY: "#95a5a6",       // Xám - Gray
  WHITE: "#ffffff",      // Trắng - White
  BLACK: "#000000",      // Đen - Black
  SILVER: "#bdc3c7",     // Bạc - Silver (chờ)
  
  // Màu nền
  BODY_BG: "#ecf0f1",    // Xám nhạt - Body background
  
  // Màu văn bản
  MIDNIGHT_BLUE: "#2c3e50", // Xanh đậm
  WET_ASPHALT: "#34495e",   // Xanh xám
  CLOUDS: "#ecf0f1",        // Trắng xám
};

// Alias cho tiện sử dụng
export const { 
  GREEN, 
  YELLOW, 
  RED, 
  ORANGE, 
  GRAY, 
  WHITE, 
  BLACK, 
  SILVER, 
  BODY_BG,
  MIDNIGHT_BLUE,
  WET_ASPHALT,
  CLOUDS
} = COLORS;

export default COLORS;
