import React from 'react';
import {
  ARENA_KEYS, ArenaAssignmentKey, Assignments, arenaKeyLabel,
} from '../../services/staffService';

interface ArenaTicksProps {
  value: Assignments;
  onToggle: (key: ArenaAssignmentKey) => void;
  /** Ai dang truc san do — hien ngay duoi o tick */
  busyBy?: (key: ArenaAssignmentKey) => string[];
  className?: string;
}

/**
 * Luoi 4 o tick san (doi khang A/B, thi quyen A/B).
 *
 * Tach ra dung chung cho ca bang duyet don cua chu giai lan bang chi dinh cua
 * admin: hai cho do phai hien y HET nhau, ke ca dong "da co ai truc" — do la
 * canh bao duy nhat chan duoc loi hai nguoi cung mot san ghi de diem nhau.
 */
const ArenaTicks: React.FC<ArenaTicksProps> = ({ value, onToggle, busyBy, className = '' }) => (
  <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
    {ARENA_KEYS.map((key) => {
      const on = value?.[key] === true;
      const busy = busyBy?.(key) || [];
      return (
        <label
          key={key}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-control border cursor-pointer
            text-xs transition-colors
            ${on ? 'border-accent-500 bg-accent-50' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          <input
            type="checkbox"
            checked={on}
            onChange={() => onToggle(key)}
            className="w-4 h-4 flex-shrink-0"
          />
          <span className="min-w-0">
            <span className="block font-medium text-slate-700">{arenaKeyLabel(key)}</span>
            {busy.length > 0 && (
              <span className="block text-[10px] text-amber-600 truncate">
                đã có {busy.join(', ')}
              </span>
            )}
          </span>
        </label>
      );
    })}
  </div>
);

export default ArenaTicks;
