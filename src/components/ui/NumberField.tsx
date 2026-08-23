import React from 'react';

interface NumberFieldProps {
  name: string;
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Don vi hien mo ben trong o nhap, vi du "giây" */
  unit?: string;
  min?: number;
}

/** O nhap so co nhan va don vi - dung cho cac moc thoi gian trong thiet dat. */
const NumberField: React.FC<NumberFieldProps> = ({ name, label, value, onChange, unit, min = 0 }) => (
  <div>
    <label htmlFor={`field-${name}`} className="block text-xs font-medium text-slate-500 mb-1">
      {label}
    </label>
    <div className="relative">
      <input
        id={`field-${name}`}
        type="number"
        inputMode="numeric"
        name={name}
        min={min}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2.5 border border-slate-200 rounded-control text-center
          text-slate-800 bg-white tabular-nums
          focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow
          ${unit ? 'pr-12' : ''}`}
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  </div>
);

export default React.memo(NumberField);
