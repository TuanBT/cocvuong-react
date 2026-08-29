import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  PageShell, PageHeader, SectionCard, Button, EmptyState,
  ConfirmModal, Toast, AppFooter,
} from '../components/ui';
import { AccountChip } from '../components/auth';
import CodeBoard from '../components/tournament/CodeBoard';

import { AppUser } from '../services/authService';
import {
  AdminTournamentRow, AdminUserRow, isAdmin, loadAllTournaments, loadAllUsers, loadStaffOf,
} from '../services/adminService';
import { StaffMember, arenaKeyLabel, assignedKeys, revokeStaff } from '../services/staffService';
import {
  closeTournament, openTournament, reopenTournament, transferOwnership,
} from '../services/tournamentService';
import { findDemoTournament } from '../services/demoService';

interface AdminContainerProps {
  user: AppUser;
}

interface AdminContainerState {
  checking: boolean;
  allowed: boolean;
  tournaments: AdminTournamentRow[];
  users: AdminUserRow[];
  /** Giai dang mo bang chi tiet */
  expanded: number | null;
  staff: StaffMember[];
  demoIndex: number | null;
  confirm: { title: string; message: string; label?: string; action: () => void } | null;
  busy: boolean;
}

/**
 * Trang `/quan-tri` — bang dieu khien giai dau va go roi phan quyen.
 *
 * **Gioi han noi thang:** trang nay KHONG khoa / khong xoa duoc tai khoan
 * Google. Viec do can Admin SDK, ma app khong co server. Day khong phai trang
 * quan tri tai khoan — dung hua voi ai la no thay duoc Firebase Console.
 *
 * Ai la admin: `appAdmin/{uid}: true`, **dat tay trong Console**. Co y khong
 * lam duong cap quyen admin tu trong app: khong co server thi moi duong cap
 * quyen trong app deu la duong de nguoi khac leo len.
 */
class AdminContainer extends Component<AdminContainerProps, AdminContainerState> {
  state: AdminContainerState = {
    checking: true,
    allowed: false,
    tournaments: [],
    users: [],
    expanded: null,
    staff: [],
    demoIndex: null,
    confirm: null,
    busy: false,
  };

  constructor(props: AdminContainerProps) {
    super(props);
    document.title = 'Quản trị - Cóc Vương';
  }

  componentDidMount() {
    void this.check();
  }

  async check() {
    const allowed = await isAdmin(this.props.user.uid);
    this.setState({ allowed, checking: false });
    if (allowed) void this.reload();
  }

  async reload() {
    this.setState({ busy: true });
    try {
      const [tournaments, users, demoIndex] = await Promise.all([
        loadAllTournaments(),
        loadAllUsers().catch(() => [] as AdminUserRow[]),
        findDemoTournament().catch(() => null),
      ]);
      this.setState({ tournaments, users, demoIndex });
    } catch {
      toast.error('Không đọc được dữ liệu quản trị.');
    } finally {
      this.setState({ busy: false });
    }
  }

  toggleExpand = async (index: number) => {
    if (this.state.expanded === index) {
      this.setState({ expanded: null, staff: [] });
      return;
    }
    const staff = await loadStaffOf(index).catch(() => [] as StaffMember[]);
    this.setState({ expanded: index, staff });
  };

  askConfirm = (title: string, message: string, action: () => void, label?: string) =>
    this.setState({ confirm: { title, message, action, label } });

  runConfirm = () => {
    const { confirm } = this.state;
    this.setState({ confirm: null }, () => confirm?.action());
  };

  handleStatus = async (row: AdminTournamentRow, next: 'open' | 'closed' | 'reopen') => {
    try {
      if (next === 'open') await openTournament(row.index);
      else if (next === 'reopen') await reopenTournament(row.index);
      else await closeTournament(row.index);
      await this.reload();
      toast.success('Đã cập nhật trạng thái giải.');
    } catch {
      toast.error('Không đổi được trạng thái giải này.');
    }
  };

  /** Cuu khi chu giai nghi, mat tai khoan, hoac tao nham bang tai khoan khac */
  handleTransfer = (row: AdminTournamentRow) => {
    const uid = window.prompt(
      `Đổi chủ giải "${row.name.replace(/\n/g, ' ')}"\n\n` +
      `Dán mã tài khoản (uid) của chủ giải mới. Người đó xem được mã tài khoản của mình ` +
      `ở cuối trang Thiết đặt.`,
      row.ownerUid
    );
    if (!uid) return;

    const target = this.state.users.find((u) => u.uid === uid.trim());
    this.askConfirm(
      'Đổi chủ giải',
      target
        ? `Giải sẽ chuyển sang ${target.name} (${target.email}). Chủ cũ mất toàn quyền ngay.`
        : `Không tìm thấy uid này trong danh sách người đã đăng nhập. Vẫn đổi? ` +
          `Đổi nhầm uid là không ai còn quản được giải này (trừ admin).`,
      async () => {
        try {
          await transferOwnership(row.index, {
            uid: uid.trim(),
            email: target?.email || '',
          });
          await this.reload();
          toast.success('Đã đổi chủ giải.');
        } catch {
          toast.error('Không đổi được chủ giải.');
        }
      },
      'Đổi chủ giải'
    );
  };

  handleClaimLegacy = (row: AdminTournamentRow) => {
    this.askConfirm(
      'Nhận giải cũ về tài khoản này',
      `Giải "${row.name.replace(/\n/g, ' ')}" chưa có chủ nên hiện ai cũng ghi được. ` +
      `Nhận về sẽ khoá lại cho tài khoản ${this.props.user.email}.`,
      async () => {
        await transferOwnership(row.index, this.props.user);
        await this.reload();
        toast.success('Đã nhận giải về tài khoản của bạn.');
      },
      'Nhận về'
    );
  };

  handleRevoke = (index: number, member: StaffMember) => {
    this.askConfirm(
      'Gỡ nhân sự',
      `${member.name} sẽ mất quyền chấm trên giải này ngay lập tức.`,
      async () => {
        await revokeStaff(index, member.uid);
        const staff = await loadStaffOf(index).catch(() => [] as StaffMember[]);
        this.setState({ staff });
        toast.success('Đã gỡ nhân sự.');
      },
      'Gỡ'
    );
  };

  renderTournamentRow(row: AdminTournamentRow) {
    const { expanded, staff, demoIndex } = this.state;
    const open = expanded === row.index;

    const badge = {
      draft: { text: 'Chưa mở', className: 'bg-slate-100 text-slate-600' },
      open: { text: 'Đang mở', className: 'bg-emerald-50 text-emerald-700' },
      closed: { text: 'Đã đóng', className: 'bg-red-50 text-red-700' },
    }[row.status];

    return (
      <div key={row.index} className="border border-slate-200 rounded-card overflow-hidden">
        <div className="p-3.5 bg-white">
          <div className="flex items-start gap-3">
            <span className="text-xs font-mono text-slate-400 mt-0.5 flex-shrink-0">#{row.index}</span>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-semibold text-slate-800 whitespace-pre-line">{row.name}</p>
              <p className="m-0 mt-1 text-xs text-slate-500 truncate">
                {row.ownerUid
                  ? `Chủ giải: ${row.ownerName || row.ownerEmail || row.ownerUid}`
                  : 'Chưa có chủ — ai cũng ghi được'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.text}
                </span>
                {row.demo && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
                    GIẢI THỬ
                  </span>
                )}
                {row.openAccess && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    MỞ TỰ DO
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {row.staffCount} giám sát
                </span>
                {row.requestCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {row.requestCount} đơn chờ
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Button size="sm" variant="ghost" icon={open ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'}
              onClick={() => this.toggleExpand(row.index)}>
              {open ? 'Thu gọn' : 'Nhân sự & mã'}
            </Button>

            {row.status !== 'open' && (
              <Button size="sm" variant="ghost"
                onClick={() => this.handleStatus(row, row.status === 'closed' ? 'reopen' : 'open')}>
                {row.status === 'closed' ? 'Mở lại' : 'Mở giải'}
              </Button>
            )}
            {row.status === 'open' && (
              <Button size="sm" variant="ghost"
                onClick={() => this.askConfirm(
                  'Đóng giải',
                  'Toàn bộ mã giám định của giải sẽ bị thu hồi ngay lập tức.',
                  () => this.handleStatus(row, 'closed'),
                  'Đóng giải'
                )}>
                Đóng giải
              </Button>
            )}

            {row.ownerUid ? (
              <Button size="sm" variant="ghost" onClick={() => this.handleTransfer(row)}>
                Đổi chủ giải
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => this.handleClaimLegacy(row)}>
                Nhận về tài khoản tôi
              </Button>
            )}

            {row.index === demoIndex && (
              <span className="text-[11px] text-slate-400 self-center">
                giải thử dùng chung — không xoá
              </span>
            )}
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-slate-50 p-3.5 space-y-4">
            <div>
              <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nhân sự
              </p>
              {staff.length === 0 ? (
                <p className="m-0 text-sm text-slate-400 italic">Chưa có giám sát nào.</p>
              ) : (
                <div className="space-y-1.5">
                  {staff.map((m) => (
                    <div key={m.uid} className="flex items-center gap-2 bg-white border
                      border-slate-200 rounded-control px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-800 truncate">{m.name}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {assignedKeys(m.assignments).map(arenaKeyLabel).join(' · ') || '—'}
                        </span>
                      </span>
                      <button type="button" onClick={() => this.handleRevoke(row.index, m)}
                        className="text-xs text-red-600 hover:underline flex-shrink-0">Gỡ</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Bảng mã giám định
              </p>
              <CodeBoard
                tournamentIndex={row.index}
                tournamentName={row.name}
                ownerUid={row.ownerUid || this.props.user.uid}
                canManage
                compact
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  render() {
    const { user } = this.props;
    const { checking, allowed, tournaments, users, confirm, busy } = this.state;

    if (checking) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3
          bg-slate-50 text-slate-500">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl" aria-hidden="true" />
          <p className="m-0 text-sm">Đang kiểm tra quyền…</p>
        </div>
      );
    }

    if (!allowed) {
      return (
        <PageShell accent="brand">
          <PageHeader title="Quản trị" icon="fa-solid fa-shield-halved" />
          <main className="flex-1 w-full max-w-lg mx-auto px-4 py-10">
            <EmptyState
              icon="fa-solid fa-lock"
              title="Trang này chỉ dành cho quản trị viên"
              hint="Quyền admin được đặt tay trong Firebase Console, không cấp được từ trong app."
            />
            <p className="text-center text-xs text-slate-400 mt-4">
              Mã tài khoản của bạn:{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">{user.uid}</code>
            </p>
            <p className="text-center mt-6 mb-0">
              <NavLink to="/" className="text-sm text-accent-700 hover:underline">Về trang chủ</NavLink>
            </p>
          </main>
          <AppFooter />
        </PageShell>
      );
    }

    return (
      <PageShell accent="brand">
        <PageHeader title="Quản trị" icon="fa-solid fa-shield-halved">
          <div className="flex justify-end">
            <AccountChip user={user} />
          </div>
        </PageHeader>

        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          <SectionCard
            title={`Mọi giải đấu (${tournaments.length})`}
            icon="fa-solid fa-trophy"
            action={
              <Button size="sm" variant="ghost" icon="fa-solid fa-rotate"
                className="text-white hover:bg-white/15"
                disabled={busy} onClick={() => this.reload()}>
                Tải lại
              </Button>
            }
          >
            {tournaments.length === 0 ? (
              <EmptyState icon="fa-solid fa-folder-open" title="Chưa có giải nào" />
            ) : (
              <div className="space-y-2.5">
                {tournaments.map((row) => this.renderTournamentRow(row))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Người đã đăng nhập (${users.length})`} icon="fa-solid fa-users" tone="neutral">
            {users.length === 0 ? (
              <EmptyState icon="fa-solid fa-user-slash" title="Chưa có ai đăng nhập" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="py-2 pr-3 font-semibold">Người dùng</th>
                      <th className="py-2 pr-3 font-semibold">Lần cuối</th>
                      <th className="py-2 font-semibold">Đang trực</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.uid} className="border-t border-slate-100 align-top">
                        <td className="py-2.5 pr-3">
                          <span className="block text-slate-800">{u.name}</span>
                          <span className="block text-xs text-slate-500">{u.email}</span>
                          <code className="block text-[10px] text-slate-300 mt-0.5">{u.uid}</code>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-slate-500 whitespace-nowrap">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-2.5 text-xs text-slate-600">
                          {u.duties.length ? u.duties.map((d, i) => <div key={i}>{d}</div>) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <p className="text-xs text-slate-500 bg-slate-100 border border-slate-200
            rounded-control px-3 py-2.5 m-0 leading-relaxed">
            <i className="fa-solid fa-circle-info mr-1.5 text-slate-400" aria-hidden="true" />
            Trang này <strong>không khoá và không xoá được tài khoản Google</strong> — việc đó cần
            Admin SDK, mà app không có server. Đây là bảng điều khiển giải đấu và gỡ rối phân quyền,
            không thay được Firebase Console.
          </p>
        </main>

        <AppFooter />

        <ConfirmModal
          isOpen={confirm !== null}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          confirmLabel={confirm?.label}
          onConfirm={this.runConfirm}
          onCancel={() => this.setState({ confirm: null })}
        />

        <Toast />
      </PageShell>
    );
  }
}

export default AdminContainer;
