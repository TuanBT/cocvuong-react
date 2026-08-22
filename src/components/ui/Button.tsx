import React from 'react';

export type ButtonVariant =
  | 'primary'   // hanh dong chinh, dung mau accent cua trang
  | 'secondary' // hanh dong phu, vien xam
  | 'ghost'     // hanh dong nhe, khong vien
  | 'success'
  | 'danger'
  | 'warning';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Class Font Awesome, vi du "fa-solid fa-floppy-disk" */
  icon?: string;
  /** Chiem tron chieu ngang cua khung cha */
  block?: boolean;
  children?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm',
  secondary: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  // min-h dam bao vung cham >= 40px tren mobile
  sm: 'text-sm px-3 py-1.5 gap-1.5 min-h-[36px] rounded-lg',
  md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px] rounded-control',
  lg: 'text-base px-5 py-3 gap-2 min-h-[48px] rounded-control',
};

/**
 * Nut bam dung chung cho toan bo app.
 * `primary` an theo accent cua trang (data-accent tren PageShell).
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center font-medium tap-target
      transition-colors duration-150
      disabled:opacity-50 disabled:pointer-events-none
      ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
    {...rest}
  >
    {icon && <i className={icon} aria-hidden="true" />}
    {children}
  </button>
);

export default React.memo(Button);
