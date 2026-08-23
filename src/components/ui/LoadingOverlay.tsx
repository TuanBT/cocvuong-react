import React from 'react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
}

/** Lop phu cho cac thao tac cham (doc file Excel, ghi Firebase). */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isOpen, message }) => {
  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-card p-8 shadow-pop flex flex-col items-center gap-4">
        <span className="w-14 h-14 border-4 border-accent-100 border-t-accent-600 rounded-full animate-spin" />
        <p className="text-slate-700 font-medium m-0">{message || 'Đang xử lý...'}</p>
      </div>
    </div>
  );
};

export default React.memo(LoadingOverlay);
