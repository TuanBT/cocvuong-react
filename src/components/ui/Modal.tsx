import React, { useCallback, useEffect, useRef } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  /** Class Font Awesome hien canh tieu de */
  icon?: string;
  size?: ModalSize;
  /** Cho phep dong bang Esc / bam nen mo. Mac dinh bat. */
  dismissable?: boolean;
  onClose: () => void;
  /** Vung nut o chan modal */
  footer?: React.ReactNode;
  /** Bo padding mac dinh cua than modal */
  bodyClassName?: string;
  children: React.ReactNode;
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** Dem so modal dang mo de chi mo khoa cuon trang khi cai cuoi cung dong */
let openCount = 0;

/**
 * Khung modal dung chung: nen mo, thanh tieu de mau accent, than cuon duoc,
 * chan modal co dinh. Xu ly san Esc, bam ra ngoai va khoa cuon nen.
 *
 * Chieu cao gioi han theo dvh nen tren dien thoai doc, khi ban phim hien len
 * modal van khong bi day ra ngoai man hinh.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  icon,
  size = 'md',
  dismissable = true,
  onClose,
  footer,
  bodyClassName = 'p-4 sm:p-5',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dismissable) return;
      if (e.target === e.currentTarget) onClose();
    },
    [dismissable, onClose]
  );

  // Esc de dong + khoa cuon nen khi modal mo
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    openCount += 1;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Dua focus vao modal de dieu huong ban phim bat dau tu day
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, dismissable, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4
        bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`w-full ${SIZES[size]} bg-white rounded-card shadow-pop overflow-hidden
          flex flex-col max-h-[calc(100dvh-1.5rem)] animate-pop-in outline-none`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-accent-600 flex-shrink-0">
          <h2 className="text-white font-bold text-base sm:text-lg flex items-center gap-2 m-0 min-w-0">
            {icon && <i className={`${icon} flex-shrink-0`} aria-hidden="true" />}
            <span className="truncate">{title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center
              text-white/80 hover:text-white hover:bg-white/15 transition-colors tap-target"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
          </button>
        </div>

        <div className={`overflow-y-auto flex-1 ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="flex gap-2 p-3 bg-slate-50 border-t border-slate-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
