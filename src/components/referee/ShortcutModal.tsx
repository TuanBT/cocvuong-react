import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Khung modal phim tat; noi dung cu the do tung trang giam dinh truyen vao. */
const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Phím tắt"
    icon="fa-solid fa-keyboard"
    footer={<Button variant="primary" block onClick={onClose}>Đã hiểu</Button>}
  >
    {children}
  </Modal>
);

export default ShortcutModal;
