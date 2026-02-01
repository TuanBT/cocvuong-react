# CocVuong Bridge

Ứng dụng cầu nối LAN cho hệ thống chấm điểm CocVuong. Sử dụng khi mạng Internet không ổn định.

## 📋 Yêu cầu

- Windows 10/11 hoặc macOS 10.13+
- Tất cả các thiết bị (laptop Giám Sát, điện thoại Giám Định) phải cùng mạng WiFi

## 🚀 Cách sử dụng

### Bước 1: Chạy CocVuong Bridge

**Windows:**
- Double-click file `CocVuong-Bridge.exe`

**Mac:**
- Mở file `CocVuong-Bridge.app`

### Bước 2: Mở trang Giám Sát

1. Mở trình duyệt trên laptop
2. Truy cập `cocvuong.com`
3. Vào trang Giám Sát như bình thường
4. Mở **Thiết đặt** → **Kết nối LAN (Bridge)**
5. Copy link từ app Bridge (ví dụ: `ws://192.168.1.100:8765`)
6. Dán vào ô địa chỉ và nhấn **Kết nối**

### Bước 3: Kết nối từ điện thoại Giám Định

1. Scan QR Code trên app Bridge
2. Hoặc nhập link trực tiếp vào trình duyệt
3. Vào trang Giám Định
4. Chọn sân, chọn số Giám Định như bình thường

### Bước 4: Chấm điểm

- Giám Định bấm nút chấm điểm như bình thường
- Điểm sẽ hiện ngay lập tức trên màn Giám Sát
- **Không cần Internet**, tất cả đi qua mạng LAN

## 🔧 Giao diện Bridge App

```
┌────────────────────────────────────┐
│  🟢 Đang chạy                      │
│  IP: 192.168.1.100                 │
│  Port: 8765                        │
│                                    │
│  ┌──────────────┐                 │
│  │   QR Code    │                 │
│  └──────────────┘                 │
│                                    │
│  Link: ws://192.168.1.100:8765    │
│                                    │
│  Kết nối:                         │
│  • Giám Sát A: 🟢                 │
│  • Giám định 1: 🟢                │
│  • Giám định 2: 🟢                │
│  • Giám định 3: ⚪ Chờ...         │
└────────────────────────────────────┘
```

## ❓ Câu hỏi thường gặp

### Q: Không thể kết nối?
- Kiểm tra tất cả thiết bị có cùng mạng WiFi không
- Tắt Firewall tạm thời
- Khởi động lại app Bridge

### Q: Điểm không hiện trên Giám Sát?
- Kiểm tra trạng thái kết nối trong Thiết đặt
- Thử ngắt và kết nối lại

### Q: Có thể dùng Internet bình thường không?
- Có! Nếu không bật Bridge, hệ thống vẫn chạy qua Firebase như bình thường
- Bridge chỉ là lựa chọn thay thế khi mạng không ổn định

## 🛠️ Dành cho Developer

### Cài đặt dependencies

```bash
cd bridge-app
npm install
```

### Chạy development

```bash
npm start
```

### Build cho production

```bash
# Windows
npm run build:win

# Mac
npm run build:mac

# Cả hai
npm run build:all
```

### Cấu trúc thư mục

```
bridge-app/
├── package.json        # Config npm & electron-builder
├── main.js             # Electron main process + WebSocket server
├── preload.js          # Bridge giữa main & renderer
├── renderer/
│   ├── index.html      # Giao diện
│   ├── styles.css      # CSS
│   └── renderer.js     # Logic UI
└── assets/
    └── icon.ico        # Icon app
```

## 📝 Changelog

### v1.0.0
- Phiên bản đầu tiên
- WebSocket server cho kết nối LAN
- QR Code cho Giám Định dễ kết nối
- Hiển thị trạng thái kết nối realtime
