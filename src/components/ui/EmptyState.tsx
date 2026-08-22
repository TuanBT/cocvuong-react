import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
  className?: string;
}

/** Trang thai rong dung chung cho bang du lieu va danh sach. */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fa-solid fa-inbox',
  title,
  hint,
  className = 'py-12',
}) => (
  <div className={`text-center text-slate-400 ${className}`}>
    <i className={`${icon} text-4xl mb-3 block`} aria-hidden="true" />
    <p className="m-0 font-medium text-slate-500">{title}</p>
    {hint && <p className="m-0 mt-1 text-sm">{hint}</p>}
  </div>
);

export default React.memo(EmptyState);
