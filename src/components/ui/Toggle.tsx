import React from 'react';

interface ToggleProps {
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  hint?: string;
}

/**
 * Cong tac bat/tat cho trang thiet dat.
 *
 * Thay cho o tick vuong: tren mot danh sach dai toan lua chon bat/tat, cong tac
 * cho biet trang thai hien tai chi bang liec mat, khong phai doc tung dong.
 * Van la <input type="checkbox"> that nen ban phim va trinh doc man hinh
 * hoat dong binh thuong.
 */
const Toggle: React.FC<ToggleProps> = ({ name, checked, onChange, label, hint }) => (
  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-control
    cursor-pointer hover:border-slate-300 transition-colors">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="peer sr-only"
    />
    <span className="relative w-10 h-6 flex-shrink-0 rounded-full bg-slate-300 transition-colors
      peer-checked:bg-accent-600 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500
      peer-focus-visible:ring-offset-2
      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5
      after:rounded-full after:bg-white after:shadow after:transition-transform
      peer-checked:after:translate-x-4" />
    <span className="min-w-0">
      <span className="block text-sm text-slate-700">{label}</span>
      {hint && <span className="block text-xs text-slate-400 mt-0.5">{hint}</span>}
    </span>
  </label>
);

export default React.memo(Toggle);
