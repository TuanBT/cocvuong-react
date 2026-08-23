import React from 'react';

/** Chan trang dung chung cho cac trang co cuon. */
const AppFooter: React.FC<{ className?: string }> = ({ className = '' }) => (
  <footer className={`mt-auto bg-white border-t border-slate-200 ${className}`}>
    <div className="max-w-7xl mx-auto px-4 py-4">
      <p className="text-center text-sm text-slate-400 m-0">
        Cóc Vương © 2022 · Bùi Tiến Tuân
      </p>
    </div>
  </footer>
);

export default React.memo(AppFooter);
