import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import {
  AccessCode, CodeIndex, CodeSlot, PREFIX_LENGTH, SHARED_CODE_LENGTH,
  arenaName, kindName, positionLabel, prefixOf, slotLabel, slotString, spacedCode,
  subscribeArenaCodeIndex, subscribeCode, subscribeCodeIndex, unlockCode,
} from '../../services/accessCodeService';
import { ArenaAssignmentKey, parseArenaKey } from '../../services/staffService';
import { subscribeSlotPresence } from '../../services/firebaseService';

interface CodeBoardProps {
  tournamentIndex: number;
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
  /** Nhung o cham diem ma nay mo duoc. Ma dung chung: ca doi khang lan thi quyen. */
  slots: CodeSlot[];
  data: AccessCode | null;
}

/**
 * Bang ma giam dinh.
 *
 * Vi sao phai co `tournamentCodeIndex`: `accessCode` co tinh de `.read: false`
 * o goc de khong ai quet duoc toan bo kho ma — he qua la CHINH chu giai cung
 * khong liet ke nguoc ra ma cua giai minh. Khong co nut chi muc thi bang nay
 * khong dung duoc.
 *
 * Ma 4 so la mot ma cho ca hai mon o cung vi tri, nen bang xep theo SAN, moi
 * vi tri mot o. Chi muc co ma nay o ca hai nhanh mon nen phai bo trung, khong
 * thi moi ma hien hai lan.
 *
 * Giai cu cap tu thoi "moi o mot ma 2 so" van hien duoc: ma ngan hon thi bang
 * quay ve xep theo mon x san. Bam "Cap ma cho o con thieu" o Thiet dat la giai
 * do doi han sang ma 4 so.
 */
const CodeBoard: React.FC<CodeBoardProps> = ({
  tournamentIndex,
  tournamentName,
  arenaKeys,
  canManage = false,
  compact = false,
}) => {
  const [index, setIndex] = useState<CodeIndex>({});
  const [codes, setCodes] = useState<Record<string, AccessCode | null>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  // Bam theo chuoi de effect khong chay lai moi lan mang `arenaKeys` doi
  // tham chieu ma noi dung khong doi
  const arenaFilterKey = arenaKeys ? arenaKeys.join(',') : '';

  /**
   * Chu giai doc ca nhanh mot lan; giam sat PHAI doc tung san mot — rules chi
   * cho ho doc `tournamentCodeIndex/{t}/{sanKey}` cua san duoc phan cong, doc
   * ca `{t}` la bi tu choi.
   */
  useEffect(() => {
    setDenied(false);
    if (!arenaFilterKey) {
      return subscribeCodeIndex(tournamentIndex, setIndex, () => setDenied(true));
    }

    const keys = arenaFilterKey.split(',');
    setIndex({});
    const unsubs = keys.map((key) =>
      subscribeArenaCodeIndex(
        tournamentIndex,
        key,
        (byReferee) => setIndex((prev) => ({ ...prev, [key]: byReferee })),
        () => setDenied(true)
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [tournamentIndex, arenaFilterKey]);

  useEffect(() => subscribeSlotPresence(setOnline), []);

  // Danh sach ma dang hien — bam theo chuoi de khong dang ky lai listener
  // moi lan `index` doi tham chieu ma noi dung khong doi
  const visible = useMemo(() => {
    const out: { key: ArenaAssignmentKey; r: number; code: string }[] = [];
    for (const key of Object.keys(index)) {
      if (arenaKeys && !arenaKeys.includes(key as ArenaAssignmentKey)) continue;
      const byReferee = index[key] || {};
      for (const r of Object.keys(byReferee).sort((a, b) => Number(a) - Number(b))) {
        if (byReferee[r]) out.push({ key: key as ArenaAssignmentKey, r: Number(r), code: byReferee[r] });
      }
    }
    return out;
  }, [index, arenaKeys]);

  const codeListKey = useMemo(
    () => [...new Set(visible.map((v) => v.code))].join(','),
    [visible]
  );

  useEffect(() => {
    const list = codeListKey ? codeListKey.split(',') : [];
    const unsubs = list.map((code) =>
      subscribeCode(code, (data) => setCodes((prev) => ({ ...prev, [code]: data })))
    );
    return () => unsubs.forEach((u) => u());
  }, [codeListKey]);

  /**
   * Do dai ma la dau hieu dong bo duy nhat doc duoc ngay: `accessCode` ve sau
   * mot nhip, ma bang ma thi khong duoc phep nhay bo cuc giua chung.
   */
  const shared = visible.length > 0 && visible.every((v) => v.code.length === SHARED_CODE_LENGTH);
  const prefix = shared ? prefixOf(visible[0].code) : '';

  const groups = useMemo(() => {
    const map = new Map<string, Cell[]>();
    const seen = new Map<string, Cell>();

    for (const v of visible) {
      const parsed = parseArenaKey(v.key);
      if (!parsed) continue;

      const slot: CodeSlot = { t: tournamentIndex, kind: parsed.kind, a: parsed.a, r: v.r };

      // Ma dung chung nam o ca hai nhanh mon: gap lai thi gop mon vao mot o
      const existing = seen.get(v.code);
      if (existing) {
        existing.slots.push(slot);
        continue;
      }

      const label = shared
        ? arenaName(parsed.a)
        : `${kindName(parsed.kind)} — ${arenaName(parsed.a)}`;
      const cell: Cell = {
        code: v.code, a: parsed.a, r: v.r, slots: [slot], data: codes[v.code] ?? null,
      };
      seen.set(v.code, cell);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(cell);
    }

    for (const cells of map.values()) cells.sort((a, b) => a.r - b.r);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [visible, codes, tournamentIndex, shared]);

  const handleUnlock = useCallback(async (code: string) => {
    setBusy(code);
    try {
      await unlockCode(code);
      toast.success(`Đã mở khoá mã ${spacedCode(code)} — đọc lại đúng số này cho giám định.`);
    } catch {
      toast.error('Không mở khoá được. Kiểm tra lại quyền trên giải này.');
    } finally {
      setBusy(null);
    }
  }, []);

  /**
   * Ma dung chung mo ca hai mon.
   *
   * Khong doan bang so slot nhin thay: man giam sat chi doc duoc nhanh san
   * minh truc nen o day ma dung chung cung chi hien MOT slot. Phai hoi chinh
   * ma xem no co ca hai nhanh khong.
   */
  const bothKinds = useCallback(
    (cell: Cell) =>
      cell.data
        ? !!cell.data.slotCombat && !!cell.data.slotMartial
        : cell.slots.length > 1,
    []
  );

  const handleCopy = useCallback(async (cell: Cell) => {
    const what = bothKinds(cell)
      ? positionLabel(cell.a, cell.r)
      : slotLabel(cell.slots[0]);
    const text = `${tournamentName.replace(/\n/g, ' ')} · ${what} · mã ${cell.code}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã chép — dán vào Zalo được rồi.');
    } catch {
      toast.info(text);
    }
  }, [tournamentName, bothKinds]);

  /** In ra giay de dan o ban giam dinh truoc gio thi */
  const handlePrint = useCallback(() => {
    const rows = groups
      .map(([label, cells]) => `
        <h2>${label}</h2>
        <table>
          <tr>${cells.map((c) => `<th>GĐ${c.r + 1}</th>`).join('')}</tr>
          <tr>${cells.map((c) => `<td>${spacedCode(c.code)}</td>`).join('')}</tr>
        </table>`)
      .join('');

    const note = shared
      ? `Số của giải là <b>${prefix}</b>. Mỗi mã dùng cho CẢ đối kháng lẫn thi quyền — ` +
        `giám định chọn môn ngay khi vào. Không đưa nhầm mã sang bàn khác.`
      : 'Mỗi mã vào thẳng đúng một ô chấm điểm. Không đưa nhầm mã sang bàn khác.';

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Trình duyệt chặn cửa sổ in. Cho phép pop-up rồi thử lại.');
      return;
    }
    win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
      <title>Bảng mã giám định</title><style>
        body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:28px;color:#0f172a}
        h1{font-size:20px;margin:0 0 4px;white-space:pre-line}
        p.sub{color:#64748b;margin:0 0 20px;font-size:13px}
        h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin:22px 0 6px}
        table{border-collapse:collapse;width:100%}
        th{border:1px solid #cbd5e1;padding:6px;font-size:12px;background:#f1f5f9}
        td{border:1px solid #cbd5e1;padding:14px 6px;font-size:34px;font-weight:800;text-align:center;letter-spacing:.15em;white-space:nowrap}
      </style></head><body>
      <h1>${tournamentName}</h1>
      <p class="sub">Bảng mã giám định — ${note}</p>
      ${rows}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }, [groups, tournamentName, shared, prefix]);

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
        hint="Mã được sinh tự động lúc tạo giải. Bấm “Cấp mã cho ô còn thiếu” ở trang Thiết đặt nếu giải cũ chưa có."
      />
    );
  }

  return (
    <div className="space-y-5">
      {shared && (
        <div className="flex items-center gap-3 bg-accent-50 border border-accent-200
          rounded-control px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-700">
            Số của giải
          </span>
          <span className="text-2xl font-black tabular-nums tracking-[0.25em] text-accent-800">
            {spacedCode(prefix)}
          </span>
          <span className="text-xs text-slate-500 leading-snug">
            Mọi mã đều bắt đầu bằng hai số này, rồi tới <strong>số sân</strong> và
            {' '}<strong>số giám định</strong>.
          </span>
        </div>
      )}

      {groups.map(([label, cells]) => (
        <div key={label}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 m-0">
            {label}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {cells.map((cell) => {
              // Vi tri co nguoi khi BAT KY o nao cua no dang online — ma dung
              // chung mo hai o nhung nguoi cam ma thi chi co mot
              const isOnline = cell.slots.some((s) => online.has(slotString(s)));
              const claimed = !!cell.data?.claimedUid;
              const working = busy === cell.code;

              return (
                <div
                  key={cell.code}
                  className="border border-slate-200 rounded-control bg-white p-3 text-center"
                >
                  <p className="m-0 text-xs font-semibold text-slate-500">GĐ{cell.r + 1}</p>

                  <button
                    type="button"
                    onClick={() => handleCopy(cell)}
                    title="Bấm để chép mã"
                    className="block w-full my-2 text-3xl font-black tabular-nums tracking-[0.2em]
                      leading-none text-slate-800 hover:text-accent-700 transition-colors"
                  >
                    {/* O the hep, ma 4 so tu xuong dong thanh 3 + 1 — doc ra la
                        sai so. Cat tay cho dung: 2 so cua giai o tren, san va
                        vi tri o duoi, dung nhip nguoi ta doc cho nhau nghe */}
                    <span className="block whitespace-nowrap">
                      {spacedCode(cell.code.slice(0, PREFIX_LENGTH))}
                    </span>
                    {cell.code.length > PREFIX_LENGTH && (
                      <span className="block whitespace-nowrap mt-1.5">
                        {spacedCode(cell.code.slice(PREFIX_LENGTH))}
                      </span>
                    )}
                  </button>

                  {bothKinds(cell) && (
                    <p className="m-0 mb-1.5 text-[10px] text-slate-400 uppercase tracking-wide">
                      cả 2 môn
                    </p>
                  )}

                  <p className="m-0 text-[11px] flex items-center justify-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      aria-hidden="true"
                    />
                    <span className={isOnline ? 'text-emerald-700' : 'text-slate-400'}>
                      {isOnline ? 'đang online' : claimed ? 'đã nhận, chưa online' : 'chưa vào'}
                    </span>
                  </p>

                  {canManage && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {/* Chi co "Mo khoa". Ma sinh ra tu 2 so cua giai nen
                          khong doi le tung o duoc — doi thi doi ca giai, o
                          trang Thiet dat */}
                      <Button
                        size="sm"
                        variant={claimed ? 'warning' : 'secondary'}
                        block
                        disabled={working || !claimed}
                        onClick={() => handleUnlock(cell.code)}
                        icon="fa-solid fa-unlock"
                      >
                        Mở khoá
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!compact && (
        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
          <Button variant="secondary" icon="fa-solid fa-print" onClick={handlePrint}>
            In / Lưu ảnh bảng mã
          </Button>
          <p className="m-0 text-xs text-slate-500 self-center">
            Dán ở bàn giám định trước giờ thi — mỗi bàn chỉ đọc đúng ô của mình.
          </p>
        </div>
      )}
    </div>
  );
};

export default CodeBoard;
