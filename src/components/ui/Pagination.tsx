import React from 'react';

interface PaginationProps {
  /** Trang dang xem, dem tu 0 — truyen `page` da ket cua `paginate()` */
  page: number;
  pageCount: number;
  /** So thu tu muc dau / cuoi cua trang, dem tu 1 */
  from: number;
  to: number;
  total: number;
  onPage: (page: number) => void;
  /** Danh tu dem trong dong "1–12 / 50 giải" */
  unit?: string;
  className?: string;
}

/** Bao nhieu so trang hien het, khong rut gon */
const SHOW_ALL_UP_TO = 7;
/** Moi ben trang dang xem hien them bao nhieu so */
const SPREAD = 1;

/**
 * Day so trang, rut gon o giua khi qua dai: `1 … 4 5 6 … 12`.
 *
 * Trang dau va trang cuoi luon co mat — hai cho hay nhay toi nhat (ve dau
 * danh sach, hoac toi giai moi nhat o cuoi).
 */
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= SHOW_ALL_UP_TO) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const keep = new Set<number>([0, pageCount - 1]);
  for (let p = page - SPREAD; p <= page + SPREAD; p += 1) {
    if (p >= 0 && p < pageCount) keep.add(p);
  }

  const sorted = Array.from(keep).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const BTN = `inline-flex items-center justify-center min-w-[36px] min-h-[36px] px-2 rounded-lg
  text-sm font-medium border transition-colors tap-target
  disabled:opacity-40 disabled:pointer-events-none`;

/**
 * Thanh phan trang dung chung cho moi bang chon dai.
 *
 * Khong tu cuon len dau danh sach khi doi trang — co y: thanh nay nam ngay
 * duoi danh sach, giu nguyen cho thi bam "Sau" may lan lien khong phai ngam
 * lai nut. Trang co mot man hinh nen nhin xuong la thay muc moi.
 *
 * Mot trang thi khong ve gi ca: bang chon ngan khong can vien them.
 */
const Pagination: React.FC<PaginationProps> = ({
  page, pageCount, from, to, total, onPage, unit = 'mục', className = '',
}) => {
  if (pageCount <= 1) return null;

  const go = (p: number) => () => onPage(Math.min(Math.max(p, 0), pageCount - 1));

  return (
    <nav
      aria-label={`Phân trang ${unit}`}
      className={`flex flex-wrap items-center justify-between gap-2 mt-3 ${className}`}
    >
      <p className="m-0 text-xs text-slate-500" aria-live="polite">
        {from}–{to} / {total} {unit}
      </p>

      <div className="flex items-center gap-1">
        <button type="button" onClick={go(page - 1)} disabled={page === 0}
          aria-label="Trang trước"
          className={`${BTN} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
          <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
        </button>

        {/* Dien thoai chi du cho mot dong chu; man hinh rong thi bam thang so trang */}
        <span className="sm:hidden text-xs text-slate-500 px-1.5">
          Trang {page + 1}/{pageCount}
        </span>

        {pageWindow(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="hidden sm:inline px-1 text-slate-300">…</span>
          ) : (
            <button key={p} type="button" onClick={go(p)}
              aria-label={`Trang ${p + 1}`}
              aria-current={p === page ? 'page' : undefined}
              className={`hidden sm:inline-flex ${BTN} ${p === page
                ? 'border-accent-600 bg-accent-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {p + 1}
            </button>
          )
        )}

        <button type="button" onClick={go(page + 1)} disabled={page === pageCount - 1}
          aria-label="Trang sau"
          className={`${BTN} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
          <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default React.memo(Pagination);
