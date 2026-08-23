import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface RefereeSetupModalProps {
  isOpen: boolean;
  tournaments: [number, string][];
  selectedTournament: number;
  onSelectTournament: (index: number) => void;
  selectedArena: number;
  onSelectArena: (index: number) => void;
  selectedReferee: number;
  onSelectReferee: (position: number) => void;
  /** Giai co 5 giam dinh thay vi 3 */
  showFiveReferees: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ARENAS = ['Sân A', 'Sân B'];

/**
 * Modal chon giai dau / san thi dau / vi tri giam dinh.
 *
 * Truoc day 2 trang giam dinh chep lai cung khoi nay, va mot ban dung radio
 * khong kiem soat (defaultChecked + ref) nen o chon khong sang lai dung khi mo
 * lai modal. O day tat ca deu la o chon co kiem soat.
 */
const RefereeSetupModal: React.FC<RefereeSetupModalProps> = ({
  isOpen,
  tournaments,
  selectedTournament,
  onSelectTournament,
  selectedArena,
  onSelectArena,
  selectedReferee,
  onSelectReferee,
  showFiveReferees,
  onConfirm,
  onClose,
}) => {
  const refereePositions = showFiveReferees ? [1, 2, 3, 4, 5] : [1, 2, 3];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn thông tin"
      icon="fa-solid fa-id-badge"
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>Hủy</Button>
          <Button variant="primary" block onClick={onConfirm}>Xác nhận</Button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset className="m-0 p-0 border-0">
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 p-0">
            Giải đấu
          </legend>
          {tournaments.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {tournaments.map((tournament, index) => (
                <label
                  key={tournament[0]}
                  className={`flex items-center gap-2.5 p-2.5 border-2 rounded-control cursor-pointer transition-colors
                    ${selectedTournament === index
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <input
                    type="radio"
                    name="setup-tournament"
                    checked={selectedTournament === index}
                    onChange={() => onSelectTournament(index)}
                    className="w-4 h-4 accent-slate-700 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-700 whitespace-pre-line">{tournament[1]}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm m-0">Không có giải đấu</p>
          )}
        </fieldset>

        <fieldset className="m-0 p-0 border-0">
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 p-0">
            Sân thi đấu
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {ARENAS.map((arena, index) => (
              <label key={arena} className="cursor-pointer">
                <input
                  type="radio"
                  name="setup-arena"
                  checked={selectedArena === index}
                  onChange={() => onSelectArena(index)}
                  className="peer sr-only"
                />
                <span className="flex flex-col items-center justify-center gap-1 p-3 min-h-[64px]
                  border-2 border-slate-200 rounded-control text-center transition-colors
                  peer-checked:border-accent-500 peer-checked:bg-accent-50">
                  <i className="fa-solid fa-chess-board text-xl text-accent-600" aria-hidden="true" />
                  <span className="font-bold text-sm text-slate-700">{arena}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 p-0 border-0">
          <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 p-0">
            Vị trí giám định
          </legend>
          <div className={`grid gap-2 ${showFiveReferees ? 'grid-cols-5' : 'grid-cols-3'}`}>
            {refereePositions.map((position) => (
              <label key={position} className="cursor-pointer">
                <input
                  type="radio"
                  name="setup-referee"
                  checked={selectedReferee === position}
                  onChange={() => onSelectReferee(position)}
                  className="peer sr-only"
                />
                <span className="flex items-center justify-center p-2 min-h-[44px]
                  border-2 border-slate-200 rounded-control text-center transition-colors
                  peer-checked:border-accent-500 peer-checked:bg-accent-50">
                  <span className="font-bold text-sm text-slate-700">GĐ{position}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
};

export default RefereeSetupModal;
