import React, { useCallback, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface PasswordModalProps {
  isOpen: boolean;
  /** Chuoi mat khau dang nhap, do trang cha giu */
  value: string;
  /** Nhan gia tri moi; '-1' nghia la xoa trang */
  onInput: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  title?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/**
 * Modal nhap mat khau dung chung cho: giam dinh doi khang, giam dinh thi quyen,
 * thiet dat va tao giai. Truoc day 4 trang copy nguyen khoi markup nay.
 *
 * Ban phim so hien tren man hinh de dung duoc tren dien thoai; dong thoi van
 * nhan phim so vat ly va Enter tren laptop.
 */
const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  value,
  onInput,
  onSubmit,
  onClose,
  title = 'Nhập mật khẩu',
}) => {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        onInput(e.key);
      } else if (e.key === 'Enter') {
        onSubmit();
      } else if (e.key === 'Backspace') {
        onInput('-1');
      }
    },
    [onInput, onSubmit]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} icon="fa-solid fa-lock" size="sm"
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>Hủy</Button>
          <Button variant="primary" block onClick={onSubmit}>Xác nhận</Button>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="password"
            inputMode="numeric"
            aria-label="Mật khẩu"
            className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-control bg-slate-50
              text-lg tracking-[0.4em] text-center text-slate-800"
            placeholder="••••••"
            value={value}
            readOnly
          />
        </div>
        <button
          type="button"
          onClick={() => onInput('-1')}
          aria-label="Xoá mật khẩu"
          className="w-11 h-11 flex items-center justify-center bg-red-50 text-red-600
            rounded-control hover:bg-red-100 transition-colors tap-target"
        >
          <i className="fas fa-trash-alt" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {KEYS.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onInput(num)}
            className="py-3.5 text-xl font-bold text-slate-700 bg-slate-100 rounded-control
              hover:bg-slate-200 active:bg-slate-300 active:scale-95
              transition-[background-color,transform] duration-100 tap-target"
          >
            {num}
          </button>
        ))}
      </div>
    </Modal>
  );
};

export default PasswordModal;
