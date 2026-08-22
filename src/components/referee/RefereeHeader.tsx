import React, { useState } from 'react';
import StatusDot from '../ui/StatusDot';

export interface RefereeHeaderChip {
  label: string;
  /** Mau nen cua chip, dung lop Tailwind day du */
  className: string;
}

interface RefereeHeaderProps {
  isOnline: boolean;
  /** Cac the thong tin ben trai: san thi dau, tran dau... */
  chips: RefereeHeaderChip[];
  /** Ten vi tri giam dinh, hien noi bat ben phai */
  refereeName: string;
  onOpenShortcuts: () => void;
  onOpenHelp: () => void;
}

/**
 * Thanh tieu de dung chung cua 2 trang giam dinh.
 *
 * Truoc day hai trang chep nguyen khoi nay (ke ca menu xo xuong), sua mot ben
 * la lech ngay. Thanh nay luon cao co dinh de vung cham diem ben duoi khong
 * bi nhay khi noi dung doi.
 */
const RefereeHeader: React.FC<RefereeHeaderProps> = ({
  isOnline,
  chips,
  refereeName,
  onOpenShortcuts,
  onOpenHelp,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm px-3 py-2 flex-shrink-0 border-b border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot isOnline={isOnline} />
          {chips.map((chip, index) => (
            <span
              key={index}
              className={`${chip.className} text-white text-xs font-bold px-2 py-1 rounded-lg
                whitespace-nowrap truncate max-w-[35vw]`}
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-accent-600 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-sm">
            {refereeName || '...'}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Tuỳ chọn"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600
                flex items-center justify-center transition-colors tap-target"
            >
              <i className="fa-solid fa-gear text-sm" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-control shadow-pop
                  border border-slate-200 py-1 z-50 min-w-[168px] animate-pop-in">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onOpenShortcuts(); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100
                      flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-keyboard text-slate-400 w-4" aria-hidden="true" />
                    Phím tắt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onOpenHelp(); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100
                      flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-circle-question text-slate-400 w-4" aria-hidden="true" />
                    Giúp đỡ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!isOnline && (
        <p className="mt-2 mb-0 bg-red-50 text-red-700 py-1.5 px-2 text-center text-xs font-medium
          rounded-lg border border-red-200">
          <i className="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true" />
          Không có kết nối - Không thể chấm điểm
        </p>
      )}
    </header>
  );
};

export default RefereeHeader;
