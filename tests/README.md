# Bộ test E2E — Cóc Vương

Đưa file Excel danh sách VĐV vào, bộ test tự tạo giải, cho 2 sân chạy hết mọi
trận / mọi lượt thi, rồi in ra kết quả.

## Chạy

```bash
npm run test:e2e             # tất cả, trên Firebase Emulator (khuyến nghị)
npm run test:e2e:live        # trên DB dev thật (fvc-score)

npm run test:e2e:parallel    # chỉ nhóm 2 sân đối kháng song song
npm run test:e2e:thiquyen    # chỉ nhóm thi quyền
npm run test:e2e:data        # chỉ nhóm "chạy hết bộ data"
```

### Đưa file Excel của mình vào

```bash
# tự nhận biết file là Đối Kháng hay Thi Quyền (theo tiêu đề cột 2)
npm run test:e2e -- --file=~/Desktop/vdv-giai-2026.xlsx

# chỉ định riêng từng loại
npm run test:e2e -- --dk=doikhang.xlsx --tq=thiquyen.xlsx

# chỉ chạy hết bộ data để lấy kết quả, trên DB dev
npx tsx tests/e2e/run.ts --live --only=het-data --file=vdv.xlsx
```

Không truyền gì thì dùng 2 file mẫu trong `tests/e2e/`:
`data_doikhang_tho.xlsx` (90 VĐV / 12 hạng cân) và
`data_thiquyen_tho.xlsx` (94 VĐV / 11 nội dung / 60 lượt thi).

**File thô cần sheet tên `data`, 5 cột:**

| Cột | Đối Kháng | Thi Quyền |
|---|---|---|
| A | STT | STT (số lượt thi — các dòng cùng STT là một đội đồng diễn) |
| B | HẠNG CÂN | NỘI DUNG |
| C | HỌ VÀ TÊN | HỌ VÀ TÊN |
| D | MSSV/ĐƠN VỊ | MSSV/ĐƠN VỊ |
| E | QUỐC GIA | QUỐC GIA |

Bộ test **không hard-code tên hạng cân** — nó tự chọn hạng cân nhỏ nhất / lớn
nhất / nhỏ nhất-từ-4-VĐV trong chính file anh đưa vào, nên chạy được với bất kỳ
bộ dữ liệu nào.

### Giữ lại dữ liệu để kiểm tra tay

Mặc định test dọn sạch giải sau khi chạy. Muốn mở app xem tận mắt kết quả thì
thêm `--keep`:

```bash
npm run test:e2e:data:keep:live   # chạy hết data rồi GIỮ giải lại trên DB dev
# → mở app, chọn giải "E2E — chạy hết data (...)" để xem tận mắt

npm run test:e2e:clean:live       # xoá khi kiểm tra xong
npx tsx tests/e2e/clean.ts --live --dry-run   # xem trước sẽ xoá gì
```

`clean` **chỉ xoá giải có tên bắt đầu bằng "E2E"** — giải thật không bị đụng tới.
Lưu ý: nếu giữ dữ liệu lại thì lần chạy sau sẽ báo slot đã bị chiếm và từ chối
chạy — dọn trước rồi chạy tiếp.

### Các tuỳ chọn khác

```bash
npx tsx tests/e2e/run.ts --live --only=song-song   # lọc theo nhóm
npx tsx tests/e2e/run.ts --live --only=soak --seed=12345
```

Nhóm: `tao-giai` · `mot-san` · `song-song` · `soak` · `thi-quyen` · `het-data` · `tinh-huong`

**Emulator cần Java**: `brew install --cask temurin`. Chưa có Java thì dùng bản `:live`.

## Nguyên tắc: test gọi CODE THẬT

Bộ test **không được chép lại** logic của app. Mọi thứ đều import từ `src/`:

| Test dùng | Import từ |
|---|---|
| Sắp lịch đối kháng, sinh nhánh đấu | [`src/utils/scheduleBuilder.ts`](../src/utils/scheduleBuilder.ts) |
| Ghi trận, điền VĐV, chốt điểm | [`src/services/combatWriteService.ts`](../src/services/combatWriteService.ts) |
| Gom nội dung / đội thi quyền | [`src/utils/martialBuilder.ts`](../src/utils/martialBuilder.ts) |
| Chấm điểm, tính điểm tổng, xếp hạng thi quyền | [`src/services/martialWriteService.ts`](../src/services/martialWriteService.ts) |
| Giám định gửi điểm / Giám Sát nhận | [`src/utils/scoreSync.ts`](../src/utils/scoreSync.ts) |
| Ghi có hàng đợi offline | [`src/services/offlineService.ts`](../src/services/offlineService.ts) |
| getModes, hằng số | [`src/utils/helpers.ts`](../src/utils/helpers.ts), [`src/constants/settings.ts`](../src/constants/settings.ts) |

Nhờ vậy **sửa code trong `src/` là test bắt được ngay**. Nếu có lúc nào thấy
tiện tay chép một hàm từ container sang test — đừng: hãy tách hàm đó ra service
rồi cho cả container lẫn test cùng gọi.

## Cấu trúc

```
tests/e2e/
  harness/
    browserShim.ts   shim navigator/localStorage để chạy code src/ trong Node
    env.ts           chọn emulator/live, cấp phát slot giải, kết nối theo thiết bị
    dataset.ts       chọn file Excel đầu vào, chọn hạng cân/nội dung động
    seed.ts          Excel thô → sắp lịch → ghi Firebase (đối kháng + thi quyền)
    arenaClient.ts   Giám Sát Đối Kháng headless (mirror + freezeMirror)
    refereeClient.ts Giám Định Đối Kháng headless
    martialClient.ts Giám Sát + Giám Định Thi Quyền headless
    matchRunner.ts   đánh trọn 1 trận đối kháng
    report.ts        assertion, log, cơ chế xfail
  scenarios/
    01-tao-giai.ts            tạo file → tạo giải → xuất file
    02-mot-san.ts             đối kháng, baseline 1 sân
    03-hai-san-song-song.ts   ĐỐI KHÁNG — 2 sân
    04-soak.ts                fuzz có seed
    05-thi-quyen.ts           THI QUYỀN — 1 sân, 2 sân, 3/5 giám định
    06-chay-het-data.ts       chạy hết bộ data, in bảng kết quả
    07-tinh-huong-tren-san.ts cảnh cáo, đòn chân, điểm âm, nhảy trận, mất mạng…
  run.ts
```

## Mỗi "thiết bị" là một kết nối Firebase riêng

Giám Sát mỗi sân và từng Giám Định đều có `FirebaseApp` riêng
(`env.ts → getClientDb`). Đây không phải chi tiết vụn: dùng chung một kết nối
thì bộ nhớ đệm phía client làm `get()` sau `update()` nhìn thấy luôn ghi của
"thiết bị" khác, **che mất** đúng loại lỗi đọc-rồi-ghi mà bộ test cần bắt
(điểm tổng thi quyền là ví dụ). Ngoài sân mỗi người một máy, harness cũng vậy.

## Vì sao race lại tái hiện được 100%

`tournament/{t}/combat` và `tournament/{t}/martial` **dùng chung** cho cả 2 sân;
chỉ `combatArena/{0|1}` và `martialArena/{0|1}` là riêng. Mỗi Giám Sát giữ
mirror đầy đủ rồi ghi đè **nguyên node**.

Đua bằng `Promise.all` chỉ hỏng 1/10 lần → vô dụng làm lưới hồi quy. Thay vào
đó `freezeMirror()` giả lập "sân này chưa nhận kịp update của sân kia" (mạng
trễ / offline), nên test tự xếp được thứ tự:

```
A đọc mirror → B đọc mirror → B ghi → A ghi (bằng dữ liệu cũ) → mất kết quả của B
```

## Cơ chế xfail (`knownBug`)

Case nào tái hiện một bug **chưa sửa** thì gắn `knownBug: '<tên-bug>'`:

| Ký hiệu | Nghĩa |
|---|---|
| ✅ pass | đúng như mong đợi |
| ❌ fail | **hồi quy** — vừa làm hỏng thứ đang chạy tốt |
| ⚠️ xfail | bug đã biết, vẫn tái hiện đúng như ghi nhận |
| 🎉 xpass | bug đã biết **có vẻ đã được sửa** → gỡ cờ `knownBug` để test bảo vệ phần sửa đó |

Suite chỉ đỏ khi có ❌. Sửa xong một bug thì gỡ `knownBug` của nó.

## Bug đang được ghi nhận

### Đối Kháng

| Tên | Ở đâu | Hậu quả |
|---|---|---|
| `replace-fighter-lost-update` | `replaceFighter` — `combatWriteService.ts` | 2 sân cùng nuôi 1 chung kết → sân ghi sau xoá kết quả sân ghi trước |
| `score-commit-lost-update` | `commitRefereeScores` | chốt điểm ghi cả node `fighters` từ mirror cũ → xoá VĐV sân kia vừa điền |
| `save-match-lost-update` | `saveMatch` | một cú bấm cảnh cáo cũng ghi cả trận từ mirror cũ |
| `no-match-lock-across-arenas` | thiết kế | 2 sân mở cùng 1 trận, không có khoá → điểm bị nuốt |
| `score-window-collapsed` | `subscribeScoreForGiamSat` + `makeScoreTimer` | giám định bấm lệch nhịp → mất điểm (đo từ 0 đến 2000ms đều mất) |
| `five-referee-never-scores` | `makeScoreTimer` + `subscribeScoreForGiamSat` | **chế độ 5 giám định gần như không ghi được điểm nào** — 3 người bấm cùng nhịp vẫn ra 0, trong khi 3 giám định thì chạy đúng |
| `referee-array-length-oscillates` | `makeScoreTimer` | số ô giám định nhảy 3 ↔ 5 |
| `rescore-guard-off-by-one` | `canRescoreMatch` | guard so `"W."+j` với j là index thay vì số trận |

### Thi Quyền

| Tên | Ở đâu | Hậu quả |
|---|---|---|
| `martial-override-overwritten` | `overrideMartialFinalScore` | Giám Sát ghi đè điểm tổng xong, giám định bấm sau tính lại từ bảng đã reset → xoá mất quyết định của Giám Sát |
| `martial-no-turn-lock-across-arenas` | thiết kế | 2 sân chấm cùng 1 lượt thi, ghi đè nhau, không cảnh báo |

## Bug đã sửa

| Tên | Sửa ở đâu | Case canh hồi quy |
|---|---|---|
| `schedule-result-not-renumbered` | `changeMatchNumber` — [scheduleBuilder.ts](../src/utils/scheduleBuilder.ts) nay dịch cả `result` chứ không chỉ `name` | "Tham chiếu W.x/L.x phải trỏ đúng trận trong CÙNG hạng cân" (nhóm `tao-giai`) và "ĐỐI KHÁNG — chạy hết bộ data" (nhóm `het-data`) |

⚠️ **Giải đã tạo TRƯỚC bản sửa vẫn mang dữ liệu sai** — `result` cũ nằm sẵn trên
Firebase, sửa code không vá được dữ liệu cũ. Giải nào đã lỡ tạo thì phải **tạo
lại từ file Excel** thì mới chạy hết được.

## An toàn dữ liệu

- `--live` **từ chối chạy** nếu `.env.development` trỏ vào Firebase production.
- Slot giải được cấp phát **nối tiếp** sau giải cuối cùng đang có (không chèn
  index rời rạc như 90 — làm vậy Firebase trả object thay vì array và danh sách
  giải trong app dev sẽ rỗng).
- Từ chối chạy nếu slot cần dùng đã có dữ liệu; dọn sạch sau khi chạy.

## Thư mục cũ

`setup.ts`, `test-scenarios.ts`, `full-tournament.ts`, `tournament-engine.ts`,
`excel-parser.ts`, `test-runner.ts` là **bộ test cũ, đã được thay thế**. Chúng
chép lại `getModes`, `replaceFighter` và 22 schema nhánh đấu vào trong test, nên
sửa code trong `src/` chúng vẫn xanh. Có thể xoá.
