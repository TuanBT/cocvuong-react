#!/bin/bash

# =============================================================================
# CocVuong Bridge - Build Script
# Đóng gói app Electron cho macOS và Windows
# =============================================================================

# Chuyển đến thư mục chứa script
cd "$(dirname "$0")"

echo "=============================================="
echo "🌉 CocVuong Bridge - Build Script"
echo "=============================================="
echo ""

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt!"
    echo "Vui lòng cài Node.js từ https://nodejs.org"
    read -p "Nhấn Enter để thoát..."
    exit 1
fi

# Step 1: Build web app
echo "📦 Step 1: Build web app..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build web app thất bại!"
    read -p "Nhấn Enter để thoát..."
    exit 1
fi
echo "✅ Build web app thành công!"
echo ""

# Step 2: Copy build folder vào cocvuong-lan
echo "📋 Step 2: Copy build folder..."
rm -rf cocvuong-lan/build
cp -r build cocvuong-lan/build
if [ $? -ne 0 ]; then
    echo "❌ Copy build folder thất bại!"
    read -p "Nhấn Enter để thoát..."
    exit 1
fi

# Tạo file buildInfo.json với ngày build
BUILD_DATE=$(date +"%d/%m/%Y")
echo "{\"buildDate\": \"$BUILD_DATE\"}" > cocvuong-lan/buildInfo.json
echo "✅ Copy build folder và tạo buildInfo.json thành công!"
echo ""

# Step 3: Install dependencies
echo "📥 Step 3: Install dependencies cho Electron..."
cd cocvuong-lan
npm install
if [ $? -ne 0 ]; then
    echo "❌ Install dependencies thất bại!"
    read -p "Nhấn Enter để thoát..."
    exit 1
fi
echo "✅ Install dependencies thành công!"
echo ""

# Step 4: Build Electron app
echo "🔨 Step 4: Build Electron app..."
echo ""
echo "Chọn platform để build:"
echo "  1) macOS only"
echo "  2) Windows only"
echo "  3) Cả macOS và Windows"
echo "  4) Thoát"
echo ""
read -p "Nhập lựa chọn (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🍎 Building for macOS..."
        npm run build:mac
        ;;
    2)
        echo ""
        echo "🪟 Building for Windows..."
        npm run build:win
        ;;
    3)
        echo ""
        echo "🍎🪟 Building for macOS và Windows..."
        npm run build:all
        ;;
    4)
        echo "👋 Thoát!"
        exit 0
        ;;
    *)
        echo "❌ Lựa chọn không hợp lệ!"
        read -p "Nhấn Enter để thoát..."
        exit 1
        ;;
esac

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build Electron app thất bại!"
    read -p "Nhấn Enter để thoát..."
    exit 1
fi

echo ""
echo "=============================================="
echo "✅ BUILD THÀNH CÔNG!"
echo "=============================================="
echo ""
echo "📁 Output files trong: cocvuong-lan/dist/"
echo ""

# Liệt kê các file output
if [ -d "dist" ]; then
    echo "Files đã tạo:"
    ls -lh dist/ | grep -E "\.(dmg|exe|zip|AppImage)$"
fi

echo ""
echo "📤 Bạn có thể:"
echo "   - Upload lên GitHub Releases"
echo "   - Copy trực tiếp cho end user"
echo ""

# Mở folder dist
open dist 2>/dev/null || explorer.exe dist 2>/dev/null

read -p "Nhấn Enter để thoát..."
