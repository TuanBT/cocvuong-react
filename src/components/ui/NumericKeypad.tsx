import React, { useCallback, useEffect } from 'react';

interface NumericKeypadProps {
  /** Chuoi so dang go */
  value: string;
  /** So o hien thi (do dai ma dai nhat) */
  length: number;
  /**
   * Go du ngan nay so la bam xac nhan duoc.
   *
   * Co hai do dai ma cung ton tai: 2 so (kieu cu, moi o mot ma) va 4 so (kieu
   * ca giai chung 2 so dau). O hien thi ve theo ma dai nhat, con nut xac nhan
   * phai mo tu ma ngan nhat.
   */
  minLength?: number;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  /** Bat phim so vat ly tren laptop */
  captureKeyboard?: boolean;
  disabled?: boolean;
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Ban phim so dung chung, tach ra tu `PasswordModal`.
 *
 * Phim to het co the: giam dinh go trong luc dang nhin san chu khong nhin
 * dien thoai. O hien thi tach tung chu so de doi chieu voi so giam sat doc cho.
 */
const NumericKeypad: React.FC<NumericKeypadProps> = ({
  value,
  length,
  minLength,
  onChange,
  onSubmit,
  captureKeyboard = true,
  disabled = false,
  className = '',
}) => {
  const press = useCallback(
    (d: string) => {
      if (disabled) return;
      if (value.length >= length) return;
      onChange(value + d);
    },
    [disabled, value, length, onChange]
  );

  const backspace = useCallback(() => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }, [disabled, value, onChange]);

  useEffect(() => {
    if (!captureKeyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [captureKeyboard, press, backspace, onSubmit]);

  const cells = Array.from({ length }, (_, i) => value[i] ?? '');
  const enough = value.length >= (minLength ?? length);

  return (
    <div className={className}>
      <div
        className="flex justify-center gap-3 mb-5"
        role="status"
        aria-label={value ? `Đã gõ ${value.split('').join(' ')}` : 'Chưa gõ số nào'}
      >
        {cells.map((d, i) => (
          <span
            key={i}
            className={`w-16 h-20 sm:w-20 sm:h-24 rounded-card border-2 flex items-center justify-center
              text-5xl sm:text-6xl font-black tabular-nums transition-colors
              ${d
                ? 'border-accent-500 bg-accent-50 text-accent-700'
                : 'border-dashed border-slate-300 bg-slate-50 text-slate-300'}`}
          >
            {d || '·'}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
        {KEYS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => press(n)}
            className="py-5 text-3xl font-bold text-slate-700 bg-white border border-slate-200
              rounded-control shadow-sm hover:bg-slate-50 active:bg-slate-200 active:scale-95
              disabled:opacity-40 transition-[background-color,transform] duration-100 tap-target"
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={backspace}
          aria-label="Xoá số vừa gõ"
          className="py-5 text-2xl text-slate-500 bg-slate-100 rounded-control
            hover:bg-slate-200 active:scale-95 disabled:opacity-40
            transition-[background-color,transform] duration-100 tap-target"
        >
          <i className="fa-solid fa-delete-left" aria-hidden="true" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => press('0')}
          className="py-5 text-3xl font-bold text-slate-700 bg-white border border-slate-200
            rounded-control shadow-sm hover:bg-slate-50 active:bg-slate-200 active:scale-95
            disabled:opacity-40 transition-[background-color,transform] duration-100 tap-target"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled || !enough}
          onClick={onSubmit}
          aria-label="Xác nhận mã"
          className="py-5 text-2xl text-white bg-emerald-600 rounded-control shadow-sm
            hover:bg-emerald-700 active:scale-95 disabled:opacity-40
            transition-[background-color,transform] duration-100 tap-target"
        >
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default NumericKeypad;
