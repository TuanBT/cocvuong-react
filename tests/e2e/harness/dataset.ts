/**
 * dataset — chọn file Excel đầu vào cho cả bộ test
 *
 * Mặc định dùng file mẫu trong tests/e2e/. Đưa file khác bằng:
 *   npx tsx tests/e2e/run.ts --file=duong/dan/vdv.xlsx
 *   npx tsx tests/e2e/run.ts --dk=doikhang.xlsx --tq=thiquyen.xlsx
 *
 * `--file` tự nhận biết file là Đối Kháng hay Thi Quyền (theo tiêu đề cột 2).
 */
import * as fs from 'fs';
import { detectDataKind, readRawExcel, categoryCounts, martialContentCounts } from './seed';

export const DEFAULT_DK = 'tests/e2e/data_doikhang_tho.xlsx';
export const DEFAULT_TQ = 'tests/e2e/data_thiquyen_tho.xlsx';

let combatFile = DEFAULT_DK;
let martialFile = DEFAULT_TQ;
let combatFromUser = false;
let martialFromUser = false;

function argValue(prefix: string): string | null {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : null;
}

function mustExist(p: string, flag: string): string {
  if (!fs.existsSync(p)) throw new Error(`${flag}: không tìm thấy file "${p}"`);
  return p;
}

/** Đọc tham số dòng lệnh và chốt file dữ liệu sẽ dùng */
export function resolveDataset(): void {
  const dk = argValue('--dk=');
  const tq = argValue('--tq=');
  const file = argValue('--file=');

  if (dk) { combatFile = mustExist(dk, '--dk'); combatFromUser = true; }
  if (tq) { martialFile = mustExist(tq, '--tq'); martialFromUser = true; }

  if (file) {
    const p = mustExist(file, '--file');
    const kind = detectDataKind(p);
    if (kind === 'doikhang') { combatFile = p; combatFromUser = true; }
    else { martialFile = p; martialFromUser = true; }
  }
}

export function combatExcel(): string { return combatFile; }
export function martialExcel(): string { return martialFile; }
export function isCombatFromUser(): boolean { return combatFromUser; }
export function isMartialFromUser(): boolean { return martialFromUser; }

/** In tóm tắt dữ liệu đầu vào để người chạy biết đang test trên bộ nào */
export function describeDataset(): string[] {
  const out: string[] = [];

  const dkRaw = readRawExcel(combatFile);
  const dkCats = categoryCounts(dkRaw);
  out.push(
    `Đối Kháng : ${combatFile}${combatFromUser ? '' : '  (mẫu)'}` +
    `\n              ${dkRaw.length} VĐV / ${dkCats.size} hạng cân`
  );

  const tqRaw = readRawExcel(martialFile);
  const tqContents = martialContentCounts(tqRaw);
  const tqTurns = [...tqContents.values()].reduce((a, b) => a + b, 0);
  out.push(
    `Thi Quyền : ${martialFile}${martialFromUser ? '' : '  (mẫu)'}` +
    `\n              ${tqRaw.length} VĐV / ${tqContents.size} nội dung / ${tqTurns} lượt thi`
  );

  return out;
}

/**
 * Hạng cân dùng cho các case cần bracket nhỏ / vừa / lớn.
 * Chọn theo số VĐV thật trong file người dùng đưa vào, nên bộ test chạy được
 * với BẤT KỲ file nào chứ không phụ thuộc tên hạng cân cố định.
 */
export interface CategoryPick {
  smallest: string;   // ít VĐV nhất (>= 2)
  largest: string;    // nhiều VĐV nhất
  twoSmall: string[]; // 2 hạng cân ít VĐV nhất — dùng cho case 2 sân
  /**
   * Hạng cân nhỏ nhất có TỪ 4 VĐV — bảng đấu khi đó chắc chắn có trận nhận VĐV
   * từ 2 trận khác nhau (chung kết W.x vs W.y), là tình huống 2 sân cùng nuôi
   * một trận. Hạng cân 3 VĐV không có tình huống này.
   */
  smallestCrossFed: string;
  all: string[];
}

export function pickCategories(): CategoryPick {
  const raw = readRawExcel(combatFile);
  const counts = [...categoryCounts(raw).entries()]
    .filter(([, n]) => n >= 2 && n <= 22)
    .sort((a, b) => a[1] - b[1]);

  if (counts.length === 0) {
    throw new Error(
      `File ${combatFile} không có hạng cân nào hợp lệ (cần từ 2 đến 22 VĐV mỗi hạng cân)`
    );
  }

  const names = counts.map(([n]) => n);
  const crossFed = counts.find(([, n]) => n >= 4);
  if (!crossFed) {
    throw new Error(
      `File ${combatFile} không có hạng cân nào từ 4 VĐV trở lên — ` +
      'không dựng được tình huống 2 sân cùng nuôi một trận.'
    );
  }
  return {
    smallest: names[0],
    largest: names[names.length - 1],
    twoSmall: names.slice(0, Math.min(2, names.length)),
    smallestCrossFed: crossFed[0],
    all: names,
  };
}

/** Nội dung thi quyền: ít lượt nhất / nhiều lượt nhất */
export function pickContents(): { fewest: string; most: string; all: string[] } {
  const raw = readRawExcel(martialFile);
  const counts = [...martialContentCounts(raw).entries()].sort((a, b) => a[1] - b[1]);
  if (counts.length === 0) throw new Error(`File ${martialFile} không có nội dung nào`);
  const names = counts.map(([n]) => n);
  return { fewest: names[0], most: names[names.length - 1], all: names };
}
