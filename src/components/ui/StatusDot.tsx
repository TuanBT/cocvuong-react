import React from 'react';

interface StatusDotProps {
  isOnline: boolean;
  onlineLabel?: string;
  offlineLabel?: string;
}

/** Cham bao trang thai ket noi, co tooltip khi ro chuot vao (xem index.css). */
const StatusDot: React.FC<StatusDotProps> = ({
  isOnline,
  onlineLabel = 'Đã kết nối Internet',
  offlineLabel = 'Mất kết nối',
}) => (
  <span
    role="status"
    aria-label={isOnline ? onlineLabel : offlineLabel}
    data-tooltip={isOnline ? onlineLabel : offlineLabel}
    className={`status-dot w-3 h-3 rounded-full block flex-shrink-0
      ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
  />
);

export default React.memo(StatusDot);
