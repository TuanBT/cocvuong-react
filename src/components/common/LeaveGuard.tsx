import React, { useEffect, useState } from 'react';
import ConfirmModal from '../ui/ConfirmModal';

/**
 * Chot chan roi man cham diem.
 *
 * Giua tran, mot cai quet trackpad hai ngon la trinh duyet lui trang — man
 * cham bien mat, dong ho dung, ca san nhin len khong thay gi. Diem thi khong
 * mat (nam tren Firebase ca) nhung nguoi truc phai mo lai, doi tai xong moi
 * cham tiep duoc. O giua hiep thi ngan ay giay la dai.
 *
 * Nen `<Prompt>` cua react-router chan moi duong ra — ca Back cua trinh duyet
 * lan link trong app — roi hoi lai mot cau.
 *
 * Hai manh: `confirmNavigation` cam vao `getUserConfirmation` cua router o
 * `index.tsx`, con `LeaveGuardHost` la cai modal that su hien ra. Phai tach
 * doi vi router chi nhan MOT ham, goi bat ky luc nao, con modal thi phai nam
 * tren cay React moi ve duoc.
 */

interface Pending {
  message: string;
  decide: (leave: boolean) => void;
}

let notify: ((p: Pending | null) => void) | null = null;

/** Cam vao `<BrowserRouter getUserConfirmation={...}>`. */
export function confirmNavigation(message: string, callback: (ok: boolean) => void): void {
  // Chua co Host tren cay — dung hop thoai cua trinh duyet. Xau hon nhung con
  // hon la chan im lang roi khong ai bam duoc gi de di tiep.
  if (!notify) {
    // eslint-disable-next-line no-alert
    callback(window.confirm(message));
    return;
  }
  notify({
    message,
    decide: (leave) => {
      notify?.(null);
      callback(leave);
    },
  });
}

/** Dat MOT lan trong `<BrowserRouter>`. Khong co no thi rot ve `window.confirm`. */
export const LeaveGuardHost: React.FC = () => {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    notify = setPending;
    return () => {
      notify = null;
    };
  }, []);

  return (
    <ConfirmModal
      isOpen={pending !== null}
      title="Rời màn giám sát?"
      message={pending?.message ?? ''}
      confirmLabel="Rời đi"
      cancelLabel="Ở lại"
      tone="danger"
      onConfirm={() => pending?.decide(true)}
      onCancel={() => pending?.decide(false)}
    />
  );
};

export default LeaveGuardHost;
