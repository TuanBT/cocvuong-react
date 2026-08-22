import React from 'react';

export type SectionTone = 'accent' | 'neutral' | 'success' | 'warning';

interface SectionCardProps {
  title: string;
  icon?: string;
  tone?: SectionTone;
  /** Noi dung phu ben phai tieu de (nut, so luong...) */
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const TONES: Record<SectionTone, string> = {
  accent: 'bg-accent-600',
  neutral: 'bg-slate-700',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
};

/**
 * The noi dung co thanh tieu de mau - dung cho trang thiet dat va tao giai.
 * Thay cho cac khoi `rounded-2xl shadow-lg` viet lap o tung trang.
 */
const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  tone = 'accent',
  action,
  className = '',
  bodyClassName = 'p-4 sm:p-6',
  children,
}) => (
  <section className={`bg-white rounded-card shadow-card border border-slate-100 overflow-hidden ${className}`}>
    <div className={`${TONES[tone]} px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3`}>
      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 m-0 min-w-0">
        {icon && <i className={`${icon} flex-shrink-0`} aria-hidden="true" />}
        <span className="truncate">{title}</span>
      </h2>
      {action}
    </div>
    <div className={bodyClassName}>{children}</div>
  </section>
);

export default SectionCard;
