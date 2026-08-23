import React from 'react';

export type Accent = 'combat' | 'martial' | 'tool' | 'brand';

interface PageShellProps {
  /** Quyet dinh bang mau accent cua ca trang (xem index.css) */
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
}

/**
 * Khung ngoai cua moi trang co cuon (thong tin, thiet dat, tao giai, trang chu).
 *
 * - `data-accent` doi bien CSS --accent-* => moi component con dung
 *   bg-accent-600 / text-accent-700... tu dong khop mau cua trang.
 * - `select-text` mo lai boi den chu (the html dat user-select: none cho
 *   man hinh trinh chieu).
 */
const PageShell: React.FC<PageShellProps> = ({ accent = 'brand', className = '', children }) => (
  <div
    data-accent={accent}
    className={`min-h-screen bg-slate-50 text-slate-800 select-text flex flex-col ${className}`}
  >
    {children}
  </div>
);

export default PageShell;
