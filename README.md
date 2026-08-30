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
| **Sắp giải** | Wizard 5 bước: chọn giải (hoặc tạo mới) → kiểu nhập liệu → Excel danh sách VĐV → bốc thăm, chia cặp, sinh nhánh đấu (22 schema từ 2 đến 32 VĐV) → xác nhận |
| **Chấm đối kháng** | 3/5 giám định, quá bán ghi điểm, cho phép cùng lúc cả đỏ lẫn xanh, chấm lại trận khi kết quả chưa dùng ở trận sau |
| **Chấm thi quyền** | Điểm từng giám định, tính tổng theo luật 3/5, Giám Sát ghi đè được điểm tổng |
| **Hai sân song song** | Sân A và sân B chấm đồng thời, kết quả đồng bộ về cùng một giải |
| **Phân quyền** | Đăng nhập Google, chủ giải duyệt người trực sân; giám định vào bằng 2 số của giải |
| **Quản trị** | Bảng điều khiển mọi giải và mọi người: xoá giải, đổi chủ, chỉ định/thay người chấm, rà soát lỗi toàn hệ thống |
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

### Duyệt xong là vào thẳng

Cổng `RequestAccessPanel` nghe **một** dòng trạng thái, `subscribeAccessState`,
gộp sẵn từ hai nhánh `tournamentStaff/{t}/{uid}` và `tournamentRequest/{t}/{uid}`
theo đúng một luật: **có nhân sự thì thắng**, đơn không nói gì được nữa.

Không phải chuyện gọn code. `approveRequest` ghi nhân sự TRƯỚC rồi mới xoá đơn,
nên máy người xin quyền nhận hai sự kiện rời rạc — "đã có quyền", rồi vài trăm
mili-giây sau là "đơn đã biến mất". Nghe hai nhánh bằng hai tai nghe riêng thì
sự kiện thứ hai đè lên cái trước, và màn hình tụt ngược từ "vào thẳng sân" về
"Xin quyền giám sát" đúng lúc vừa được duyệt xong: người kia bấm xin lại, chủ
giải thấy đơn về thêm lần nữa, cả hai quay vòng. Nhóm test `xin-quyen` khoá lại
đúng chỗ đó — nó soi **cả dãy** trạng thái, không chỉ giá trị cuối.

Chủ giải tick sân lệch nội dung (chỉ đối kháng, mà người kia đang mở trang thi
quyền) thì ra màn riêng có lối sang trang đúng, **không** phải màn xin quyền —
mời bấm xin lại ở đó chỉ dựng lại đúng cái vòng lặp trên.

**Chuông báo đơn** (`NotificationBell`) nằm cạnh ảnh tài khoản trên mọi thanh
tiêu đề, gom đơn của **mọi** giải mình làm chủ. Trước đây bảng duyệt chỉ có ở
`/thiet-dat`, mà chủ giải giữa giải thì ngồi ở màn giám sát — đơn về không ai
thấy. Chuông tự ẩn khi không có đơn nào chờ.

**Báo bằng hình, không có tiếng.** Màn giám sát đã có tiếng riêng cho lượt thi
(`Reg.mp3`) và cho hiệp đấu (`School_Bell.mp3`); mượn lại một trong hai cho
việc khác nghĩa hẳn thì giữa giải không ai biết tiếng vừa rồi nghĩa là gì. Chấm
đỏ + con số trên chuông là đủ. Không có server nên cũng không có push
notification: không mở app thì không thấy đơn, và đó là giới hạn thật.

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

### Quản trị (`/quan-tri`)

Mệnh đề `appAdmin/{uid} === true` nằm sẵn trong **mọi** rule của chủ giải, nên
admin ghi được ở đâu chủ giải ghi được ở đó. Trang `/quan-tri` là chỗ để dùng
những quyền ấy, chia làm ba tab:

| Tab | Làm được gì |
|---|---|
| **Giải đấu** | Mở / đóng / mở lại · đổi tên · bật-tắt “Mở tự do” · đổi chủ giải (chọn từ danh sách, không phải dán uid) · **xoá giải** · duyệt hộ đơn xin quyền · **chỉ định thẳng** người trực sân · **thay người trực sân** · bảng mã + mở khoá mã · vào chấm hộ |
| **Người dùng** | Tìm theo tên / email / uid · xem một người làm chủ giải nào, trực sân nào, đang chờ duyệt ở đâu · chỉ định vào một giải · **gỡ khỏi mọi giải** |
| **Chẩn đoán** | Rà soát toàn hệ thống (giải mở mà chưa cấp mã, giải đóng mà mã còn sống, hai giám sát cùng một sân, giải chưa có chủ, giải mở mà chưa có lịch…) · **dựng lại chỉ mục giải** · bảng máy giám định đang mở, realtime |

Admin còn đi thẳng vào `/thiet-dat` và màn giám sát của **mọi** giải mà không
phải xin quyền — dùng khi phải thay người ngay giữa trận. Đường tắt là
`?giai=<khoá giải>` (trang quản trị tự gắn sẵn).

**Ba giới hạn nói thẳng, không code vòng qua được:**

1. **Không khoá / không xoá được tài khoản Google.** Việc đó cần Admin SDK mà
   app không có server. “Gỡ khỏi mọi giải” cắt sạch đường ghi điểm trong app,
   nhưng người đó vẫn đăng nhập được.
2. **Chỉ mục giải không tự phát hiện được thiếu sót.** Danh sách giải ở khắp
   nơi đọc từ `tournamentIndex` — bản sao nhẹ của `tournament/{t}/setting`, vì
   đọc cả cây thật là vài MB mỗi lần. Chỉ mục được vá ở đường **ghi** (mọi chỗ
   đổi `setting` đều gọi `syncTournamentIndex`), nhưng một lượt ghi hỏng giữa
   chừng vẫn làm thiếu một dòng, và giải đó biến mất khỏi mọi danh sách. Không
   có phép kiểm tự động nào bắt được — vá bằng nút **“Dựng lại chỉ mục”** ở tab
   Rà soát của trang quản trị.
3. **Không có bảng “ai đang là admin”.** Rules chỉ mở `.read` của
   `appAdmin/{uid}` cho chính chủ, nên không liệt kê ngược ra được — kể cả khi
   bạn là admin. Cấp quyền admin vẫn đặt tay trong Firebase Console: không có
   server thì mọi đường cấp quyền trong app đều là đường để người khác leo lên.

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
  components/        ui/ · auth/ · admin/ · referee/ · combat/ · tournament/ · common/
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

**Tạo giải và quản lý giải là hai việc khác nhau, ở hai trang khác nhau.**
`/tao-giai` chỉ lo một luồng: chọn giải → nhập VĐV → sinh lịch. `/thiet-dat` lo
mọi thứ về một giải đã có: mở / đóng / mở lại · đổi tên · nhận giải cũ về tài
khoản · **xoá giải** · bảng mã · duyệt giám sát · thời gian hiệp, số giám định.
Đừng đặt cùng một hành động ở cả hai nơi — không trang nào hiện đủ trạng thái
của trang kia, nên người dùng sẽ đóng giải ở đây rồi đi tìm lý do vì sao trang
kia vẫn báo đang mở.

**Khoá giải là chuỗi mờ.** `tournament/{t}` từng là mảng dày đặc `0..N`; hệ quả
là xoá một giải ở giữa thủng một lỗ, mà lỗ đó làm chỉ mục mất tin cậy và **mọi**
lần liệt kê giải rơi về đọc cả cây — nên chỉ giải cuối mảng mới xoá hẳn được, và
xoá mềm sinh ra chỉ để giữ mảng liền mạch. Giờ giải mới lấy `push` key, giải cũ
giữ nguyên khoá `"0".."N"` (Realtime Database không có mảng thật, nên **không
phải migrate gì cả**). Đừng `Number()` khoá giải ở bất cứ đâu — làm thế là quay
lại đúng ràng buộc cũ. Xoá mềm nay đúng vai trò của nó: cái thùng rác, khôi phục
lại được.

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
> biết chưa sửa** (⚠️ xfail, không đỏ). Hiện **không còn cờ nào** — 10 bug của
> đợt 30.08.2026 (lost-update khi hai sân cùng ghi một node, cửa sổ chấm điểm
> co lại, thiếu khoá lượt thi thi quyền) đã sửa hết và nay là assert cứng.

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
