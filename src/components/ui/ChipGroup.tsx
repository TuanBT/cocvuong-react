import React from 'react';

export interface ChipOption {
  /** Gia tri tra ve khi chon */
  value: string | number;
  label: string;
}

interface ChipGroupProps {
  /** Nhan mo ta cum, vi du "Giải đấu" */
  label: string;
  icon?: string;
  options: ChipOption[];
  selected: string | number;
  onSelect: (value: any) => void;
  /** Cum chinh (giai dau) to hon cum phu (hang can) */
  emphasis?: boolean;
  emptyText?: string;
}

/**
 * Day nut loc dang chip - dung cho chon giai dau / hang can / noi dung.
 * Truoc day 2 trang thong tin viet lai cung mot khoi, moi trang mot mau.
 *
 * Tren dien thoai cac chip cuon ngang thay vi xuong dong lam vo bo cuc.
 */
const ChipGroup: React.FC<ChipGroupProps> = ({
  label,
  icon,
  options,
  selected,
  onSelect,
  emphasis = false,
  emptyText,
}) => {
  if (options.length === 0) {
    return emptyText ? <p className="text-sm text-slate-400 italic m-0">{emptyText}</p> : null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs sm:text-sm text-slate-500 font-medium flex-shrink-0 flex items-center gap-1">
        {icon && <i className={icon} aria-hidden="true" />}
        <span className="hidden sm:inline">{label}</span>
      </span>
      <div className="flex items-center gap-2 overflow-x-auto scroll-x py-0.5 -my-0.5">
        {options.map((option) => {
          const isActive = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-pressed={isActive}
              className={`flex-shrink-0 whitespace-pre-line text-sm font-medium transition-colors tap-target
                ${emphasis ? 'px-4 py-2 rounded-control' : 'px-3 py-1.5 rounded-full'}
                ${isActive
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ChipGroup);
