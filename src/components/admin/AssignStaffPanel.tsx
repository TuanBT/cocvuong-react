import React, { Component } from 'react';
import { toast } from 'react-toastify';

import Button from '../ui/Button';
import ArenaTicks from './ArenaTicks';
import UserPicker, { PickableUser } from './UserPicker';

import {
  ArenaAssignmentKey, Assignments, StaffMember,
  allArenas, arenaKeyLabel, assignedKeys, grantStaff, replaceStaff,
} from '../../services/staffService';
import type { TournamentId } from '../../types';

interface AssignStaffPanelProps {
  tournamentIndex: TournamentId;
  /** Moi nguoi da tung dang nhap — chua dang nhap lan nao thi khong chi dinh duoc */
  users: PickableUser[];
  staff: StaffMember[];
  /** uid ghi vao `approvedBy` — de sau con tra ai da cap quyen */
  approvedBy: string;
  onChanged: () => void;
}

type Mode = 'add' | 'replace';

interface AssignStaffPanelState {
  mode: Mode;
  picked: PickableUser | null;
  draft: Assignments;
  /** uid nguoi sap bi thay */
  outgoing: string;
  busy: boolean;
}

/**
 * Hai viec chu giai lam duoc nhung tu truoc den nay app khong co cho bam:
 * **chi dinh thang** mot nguoi vao truc san, va **thay nguoi** giua giai.
 *
 * Vi sao can: co che duy nhat de vao truc san la nguoi kia tu nop don roi chu
 * giai duyet. Giua giai, nguoi dang truc mat may / het pin / phai ve som thi
 * duong do ket cung — nguoi thay phai tu mo app, tim dung giai, nop don, roi
 * cho chu giai nhin thay. O day di thang tu phia nguoi co quyen.
 *
 * Nguoi duoc chi dinh KHONG phai lam gi ca: `tournamentStaff` la node ma man
 * giam sat dang lang nghe san, nen may ho tu vao thang.
 */
class AssignStaffPanel extends Component<AssignStaffPanelProps, AssignStaffPanelState> {
  state: AssignStaffPanelState = {
    mode: 'add',
    picked: null,
    draft: allArenas(),
    outgoing: '',
    busy: false,
  };

  /** Ai dang truc san nay — canh bao hai nguoi mot san */
  whoIsOn = (key: ArenaAssignmentKey): string[] =>
    this.props.staff.filter((s) => s.assignments?.[key] === true).map((s) => s.name || s.email);

  setMode = (mode: Mode) => this.setState({ mode, picked: null, outgoing: '' });

  toggle = (key: ArenaAssignmentKey) =>
    this.setState((p) => ({ draft: { ...p.draft, [key]: !p.draft[key] } }));

  reset = () => this.setState({ picked: null, draft: allArenas(), outgoing: '', busy: false });

  handleGrant = async () => {
    const { tournamentIndex, approvedBy, onChanged } = this.props;
    const { picked, draft } = this.state;
    if (!picked) return;

    const picks = assignedKeys(draft);
    if (!picks.length) {
      toast.error('Chọn ít nhất một sân.');
      return;
    }

    this.setState({ busy: true });
    try {
      await grantStaff(
        tournamentIndex,
        { uid: picked.uid, email: picked.email, name: picked.name, photo: picked.photo },
        draft,
        approvedBy
      );
      toast.success(`Đã cho ${picked.name || picked.email} trực ${picks.map(arenaKeyLabel).join(', ')}.`);
      this.reset();
      onChanged();
    } catch {
      this.setState({ busy: false });
      toast.error('Không chỉ định được. Kiểm tra lại quyền trên giải này.');
    }
  };

  handleReplace = async () => {
    const { tournamentIndex, staff, approvedBy, onChanged } = this.props;
    const { picked, outgoing } = this.state;
    const out = staff.find((s) => s.uid === outgoing);
    if (!picked || !out) return;

    if (picked.uid === out.uid) {
      toast.error('Chọn người khác để thay.');
      return;
    }

    this.setState({ busy: true });
    try {
      const merged = await replaceStaff(
        tournamentIndex,
        out,
        { uid: picked.uid, email: picked.email, name: picked.name, photo: picked.photo },
        approvedBy
      );
      toast.success(
        `${picked.name || picked.email} thay ${out.name} — ${assignedKeys(merged).map(arenaKeyLabel).join(', ')}.`
      );
      this.reset();
      onChanged();
    } catch {
      this.setState({ busy: false });
      toast.error('Không thay được người. Kiểm tra lại quyền trên giải này.');
    }
  };

  renderAdd() {
    const { users, staff } = this.props;
    const { picked, draft, busy } = this.state;

    return (
      <>
        <UserPicker
          users={users}
          excludeUids={staff.map((s) => s.uid)}
          selectedUid={picked?.uid}
          onPick={(u) => this.setState({ picked: u })}
        />

        {picked && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Cho {picked.name || picked.email} trực sân
            </p>
            <ArenaTicks value={draft} onToggle={this.toggle} busyBy={this.whoIsOn} />
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="success" icon="fa-solid fa-user-plus"
                disabled={busy} onClick={this.handleGrant}>
                {busy ? 'Đang ghi…' : 'Chỉ định'}
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={this.reset}>Huỷ</Button>
            </div>
          </div>
        )}
      </>
    );
  }

  renderReplace() {
    const { users, staff } = this.props;
    const { picked, outgoing, busy } = this.state;
    const out = staff.find((s) => s.uid === outgoing) || null;

    if (!staff.length) {
      return (
        <p className="m-0 text-sm text-slate-400 italic">
          Giải chưa có ai trực — dùng “Chỉ định thẳng” ở trên.
        </p>
      );
    }

    return (
      <>
        <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Người rời sân
        </p>
        <div className="space-y-1 mb-3">
          {staff.map((s) => {
            const on = s.uid === outgoing;
            return (
              <button
                key={s.uid}
                type="button"
                onClick={() => this.setState({ outgoing: on ? '' : s.uid })}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-control
                  border transition-colors
                  ${on ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-800 truncate">{s.name || s.email}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {assignedKeys(s.assignments).map(arenaKeyLabel).join(' · ') || 'chưa có sân'}
                  </span>
                </span>
                {on && <i className="fa-solid fa-arrow-right text-red-500" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {out && (
          <>
            <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Người vào thay
            </p>
            <UserPicker
              users={users}
              excludeUids={[out.uid]}
              selectedUid={picked?.uid}
              onPick={(u) => this.setState({ picked: u })}
            />

            {picked && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="m-0 mb-3 text-xs text-slate-600 bg-slate-50 border border-slate-200
                  rounded-control px-3 py-2.5 leading-relaxed">
                  <strong>{picked.name || picked.email}</strong> nhận{' '}
                  {assignedKeys(out.assignments).map(arenaKeyLabel).join(', ') || '(chưa sân nào)'}
                  {' '}và <strong>{out.name}</strong> bị gỡ khỏi giải.
                  {' '}Máy của {out.name} đang mở sẽ hiện “Quyền đã bị thu hồi”.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="warning" icon="fa-solid fa-right-left"
                    disabled={busy} onClick={this.handleReplace}>
                    {busy ? 'Đang thay…' : 'Thay người'}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={this.reset}>Huỷ</Button>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  render() {
    const { mode } = this.state;
    const tab = (key: Mode, icon: string, label: string) => (
      <button
        type="button"
        onClick={() => this.setMode(key)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-control border transition-colors
          ${mode === key
            ? 'border-accent-500 bg-accent-50 text-accent-700'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
      >
        <i className={`${icon} mr-1.5`} aria-hidden="true" />
        {label}
      </button>
    );

    return (
      <div className="bg-white border border-slate-200 rounded-card p-3.5">
        <div className="flex gap-1.5 mb-3">
          {tab('add', 'fa-solid fa-user-plus', 'Chỉ định thẳng')}
          {tab('replace', 'fa-solid fa-right-left', 'Thay người trực sân')}
        </div>
        {mode === 'add' ? this.renderAdd() : this.renderReplace()}
      </div>
    );
  }
}

export default AssignStaffPanel;
