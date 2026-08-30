import React, { Component } from 'react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import { TournamentStatus } from '../../services/tournamentService';
import EmptyState from '../ui/EmptyState';
import ConfirmModal from '../ui/ConfirmModal';
import bellSound from '../../assets/sound/Reg.mp3';
import {
  AccessRequest, Assignments, ARENA_KEYS, ArenaAssignmentKey, StaffMember,
  allArenas, approveRequest, arenaKeyLabel, assignedKeys, rejectRequest,
  revokeStaff, subscribeRequests, subscribeStaff, undoReject, updateAssignments,
} from '../../services/staffService';
import type { TournamentId } from '../../types';

interface StaffApprovalPanelProps {
  tournamentIndex: TournamentId;
  /** uid ghi vao `approvedBy` — chu giai, hoac admin duyet ho */
  approvedBy: string;
  /** Don chi duoc nhan khi giai dang mo — hien loi nhac neu chua mo */
  tournamentStatus: TournamentStatus;
}

interface StaffApprovalPanelState {
  requests: AccessRequest[];
  staff: StaffMember[];
  /** Tick san cho tung don, chu giai bo tick de thu hep */
  draft: Record<string, Assignments>;
  /** Dang sua phan cong cua ai (uid) */
  editing: string | null;
  editDraft: Assignments;
  confirmRevoke: StaffMember | null;
}

/**
 * Hop duyet don cua chu giai.
 *
 * **Rui ro khong va duoc bang code:** khong co server nen khong push
 * notification duoc. Chu giai phai dang mo app moi nghe duoc don ve. Quy trinh
 * bu lai: duyet san truoc giai, luc hop ban to chuc.
 *
 * Mac dinh tick het moi san (chot 2026-08-25): chu giai khong phai quyet dinh
 * gi giua luc ban, bam Dong y la xong. Doi lai giam sat duoc ca 4 san thi app
 * khong tu biet mo san nao — vase bang `lastArena` o man giam sat.
 */
class StaffApprovalPanel extends Component<StaffApprovalPanelProps, StaffApprovalPanelState> {
  unsubRequests: (() => void) | null = null;
  unsubStaff: (() => void) | null = null;
  /** So don lan truoc, de chi keu chuong khi co don MOI ve */
  lastPendingCount = -1;

  state: StaffApprovalPanelState = {
    requests: [],
    staff: [],
    draft: {},
    editing: null,
    editDraft: {},
    confirmRevoke: null,
  };

  componentDidMount() {
    this.subscribe();
  }

  componentDidUpdate(prev: StaffApprovalPanelProps) {
    if (prev.tournamentIndex !== this.props.tournamentIndex) {
      this.lastPendingCount = -1;
      this.subscribe();
    }
  }

  componentWillUnmount() {
    this.unsubRequests?.();
    this.unsubStaff?.();
  }

  subscribe() {
    this.unsubRequests?.();
    this.unsubStaff?.();
    const { tournamentIndex } = this.props;

    this.unsubRequests = subscribeRequests(tournamentIndex, (requests) => {
      const pending = requests.filter((r) => !r.rejectedAt);

      if (this.lastPendingCount >= 0 && pending.length > this.lastPendingCount) {
        this.ring();
      }
      this.lastPendingCount = pending.length;

      this.setState((prev) => {
        const draft = { ...prev.draft };
        for (const r of pending) {
          // Tick san mac dinh theo don xin; don cung mac dinh xin het
          if (!draft[r.uid]) {
            draft[r.uid] = assignedKeys(r.want).length ? { ...r.want } : allArenas();
          }
        }
        return { requests, draft };
      });
    });

    this.unsubStaff = subscribeStaff(
      tournamentIndex,
      (staff) => this.setState({ staff }),
      () => toast.error('Không đọc được danh sách giám sát — giải này có phải của bạn không?')
    );
  }

  /** Chuong bao don moi. Trinh duyet chan phat tu dong thi bo qua. */
  ring() {
    try {
      const audio = new Audio(bellSound);
      audio.volume = 0.5;
      void audio.play().catch(() => undefined);
    } catch {
      /* khong phat duoc am thanh thi cham do van con */
    }
  }

  /** Ai dang truc san nay — de canh bao khi duyet nguoi thu hai vao cung san */
  whoIsOn(key: ArenaAssignmentKey): StaffMember[] {
    return this.state.staff.filter((s) => s.assignments?.[key] === true);
  }

  toggleDraft = (uid: string, key: ArenaAssignmentKey) => {
    this.setState((prev) => ({
      draft: {
        ...prev.draft,
        [uid]: { ...prev.draft[uid], [key]: !prev.draft[uid]?.[key] },
      },
    }));
  };

  handleApprove = async (req: AccessRequest) => {
    const assignments = this.state.draft[req.uid] || allArenas();
    const picked = assignedKeys(assignments);

    if (!picked.length) {
      toast.error('Chọn ít nhất một sân trước khi đồng ý.');
      return;
    }

    // App von da co loi tranh chap giua hai san — dung mo them duong sinh ra no
    const clashes = picked
      .map((k) => ({ key: k, people: this.whoIsOn(k) }))
      .filter((c) => c.people.length > 0);

    if (clashes.length) {
      const lines = clashes
        .map((c) => `• ${arenaKeyLabel(c.key)} — đã có ${c.people.map((p) => p.name).join(', ')}`)
        .join('\n');
      const ok = window.confirm(
        `Những sân này đã có người trực:\n\n${lines}\n\n` +
        `Hai người cùng một sân dễ ghi đè điểm của nhau. Vẫn duyệt?`
      );
      if (!ok) return;
    }

    try {
      await approveRequest(this.props.tournamentIndex, req, assignments, this.props.approvedBy);
      toast.success(`Đã duyệt ${req.name} — ${picked.map(arenaKeyLabel).join(', ')}`);
    } catch {
      toast.error('Không duyệt được. Kiểm tra lại: giải này có phải của bạn không?');
    }
  };

  handleReject = async (req: AccessRequest) => {
    try {
      await rejectRequest(this.props.tournamentIndex, req.uid);
      toast.info(`Đã từ chối ${req.name}.`);
    } catch {
      toast.error('Không từ chối được.');
    }
  };

  handleUndoReject = async (req: AccessRequest) => {
    await undoReject(this.props.tournamentIndex, req.uid);
    toast.success(`${req.name} có thể xin lại.`);
  };

  startEdit = (member: StaffMember) => {
    this.setState({ editing: member.uid, editDraft: { ...member.assignments } });
  };

  toggleEdit = (key: ArenaAssignmentKey) => {
    this.setState((prev) => ({ editDraft: { ...prev.editDraft, [key]: !prev.editDraft[key] } }));
  };

  saveEdit = async () => {
    const { editing, editDraft } = this.state;
    if (!editing) return;
    if (!assignedKeys(editDraft).length) {
      toast.error('Phải giữ lại ít nhất một sân, hoặc bấm Thu hồi.');
      return;
    }
    await updateAssignments(this.props.tournamentIndex, editing, editDraft);
    this.setState({ editing: null });
    toast.success('Đã sửa phân công.');
  };

  doRevoke = async () => {
    const member = this.state.confirmRevoke;
    if (!member) return;
    this.setState({ confirmRevoke: null });
    try {
      await revokeStaff(this.props.tournamentIndex, member.uid);
      toast.success(`Đã thu hồi quyền của ${member.name}.`);
    } catch {
      toast.error('Không thu hồi được.');
    }
  };

  renderArenaTicks(current: Assignments, onToggle: (k: ArenaAssignmentKey) => void) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {ARENA_KEYS.map((key) => {
          const on = current?.[key] === true;
          const busy = this.whoIsOn(key);
          return (
            <label
              key={key}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-control border cursor-pointer
                text-xs transition-colors
                ${on ? 'border-accent-500 bg-accent-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(key)}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="min-w-0">
                <span className="block font-medium text-slate-700">{arenaKeyLabel(key)}</span>
                {busy.length > 0 && (
                  <span className="block text-[10px] text-amber-600 truncate">
                    đã có {busy.map((p) => p.name).join(', ')}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  render() {
    const { requests, staff, draft, editing, editDraft, confirmRevoke } = this.state;
    const { tournamentStatus } = this.props;

    const pending = requests.filter((r) => !r.rejectedAt);
    const rejected = requests.filter((r) => r.rejectedAt);

    return (
      <div className="space-y-6">
        {tournamentStatus !== 'open' && (
          <p className="m-0 text-sm text-amber-800 bg-amber-50 border border-amber-200
            rounded-control px-3 py-2.5">
            <i className="fa-solid fa-circle-info mr-1.5" aria-hidden="true" />
            {tournamentStatus === 'closed'
              ? 'Giải đã đóng — không nhận đơn xin quyền nữa.'
              : tournamentStatus === 'deleted'
              ? 'Giải đã xoá — danh sách này giữ lại để tra ai từng trực sân nào.'
              : 'Giải chưa mở nên chưa nhận được đơn. Bấm “Mở giải” ở trên.'}
          </p>
        )}

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 m-0 mb-3">
            Yêu cầu chờ duyệt
            {pending.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5
                rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                {pending.length}
              </span>
            )}
          </h3>

          {pending.length === 0 ? (
            <p className="m-0 text-sm text-slate-400 italic">Không có đơn nào đang chờ.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div key={req.uid} className="border border-slate-200 rounded-card p-3.5 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    {req.photo ? (
                      <img src={req.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-slate-200 flex items-center
                        justify-center text-slate-500 font-bold">
                        {(req.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-semibold text-slate-800 truncate">{req.name}</p>
                      <p className="m-0 text-xs text-slate-500 truncate">{req.email}</p>
                    </div>
                  </div>

                  {req.note && (
                    <p className="m-0 mb-3 text-xs text-slate-600 bg-slate-50 rounded-control px-2.5 py-2">
                      “{req.note}”
                    </p>
                  )}

                  <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Cho trực sân
                  </p>
                  {this.renderArenaTicks(draft[req.uid] || allArenas(), (k) =>
                    this.toggleDraft(req.uid, k)
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button variant="success" size="sm" icon="fa-solid fa-check"
                      onClick={() => this.handleApprove(req)}>
                      Đồng ý
                    </Button>
                    <Button variant="secondary" size="sm" icon="fa-solid fa-xmark"
                      onClick={() => this.handleReject(req)}>
                      Từ chối
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 m-0 mb-3">
            Đang trực ({staff.length})
          </h3>

          {staff.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-user-group"
              title="Chưa có giám sát nào"
              hint="Duyệt trước giải, lúc họp ban tổ chức — giữa giải mà chờ duyệt là kẹt."
              className="py-8"
            />
          ) : (
            <div className="space-y-2.5">
              {staff.map((member) => (
                <div key={member.uid} className="border border-slate-200 rounded-card p-3 bg-white">
                  <div className="flex items-center gap-3">
                    {member.photo ? (
                      <img src={member.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-slate-200 flex items-center
                        justify-center text-slate-500 font-bold text-sm">
                        {(member.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-semibold text-slate-800 truncate">{member.name}</p>
                      <p className="m-0 text-xs text-slate-500 truncate">
                        {assignedKeys(member.assignments).map(arenaKeyLabel).join(' · ') || 'chưa có sân'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="ghost" icon="fa-solid fa-pen"
                        onClick={() => this.startEdit(member)}>
                        Sửa phân công
                      </Button>
                      <Button size="sm" variant="ghost" icon="fa-solid fa-user-slash"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => this.setState({ confirmRevoke: member })}>
                        Thu hồi
                      </Button>
                    </div>
                  </div>

                  {editing === member.uid && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {this.renderArenaTicks(editDraft, this.toggleEdit)}
                      <div className="flex gap-2 mt-2.5">
                        <Button size="sm" variant="primary" onClick={this.saveEdit}>Lưu</Button>
                        <Button size="sm" variant="secondary"
                          onClick={() => this.setState({ editing: null })}>Huỷ</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {rejected.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 m-0 mb-2">Đã từ chối</h3>
            <div className="space-y-1.5">
              {rejected.map((req) => (
                <div key={req.uid} className="flex items-center gap-2 text-xs text-slate-500
                  border border-slate-100 rounded-control px-3 py-2">
                  <span className="flex-1 truncate">{req.name} · {req.email}</span>
                  <button type="button" onClick={() => this.handleUndoReject(req)}
                    className="text-accent-700 font-medium hover:underline">
                    Cho xin lại
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmRevoke !== null}
          title="Thu hồi quyền giám sát"
          message={`${confirmRevoke?.name || ''} sẽ mất quyền chấm ngay lập tức. Máy của họ đang mở sẽ hiện màn hình “Quyền đã bị thu hồi”.`}
          confirmLabel="Thu hồi"
          onConfirm={this.doRevoke}
          onCancel={() => this.setState({ confirmRevoke: null })}
        />
      </div>
    );
  }
}

export default StaffApprovalPanel;
