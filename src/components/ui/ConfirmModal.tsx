import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` cho hanh dong khong hoan tac duoc (xoa, ghi de) */
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hop thoai xac nhan dung chung cho cac hanh dong ghi de / xoa du lieu. */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ bỏ',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    icon="fa-solid fa-triangle-exclamation"
    size="sm"
    footer={
      <>
        <Button variant="secondary" block onClick={onCancel} icon="fa-solid fa-xmark">
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} block onClick={onConfirm} icon="fa-solid fa-check">
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-slate-600 m-0 leading-relaxed">{message}</p>
  </Modal>
);

export default ConfirmModal;
