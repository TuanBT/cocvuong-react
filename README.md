# Cóc Vương

Phần mềm chấm điểm và điều hành giải võ thuật cổ truyền — chạy trên trình duyệt,
đồng bộ thời gian thực giữa nhiều máy trong sân qua Firebase Realtime Database.

Một giải gồm hai loại nội dung, cả hai đều chấm được cùng lúc trên **2 sân (A và B)**:

- **Đối kháng** — 3 hoặc 5 giám định bấm điểm; quá bán cùng chấm một bên trong
  cửa sổ 2 giây thì điểm được ghi. Có đồng hồ hiệp, cảnh cáo (NN/CC/YT), đòn
  chân, nhánh đấu loại trực tiếp tự sinh.
- **Thi quyền** — mỗi giám định cho một điểm; 5 giám định thì bỏ điểm cao nhất
  và thấp nhất lấy 3 điểm giữa, 3 giám định thì cộng cả 3. Tự xếp hạng trong
  từng nội dung.

🌐 Đang chạy tại **[cocvuong.com](https://cocvuong.com)**

---

## Tính năng

| Nhóm | Chi tiết |
|---|---|
| **Sắp giải** | Nhập Excel danh sách VĐV thô → tự bốc thăm, chia cặp, sinh nhánh đấu (22 schema từ 2 đến 32 VĐV) → xuất file kết quả |
| **Chấm đối kháng** | 3/5 giám định, quá bán ghi điểm, cho phép cùng lúc cả đỏ lẫn xanh, chấm lại trận khi kết quả chưa dùng ở trận sau |
| **Chấm thi quyền** | Điểm từng giám định, tính tổng theo luật 3/5, Giám Sát ghi đè được điểm tổng |
| **Hai sân song song** | Sân A và sân B chấm đồng thời, kết quả đồng bộ về cùng một giải |
| **Phân quyền** | Đăng nhập Google, chủ giải duyệt người trực sân; giám định vào bằng 2 số của giải |
| **Hiển thị** | Cờ quốc gia (11 nước Đông Nam Á), chữ in đậm để nhìn từ xa, màn hình thông tin công khai cho khán giả |
| **Ngoại tuyến** | Hàng đợi ghi khi mất mạng, tự gửi lại khi có lại kết nối |
| **Xuất dữ liệu** | Excel (`xlsx`) cho lịch thi đấu và kết quả |

Nhật ký yêu cầu của chủ giải qua các mùa giải: [docs/lich-su-tinh-nang.md](docs/lich-su-tinh-nang.md).

## Ba vai, ba lối vào

Kiến trúc quyền được xếp thành ba tầng cổng, đúng thứ tự (xem [src/index.tsx](src/index.tsx)):

```
AuthGate            → phải có tài khoản Google thật
RequestAccessPanel  → phải được chủ giải duyệt, và đã biết trực sân nào
Container           → vào thẳng trận, không hỏi gì thêm
```

**Giám định không đi qua tầng nào cả.** Ở `/gd` họ gõ **đúng 2 số của giải**,
chạm chọn sân và số giám định của mình, rồi màn chấm điểm tự đọc phiên từ
`codeSession`:

```
mã = [2 số của giải][sân][vị trí giám định]
     ví dụ giải 83:  8311 = Sân A GĐ1   ·   8322 = Sân B GĐ2
              người gõ ─┘└─ máy ghép từ hai cái chạm
```

Một mã là **một ô chấm điểm đã được trói sẵn** — vào là đúng giải, đúng sân,
đúng vị trí, bỏ hẳn ba vòng chọn vốn là chỗ dễ sai nhất giữa giải. Hai số cuối
để **máy ghép** chứ không bắt người gõ: cả đoàn chỉ phải nhớ một số, và gõ nhầm
một chữ số thì không còn rơi vào bàn chấm thật của người khác được nữa. Mã được
"claim" bằng `claimedUid`, và security rules đọc `slot` từ `codeSession` để
quyết định cho ghi ở đâu — không tự bịa `slot` được.

| Vai | Vào bằng | Đường dẫn |
|---|---|---|
| Chủ giải | Google + là chủ giải | `/tao-giai`, `/thiet-dat` |
| Giám sát | Google + được duyệt | `/giam-sat-doi-khang`, `/giam-sat-thi-quyen` |
| Giám định | 2 số của giải | `/gd` → `/giam-dinh-doi-khang`, `/giam-dinh-thi-quyen` |
| Khán giả | Không cần gì | `/thong-tin-doi-khang`, `/thong-tin-thi-quyen` |
| Quản trị | Google + trong `appAdmin` | `/quan-tri` |

Thêm `?demo=1` vào màn giám sát để dùng thử: phiên ẩn danh, giải thử, không cần
Google và không cần duyệt.

## Bắt đầu

Yêu cầu: **Node 18+** (đang phát triển trên Node 22), npm.

```bash
git clone https://github.com/TuanBT/cocvuong-react.git
cd cocvuong-react
npm install
npm start          # chạy với .env.development → http://localhost:3000
```

| Lệnh | Việc |
|---|---|
| `npm start` | Dev server, trỏ vào Firebase **dev** |
| `npm run start:prod` | Dev server nhưng trỏ vào Firebase **production** — cẩn thận |
| `npm run build` | Build production vào `build/` |
| `./deploy.command` | Build rồi `firebase deploy` (macOS; Windows dùng `deploy.bat`) |

### Biến môi trường

Cấu hình nằm trong `.env.development` và `.env.production`, đọc qua
[src/firebase.ts](src/firebase.ts):

```
REACT_APP_FIREBASE_ENV
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_DATABASE_URL
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
```

> **Về API key nằm trong repo:** đây là khoá web của Firebase, vốn được nhúng
> thẳng vào bundle mà ai mở DevTools cũng đọc được — nó định danh dự án chứ
> không phải mật khẩu. Thứ thật sự chặn ghi bậy là
> [database.rules.json](database.rules.json), không phải việc giấu khoá này.

> **`authDomain` phải là chính domain của app.** Safari trên iPhone chặn storage
> bên thứ ba: để `authDomain` khác domain đang chạy thì đăng nhập Google quay về
> tay không. Nhớ thêm domain vào Authentication → Settings → Authorized domains.

## Cấu trúc

```
src/
  index.tsx          định tuyến + ba tầng cổng quyền
  firebase.ts        khởi tạo Firebase, giữ phiên qua reload
  containers/        mỗi màn hình một container (giám sát, giám định, thiết đặt…)
  components/        ui/ · auth/ · referee/ · combat/ · tournament/ · common/
  services/          mọi thao tác ghi Firebase đi qua đây
    combatWriteService.ts    ghi trận, điền VĐV, chốt điểm đối kháng
    martialWriteService.ts   chấm điểm, tính tổng, xếp hạng thi quyền
    accessCodeService.ts     số của giải, mã 4 số, phiên chấm của giám định
    offlineService.ts        hàng đợi ghi khi mất mạng
    authService.ts · staffService.ts · adminService.ts
  utils/
    scheduleBuilder.ts   Excel thô → lịch đối kháng + nhánh đấu
    martialBuilder.ts    gom nội dung / đội thi quyền
    scoreSync.ts         giám định gửi điểm ↔ giám sát nhận
  constants/         settings mặc định, 22 schema nhánh đấu, màu, vòng đấu
database.rules.json  security rules — tầng chặn thật sự
tests/e2e/           bộ test đầu-cuối headless
```

**Quy ước quan trọng:** logic không được nằm trong container. Mọi thứ test cần
gọi đều phải ở `services/` hoặc `utils/` — nhờ vậy bộ e2e gọi được **code thật**
chứ không chép lại, và sửa `src/` là test bắt được ngay.

## Kiểm thử

Bộ e2e nhận file Excel, tự tạo giải, cho 2 sân chạy hết mọi trận rồi in kết quả.

```bash
npm run test:e2e         # tất cả, trên Firebase Emulator (khuyến nghị)
npm run test:e2e:live    # trên DB dev thật
npm run test:e2e:parallel   # chỉ nhóm 2 sân song song
npm run test:e2e:phanquyen  # chỉ nhóm security rules
```

Emulator cần Java (`brew install --cask temurin`); chưa có Java thì dùng bản `:live`.

Hướng dẫn đầy đủ — đưa file Excel của mình vào, giữ lại dữ liệu để xem tận mắt,
cơ chế `xfail`, và **danh sách bug đang được ghi nhận** — ở
[tests/README.md](tests/README.md).

> Bộ test dùng cờ `knownBug` để phân biệt **hồi quy** (❌ đỏ suite) với **bug đã
> biết chưa sửa** (⚠️ xfail, không đỏ). Hiện có 10 bug đang được canh như vậy,
> phần lớn là lost-update khi hai sân cùng ghi một node.

## Firebase

Dự án: `cocvuong-se60824` ([.firebaserc](.firebaserc)).

```bash
firebase deploy --only database   # chỉ đẩy rules
firebase deploy --only hosting    # chỉ đẩy web
firebase deploy                   # cả hai
```

Emulator (cấu hình ở [firebase.json](firebase.json)): Database cổng `9000`,
Auth cổng `9099`.

## Công nghệ

React 17 · TypeScript 4.9 · Firebase 9 (Realtime Database + Auth) ·
React Router · Bootstrap 5 + Tailwind · SheetJS (`xlsx`) · GA4

## Giấy phép

[MIT](LICENSE)
