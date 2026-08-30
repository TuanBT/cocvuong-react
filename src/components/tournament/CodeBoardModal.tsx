import React, { useEffect } from 'react';
import Modal from '../ui/Modal';
import CodeBoard from './CodeBoard';
import { ArenaAssignmentKey } from '../../services/staffService';
import { TournamentSummary } from '../../services/tournamentService';
import { ensureDemoCodesOnDemand } from '../../services/demoService';

interface CodeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentSummary;
  /** uid nguoi dang mo — de biet ban cham nhanh nay co phai cua ho khong */
  viewerUid: string;
  /** Chi san minh dang truc — giam sat khong xem duoc ma san khac */
  arenaKeys: ArenaAssignmentKey[];
}

/**
 * Bang ma **chi san minh**, mo nhanh tu header man giam sat.
 *
 * Giam dinh hong may giua tran thi giam sat phai mo khoa duoc ngay tai cho —
 * roi man hinh dang chay tran de di tra ma o trang khac la khong dung duoc.
 *
 * Day cung la cho **cap ma cho ban cham nhanh**: mo bang ma ra doc cho giam
 * dinh la duy nhat mot duong ma cua ban cham nhanh den tay ho, nen day la luc
 * som nhat that su can den mot dau so. Xem `ensureDemoCodesOnDemand` de biet
 * vi sao khong cap san tu luc mo ban.
 */
const CodeBoardModal: React.FC<CodeBoardModalProps> = ({
  isOpen,
  onClose,
  tournament,
  viewerUid,
  arenaKeys,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    // Ban-va-quen: bang ma nghe realtime nen ma vua sinh se tu hien ra. Khong
    // duoc phep chan viec mo bang — giai that thi da co ma tu luc tao roi.
    void ensureDemoCodesOnDemand(tournament, viewerUid);
  }, [isOpen, tournament, viewerUid]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mã giám định sân này"
      icon="fa-solid fa-key"
      size="lg"
    >
      <p className="text-sm text-slate-500 mt-0 mb-4">
        Đọc <strong className="text-slate-700">số của giải</strong> cho giám định — sân và số
        giám định thì họ tự chọn trên màn hình. Đổi máy hoặc hết pin thì bấm
        <strong className="text-slate-700"> Mở khoá</strong> rồi bảo họ chọn lại chỗ cũ.
      </p>
      <CodeBoard
        tournamentIndex={tournament.id}
        tournamentName={tournament.name}
        arenaKeys={arenaKeys}
        canManage
        compact
      />
    </Modal>
  );
};

export default CodeBoardModal;
