import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface RefereeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Giai thich cham trang thai ket noi - chung cho 2 trang giam dinh. */
const RefereeHelpModal: React.FC<RefereeHelpModalProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Hướng dẫn sử dụng"
    icon="fa-solid fa-circle-question"
    footer={<Button variant="primary" block onClick={onClose}>Đã hiểu</Button>}
  >
    <div className="flex items-center gap-2 mb-3">
      <i className="fa-solid fa-signal text-slate-400" aria-hidden="true" />
      <span className="font-semibold text-slate-700">Trạng thái kết nối</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
      <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-control">
        <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="text-slate-600">Đã kết nối Internet</span>
      </div>
      <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-control">
        <span className="w-3 h-3 rounded-full bg-slate-400 flex-shrink-0" />
        <span className="text-slate-600">Mất kết nối</span>
      </div>
    </div>
    <p className="mt-4 mb-0 text-sm text-slate-500 bg-amber-50 border border-amber-200 rounded-control p-3">
      <i className="fa-solid fa-circle-info mr-1.5 text-amber-500" aria-hidden="true" />
      Khi mất kết nối, điểm chấm sẽ không gửi được. Hãy chờ chấm sáng lại rồi chấm lại.
    </p>
  </Modal>
);

export default RefereeHelpModal;
