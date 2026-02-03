# CocVuong Bridge

Bridge Server cho hệ thống chấm điểm võ thuật qua mạng LAN.

## Chức năng

- **HTTP Server** (port 3000): Serve web app cho Giám Sát và Giám Định truy cập
- **WebSocket Bridge** (port 9765): Đồng bộ điểm số real-time giữa các thiết bị

## Kiến trúc

```
CocVuong Bridge (Electron App)
├── HTTP Server :3000
│   └── Serve React build (web app)
└── WebSocket Bridge :9765
    └── Relay messages giữa Giám Sát ↔ Giám Định

Giám Sát: Chrome → http://IP:3000 → Web App → ws://IP:9765
Giám Định: Quét QR → http://IP:3000 → Web App → ws://IP:9765
```

## Cài đặt Development

### 1. Cài dependencies
```bash
cd cocvuong-lan
npm install
```

### 2. Build web app và copy
Build web app từ thư mục gốc:
```bash
# Từ thư mục gốc cocvuong
npm run build

# Copy vào cocvuong-lan
cp -r build cocvuong-lan/build    # macOS/Linux
```

Hoặc:
```bash
cd cocvuong-lan
npm run copy-build       # macOS/Linux
npm run copy-build:win   # Windows
```

### 3. Chạy development
```bash
npm start
```

## Build Production

```bash
npm run build:mac   # macOS (.dmg)
npm run build:win   # Windows (.exe)
```

Output sẽ nằm trong folder `dist/`

## Sử dụng

### Chuẩn bị
1. Đảm bảo laptop và tất cả điện thoại cùng mạng WiFi
2. Khởi động **CocVuong Bridge** trên laptop Giám Sát

### Khi app khởi động
App hiển thị:
- **Địa chỉ web**: `http://192.168.x.x:3000`
- **QR Code**: Chứa địa chỉ web để quét nhanh
- **Danh sách kết nối**: Hiển thị các thiết bị đang kết nối

### Giám Sát
1. Mở Chrome trên laptop
2. Nhập địa chỉ: `http://192.168.x.x:3000`
3. Vào trang **Giám Sát** như bình thường
4. Bridge tự động kết nối (không cần cấu hình)

### Giám Định
1. Dùng điện thoại quét QR code
2. Hoặc nhập địa chỉ vào trình duyệt
3. Vào trang **Giám Định** như bình thường
4. Bridge tự động kết nối

### Chấm điểm
- Giám Định bấm nút chấm điểm như bình thường
- Điểm hiện ngay lập tức trên màn Giám Sát
- **KHÔNG cần Internet**, tất cả đi qua mạng LAN

## Files

```
cocvuong-lan/
├── main-bridge.js      # Main process - HTTP + WebSocket servers
├── bridge-server.js    # WebSocket Bridge logic
├── preload.js          # Expose API cho renderer
├── package.json        # Dependencies và build config
├── renderer/
│   ├── index-simple.html   # Status UI
│   └── renderer-simple.js  # Status UI logic
├── assets/
│   ├── icon.png        # App icon
│   └── tray-icon.png   # Tray icon (macOS)
└── build/              # Web app build (copy từ ../build)
```

## Ports

| Service | Port | Mô tả |
|---------|------|-------|
| HTTP Server | 3000 | Serve web app |
| WebSocket Bridge | 9765 | Real-time messaging |

## Lưu ý

- ⚠️ **Phải copy folder `build/`** từ web app trước khi chạy
- 📶 Tất cả thiết bị phải cùng mạng WiFi/LAN
- 🌐 Không cần internet sau khi đã load trang (chế độ Bridge thuần)
- 🔄 Nếu có vấn đề, nhấn nút **Restart** trong app

## Troubleshooting

### App báo "Build folder not found"
→ Chạy `npm run build` ở thư mục gốc, sau đó copy folder `build/` vào `cocvuong-lan/`

### Không thấy QR code
→ Kiểm tra mạng LAN, đảm bảo có IP local (không phải 127.0.0.1)

### Điện thoại không load được trang
→ Kiểm tra cùng mạng WiFi với laptop
→ Thử tắt firewall tạm thời trên laptop

### Điểm không hiển thị trên Giám Sát
→ Kiểm tra cả 2 thiết bị đã kết nối Bridge (nhìn danh sách kết nối trong app)
→ Đảm bảo chọn đúng sân và giải đấu
