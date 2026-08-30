import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import {
  AccessCode, CodeSlot,
  arenaName, positionLabel, positionsOfHolder, slotString, spacedCode,
  subscribeCode, subscribePrefix, unlockCode,
} from '../../services/accessCodeService';
import { ArenaAssignmentKey, parseArenaKey } from '../../services/staffService';
import { subscribeSlotPresence } from '../../services/firebaseService';
import type { TournamentId } from '../../types';

interface CodeBoardProps {
  tournamentIndex: TournamentId;
  tournamentName: string;
  /** Chi hien nhung san nay. Bo trong = ca giai (chu giai). */
  arenaKeys?: ArenaAssignmentKey[];
  /** Ai duoc bam Mo khoa / Cap ma moi */
  canManage?: boolean;
  /** Bo nut In khi bang nam trong modal chat */
  compact?: boolean;
}

interface Cell {
  code: string;
  a: number;
  r: number;
  /** Nhung o cham diem ma nay mo duoc — thuong la ca doi khang lan thi quyen */
  slots: CodeSlot[];
  data: AccessCode | null;
}

/**
 * Bang ma giam dinh.
 *
 * **Thu duy nhat phai doc to la 2 SO CUA GIAI.** San va vi tri thi giam dinh
 * CHAM VAO MAN HINH sau khi go 2 so — khong ai doc, chep hay go 12-24 ma roi
 * rac nua. Ma 4 so day du van con (no la thu that su mo cua o duoi) nhung la
 * chuyen noi bo cua may: bang nay khong hien no ra, vi hien ra la lai co nguoi
 * doc no cho nhau. Danh sach vi tri ben duoi chi de xem AI DA VAO va de bam
 * Mo khoa.
 *
 * Bang duoc **tinh ra**, khong doc tu mot bang luu san nao: 2 so cua giai +
 * so san + so giam dinh (ca ba nam tren node `accessCode/{2 so}`) la du dung
 * lai chinh xac bo o. Truoc day cho nay doc `tournamentCodeIndex`, mot ban sao
 * khong giu thong tin nao rieng — va vi moi ma nam o ca hai nhanh mon nen con
 * phai khu trung tay.
 */
const CodeBoard: React.FC<CodeBoardProps> = ({
  tournamentIndex,
  tournamentName,
  arenaKeys,
  canManage = false,
  compact = false,
}) => {
  const [prefix, setPrefix] = useState('');
  const [holder, setHolder] = useState<AccessCode | null>(null);
  const [codes, setCodes] = useState<Record<string, AccessCode | null>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  // Bam theo chuoi de effect khong chay lai moi lan mang `arenaKeys` doi
  // tham chieu ma noi dung khong doi
  const arenaFilterKey = arenaKeys ? arenaKeys.join(',') : '';

  /**
   * 2 so cua giai — bi mat cua giai, va la thu duy nhat phai doc that.
   *
   * Giam sat doc duoc neu dang truc mot san bat ky cua giai; nguoi khong
   * lien quan thi rules tu choi, va man hinh phai noi ro thay vi hien bang rong.
   */
  useEffect(() => {
    setDenied(false);
    setPrefix('');
    setHolder(null);
    return subscribePrefix(tournamentIndex, (p) => setPrefix(p || ''), () => setDenied(true));
  }, [tournamentIndex]);

  /** Ban thiet ke cua giai nam ngay tren node 2 so — mot lan dang ky, tu chay theo */
  useEffect(() => {
    if (!prefix) {
      setHolder(null);
      return;
    }
    return subscribeCode(prefix, setHolder);
  }, [prefix]);

  useEffect(() => subscribeSlotPresence(setOnline), []);

  /** Bo o cua giai, tinh thang tu ban thiet ke — khong ton mot vong doc nao */
  const positions = useMemo(() => {
    if (!prefix || !holder?.reserved) return [];
    const wanted = arenaFilterKey
      ? new Set(
        arenaFilterKey.split(',')
          .map((k) => parseArenaKey(k as ArenaAssignmentKey)?.a)
          .filter((a): a is number => a !== undefined)
      )
      : null;
    return positionsOfHolder(prefix, holder).filter((p) => !wanted || wanted.has(p.a));
  }, [prefix, holder, arenaFilterKey]);

  // Danh sach ma dang hien — bam theo chuoi de khong dang ky lai listener
  // moi lan `positions` doi tham chieu ma noi dung khong doi
  const codeListKey = useMemo(() => positions.map((p) => p.code).join(','), [positions]);

  useEffect(() => {
    const list = codeListKey ? codeListKey.split(',') : [];
    const unsubs = list.map((code) =>
      subscribeCode(code, (data) => setCodes((prev) => ({ ...prev, [code]: data })))
    );
    return () => unsubs.forEach((u) => u());
  }, [codeListKey]);

  /** Xep theo san, moi vi tri mot dong */
  const groups = useMemo(() => {
    const map = new Map<string, Cell[]>();
    for (const p of positions) {
      const label = arenaName(p.a);
      const cell: Cell = { code: p.code, a: p.a, r: p.r, slots: p.slots, data: codes[p.code] ?? null };
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(cell);
    }
    for (const cells of map.values()) cells.sort((a, b) => a.r - b.r);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [positions, codes]);

  const handleUnlock = useCallback(async (cell: Cell) => {
    setBusy(cell.code);
    try {
      await unlockCode(cell.code);
      toast.success(
        `Đã mở khoá ${positionLabel(cell.a, cell.r)} — bảo giám định chọn lại đúng chỗ này.`
      );
    } catch {
      toast.error('Không mở khoá được. Kiểm tra lại quyền trên giải này.');
    } finally {
      setBusy(null);
    }
  }, []);

  /** Chep cai gui qua Zalo cho ca doan giam dinh: mot so, kem cach vao */
  const handleCopyPrefix = useCallback(async () => {
    const text =
      `${tournamentName.replace(/\n/g, ' ')}\n` +
      `Số của giải: ${prefix}\n` +
      `Vào app Cóc Vương, bấm "Vào chấm điểm", gõ ${prefix} rồi chọn sân và số giám định của bạn.`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã chép — dán vào Zalo được rồi.');
    } catch {
      toast.info(text);
    }
  }, [tournamentName, prefix]);

  /**
   * In ra giay de dan o ban giam dinh truoc gio thi.
   *
   * To in cua bo ma dung chung chi co DUNG MOT SO to bang nam ban tay, kem
   * cach ghep. In ca bang 12-24 ma ra la moi nguoi lai di do so cua minh
   * trong bang — dung cai viec ma so cua giai sinh ra de bo.
   */
  const handlePrint = useCallback(() => {
    const body = `
        <div class="hero">
          <p class="cap">Số của giải</p>
          <p class="num">${spacedCode(prefix)}</p>
        </div>
        <p class="how">Mở app → <b>Vào chấm điểm</b> → gõ <b>${prefix}</b></p>
        <p class="eg">Rồi chọn <b>sân</b> và <b>số giám định</b> của bạn ngay trên màn hình.</p>
        <p class="note">Một chỗ ngồi chấm được CẢ đối kháng lẫn thi quyền — chọn môn khi vào.</p>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Trình duyệt chặn cửa sổ in. Cho phép pop-up rồi thử lại.');
      return;
    }
    win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
      <title>Bảng mã giám định</title><style>
        body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:28px;color:#0f172a}
        h1{font-size:22px;margin:0 0 4px;white-space:pre-line}
        p.sub{color:#64748b;margin:0 0 24px;font-size:13px}
        .hero{border:3px solid #0f172a;border-radius:14px;padding:18px 12px;text-align:center}
        .cap{margin:0;font-size:13px;text-transform:uppercase;letter-spacing:.18em;color:#475569}
        .num{margin:6px 0 0;font-size:104px;line-height:1;font-weight:900;letter-spacing:.14em}
        p.how{margin:20px 0 12px;font-size:19px;text-align:center}
        h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin:22px 0 6px}
        table{border-collapse:collapse;width:100%}
        th{border:1px solid #cbd5e1;padding:8px;font-size:13px;background:#f1f5f9}
        td{border:1px solid #cbd5e1;padding:12px 8px;text-align:center}
        td.k{font-size:20px;font-weight:600}
        td.d{font-size:34px;font-weight:800;letter-spacing:.15em;white-space:nowrap}
        p.eg{margin:16px 0 0;font-size:19px;text-align:center}
        p.note{margin:18px 0 0;font-size:13px;color:#64748b;text-align:center}
      </style></head><body>
      <h1>${tournamentName}</h1>
      <p class="sub">Bảng mã giám định</p>
      ${body}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }, [tournamentName, prefix]);

  if (denied) {
    return (
      <EmptyState
        icon="fa-solid fa-lock"
        title="Không xem được bảng mã của giải này"
        hint="Bạn chỉ xem được mã của sân mình được phân công. Nhờ chủ giải kiểm tra lại phân công."
      />
    );
  }

  if (!groups.length) {
    return (
      <EmptyState
        icon="fa-solid fa-key"
        title="Chưa có mã giám định cho giải này"
        hint="Mã sinh tự động lúc tạo giải và tự chạy theo số giám định. Giải cũ chưa có số của giải thì bấm “Đặt số cho giải” ở trang Thiết đặt."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Ca man hinh chi de doc to MOT so nay. Con lai la viec cua giam dinh. */}
      <div className="border-2 border-accent-300 bg-accent-50 rounded-card p-4 sm:p-5 text-center">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
            Số của giải
          </p>
          <p className="m-0 mt-1 text-6xl sm:text-7xl font-black tabular-nums
            tracking-[0.14em] leading-none text-accent-800">
            {spacedCode(prefix)}
          </p>

          <p className="m-0 mt-4 text-sm sm:text-base text-slate-700 leading-snug">
            Đọc số này cho cả đoàn. Giám định gõ <strong>đúng 2 số</strong>, rồi chọn
            sân và số của mình ngay trên màn hình.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" icon="fa-solid fa-copy"
              onClick={handleCopyPrefix}>
              Chép số giải
            </Button>
            {/* Giua tran thi khong ai di in — nut in chi co o trang Thiet dat */}
            {!compact && (
              <Button variant="secondary" size="sm" icon="fa-solid fa-print" onClick={handlePrint}>
                In / Lưu ảnh
              </Button>
            )}
          </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 m-0">
          Ai đã vào bàn chấm
        </h3>

        <div className="space-y-4">
          {groups.map(([label, cells]) => (
            <div key={label}>
              <p className="m-0 mb-1.5 text-xs font-medium text-slate-400">{label}</p>
              <div className="border border-slate-200 rounded-control divide-y divide-slate-100
                overflow-hidden bg-white">
                {cells.map((cell) => {
                  // Vi tri co nguoi khi BAT KY o nao cua no dang online — ma dung
                  // chung mo hai o nhung nguoi cam ma thi chi co mot
                  const isOnline = cell.slots.some((s) => online.has(slotString(s)));
                  const claimed = !!cell.data?.claimedUid;
                  const working = busy === cell.code;

                  return (
                    <div key={cell.code} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                      <span className="w-14 flex-shrink-0 text-sm font-semibold text-slate-700">
                        GĐ{cell.r + 1}
                      </span>

                      <span className="flex items-center gap-1.5 text-[11px] min-w-[7.5rem]">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0
                            ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          aria-hidden="true"
                        />
                        <span className={isOnline ? 'text-emerald-700' : 'text-slate-400'}>
                          {isOnline ? 'đang online' : claimed ? 'đã nhận, chưa online' : 'chưa vào'}
                        </span>
                      </span>

                      {cell.slots.length > 1 && (
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                          đối kháng và thi quyền
                        </span>
                      )}

                      {canManage && (
                        /* Chi co "Mo khoa". Ma sinh ra tu 2 so cua giai nen
                           khong doi le tung o duoc — doi thi doi ca giai, o
                           trang Thiet dat */
                        <Button
                          size="sm"
                          className="ml-auto"
                          variant={claimed ? 'warning' : 'secondary'}
                          disabled={working || !claimed}
                          onClick={() => handleUnlock(cell)}
                          icon="fa-solid fa-unlock"
                        >
                          Mở khoá
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default CodeBoard;
