import React from 'react';
import Modal from '../ui/Modal';
import CodeBoard from './CodeBoard';
import { ArenaAssignmentKey } from '../../services/staffService';

interface CodeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentIndex: number;
  tournamentName: string;
  /** Chi san minh dang truc — giam sat khong xem duoc ma san khac */
  arenaKeys: ArenaAssignmentKey[];
  ownerUid: string;
}

/**
 * Bang ma **chi san minh**, mo nhanh tu header man giam sat.
 *
 * Giam dinh hong may giua tran thi giam sat phai mo khoa duoc ngay tai cho —
 * roi man hinh dang chay tran de di tra ma o trang khac la khong dung duoc.
 */
const CodeBoardModal: React.FC<CodeBoardModalProps> = ({
  isOpen,
  onClose,
  tournamentIndex,
  tournamentName,
  arenaKeys,
  ownerUid,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Mã giám định sân này"
    icon="fa-solid fa-key"
    size="lg"
  >
    <p className="text-sm text-slate-500 mt-0 mb-4">
      Đọc số cho giám định gõ vào máy của họ. Giám định đổi máy hoặc hết pin thì bấm
      <strong className="text-slate-700"> Mở khoá</strong> — số mã giữ nguyên.
    </p>
    <CodeBoard
      tournamentIndex={tournamentIndex}
      tournamentName={tournamentName}
      arenaKeys={arenaKeys}
      canManage
      ownerUid={ownerUid}
      compact
    />
  </Modal>
);

export default CodeBoardModal;
