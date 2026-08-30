import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  PageShell, PageHeader, SectionCard, Button, EmptyState,
  ConfirmModal, Modal, Toast, AppFooter, Pagination,
} from '../components/ui';
import { AccountChip } from '../components/auth';
import CodeBoard from '../components/tournament/CodeBoard';
import StaffApprovalPanel from '../components/tournament/StaffApprovalPanel';
import {
  ArenaTicks, AssignStaffPanel, AuditPanel, OnlineBoard, UserPicker, PickableUser,
} from '../components/admin';

import { AppUser } from '../services/authService';
import {
  AdminOverview, AdminTournamentRow, AdminUserRow,
  loadAdminOverview, revokeEverywhere, subscribeIsAdmin,
} from '../services/adminService';
import {
  ArenaAssignmentKey, Assignments, StaffMember,
  allArenas, arenaKeyLabel, assignedKeys, grantStaff, subscribeStaff,
} from '../services/staffService';
import {
  TournamentStatus,
  canPurge, closeTournament, deleteTournament, openTournament, purgeTournament,
  renameTournament, reopenTournament, restoreTournament, setOpenAccess, transferOwnership,
} from '../services/tournamentService';
import type { TournamentId } from '../types';
import { formatEventDate } from '../utils/helpers';
import { pageOf, paginate } from '../utils/pagination';

/** The giai cao gan mot phan tu man hinh — 10 the la du dai cho mot trang */
const TOURNAMENT_PAGE_SIZE = 10;
/** Bang chon giai trong hop thoai chi dinh — hop thoai khong duoc cao qua man hinh */
const ASSIGN_PAGE_SIZE = 6;

interface AdminContainerProps {
  user: AppUser;
}

type Tab = 'tournaments' | 'users' | 'audit';
type StatusFilter = 'all' | 'open' | 'draft' | 'closed' | 'deleted';

interface ConfirmSpec {
  title: string;
  message: React.ReactNode;
  label?: string;
  tone?: 'danger' | 'primary';
  action: () => void | Promise<void>;
}

interface AdminContainerState {
  checking: boolean;
  allowed: boolean;
  overview: AdminOverview | null;
  busy: boolean;

  tab: Tab;
  query: string;
  statusFilter: StatusFilter;
  /** Trang cua bang giai, dem tu 0 — o tim va bo loc deu dua no ve 0 */
  page: number;

  /** Giai dang mo bang chi tiet */
  expanded: TournamentId | null;
  /** Nhan su cua giai dang mo — nghe realtime nen luon khop voi bang duyet don */
  staff: StaffMember[];
  /** Nguoi dang mo ho so */
  expandedUser: string | null;

  confirm: ConfirmSpec | null;
  /** Giai dang doi chu */
  transfer: AdminTournamentRow | null;
  /** Giai dang doi ten, kem o go */
  rename: { id: TournamentId; value: string } | null;
  /** Chi dinh mot nguoi vao mot giai (mo tu tab Nguoi dung) */
  assign: {
    user: AdminUserRow; id: TournamentId | null; draft: Assignments;
    /** Trang cua bang chon giai trong hop thoai — mo lai la ve 0 */
    page: number;
  } | null;
}

const STATUS_BADGE: Record<TournamentStatus, { text: string; className: string }> = {
  draft: { text: 'Chưa mở', className: 'bg-slate-100 text-slate-600' },
  open: { text: 'Đang mở', className: 'bg-emerald-50 text-emerald-700' },
  closed: { text: 'Đã đóng', className: 'bg-red-50 text-red-700' },
  deleted: { text: 'ĐÃ XOÁ', className: 'bg-slate-800 text-white' },
};

/**
 * Trang `/quan-tri` — ban dieu khien that su cua admin.
 *
 * **Vi sao trang nay lam duoc nhieu the:** menh de
 * `root.child('appAdmin/'+auth.uid).val() === true` da nam san trong moi rule
 * cua chu giai (xem `database.rules.json`). Admin von ghi duoc het; tu truoc
 * den nay chi la khong co cho de bam. Moi thu o day deu di qua dung nhung
 * service ma chu giai dung, khong co duong ghi tat nao rieng cho admin.
 *
 * **Hai gioi han cung, khong code vong qua duoc:**
 *  1. Khong khoa / khong xoa duoc tai khoan Google — viec do can Admin SDK, ma
 *     app khong co server. Cat het quyen trong app thi lam duoc ("Gỡ khỏi mọi
 *     giải"), dong cua Google thi khong.
 *  2. `tournament` la mang theo index, nen "xoa giai" mac dinh la xoa MEM.
 *     Xoa han chi lam duoc voi giai cuoi mang — xem `deleteTournament`.
 *
 * Va mot gioi han doc: `codeSession/{uid}` chi chinh chu doc duoc, nen khong co
 * bang "ai dang giu ma nao" o cap he thong. Muon biet thi mo bang ma cua giai.
 */
class AdminContainer extends Component<AdminContainerProps, AdminContainerState> {
  unsubStaff: (() => void) | null = null;
  unsubAdmin: (() => void) | null = null;
  /** Da tai du lieu cho lan duoc cap quyen nay chua — chan tai lai hai lan */
  loaded = false;

  state: AdminContainerState = {
    checking: true,
    allowed: false,
    overview: null,
    busy: false,
    tab: 'tournaments',
    query: '',
    statusFilter: 'all',
    page: 0,
    expanded: null,
    staff: [],
    expandedUser: null,
    confirm: null,
    transfer: null,
    rename: null,
    assign: null,
  };

  constructor(props: AdminContainerProps) {
    super(props);
    document.title = 'Quản trị - Cóc Vương';
  }

  /**
   * NGHE quyen admin chu khong doc mot lan.
   *
   * Bat buoc, vi hai viec chay song song: `AuthGate` ghi `appAdmin/{uid}` cho
   * email duoc ghi cung (`ensureBootstrapAdmin`) trong khi trang nay dang hoi
   * "toi co phai admin khong". Doc mot lan thi lan vao dau tien luon thua cuoc
   * dua do — man khoa hien ra roi khong co gi hoi lai, va nguoi dung phai tu
   * tai lai trang de chua ho mot loi ho khong nhin thay.
   *
   * Nghe thi con dung ca luc bi GO quyen giua chung: man hinh tu dong ve.
   */
  componentDidMount() {
    this.unsubAdmin = subscribeIsAdmin(this.props.user.uid, (allowed) => {
      this.setState({ allowed, checking: false });

      if (!allowed) {
        this.loaded = false;
        return;
      }
      if (!this.loaded) {
        this.loaded = true;
        void this.reload();
      }
    });
  }

  componentWillUnmount() {
    this.unsubAdmin?.();
    this.unsubStaff?.();
  }

  async reload() {
    this.setState({ busy: true });
    try {
      const overview = await loadAdminOverview(this.props.user.uid);
      this.setState({ overview });
    } catch {
      toast.error('Không đọc được dữ liệu quản trị.');
    } finally {
      this.setState({ busy: false });
    }
  }

  // ==================== Chon giai / nguoi ====================

  get tournaments(): AdminTournamentRow[] {
    return this.state.overview?.tournaments || [];
  }

  get users(): AdminUserRow[] {
    return this.state.overview?.users || [];
  }

  /**
   * Mo mot giai ra. Nhan su nghe REALTIME chu khong doc mot lan: bang duyet don
   * ben trong cung ghi vao node do, nen doc mot lan la hai bang lech nhau ngay
   * sau cai bam dau tien.
   */
  toggleExpand = (index: TournamentId) => {
    this.unsubStaff?.();
    this.unsubStaff = null;

    if (this.state.expanded === index) {
      this.setState({ expanded: null, staff: [] });
      return;
    }

    this.setState({ expanded: index, staff: [] });
    this.unsubStaff = subscribeStaff(index, (staff) => this.setState({ staff }));
  };

  openTournamentTab = (index: TournamentId) => {
    this.setState({ tab: 'tournaments', query: '', statusFilter: 'all', page: 0 }, () => {
      // Bang giai di theo trang: giai duoc mo ra co the nam o trang 3, mo ma
      // khong nhay trang thi bam vao chi thay bang giai khong doi gi
      const at = this.visibleTournaments().findIndex((t) => t.id === index);
      if (at >= 0) this.setState({ page: pageOf(at, TOURNAMENT_PAGE_SIZE) });
      if (this.state.expanded !== index) this.toggleExpand(index);
    });
  };

  askConfirm = (spec: ConfirmSpec) => this.setState({ confirm: spec });

  runConfirm = () => {
    const { confirm } = this.state;
    this.setState({ confirm: null }, () => void confirm?.action());
  };

  // ==================== Hanh dong tren giai ====================

  guard = async (work: () => Promise<void>, ok: string, fail: string) => {
    this.setState({ busy: true });
    try {
      await work();
      await this.reload();
      toast.success(ok);
    } catch {
      this.setState({ busy: false });
      toast.error(fail);
    }
  };

  handleOpen = (row: AdminTournamentRow) =>
    this.guard(
      () => (row.status === 'closed' ? reopenTournament(row.id) : openTournament(row.id)),
      'Đã mở giải.',
      'Không mở được giải này.'
    );

  handleClose = (row: AdminTournamentRow) =>
    this.askConfirm({
      title: 'Đóng giải',
      message: 'Toàn bộ mã giám định của giải bị thu hồi ngay, và 2 số của giải được trả về kho.',
      label: 'Đóng giải',
      action: () =>
        this.guard(() => closeTournament(row.id).then(() => undefined),
          'Đã đóng giải và thu hồi mã.', 'Không đóng được giải này.'),
    });

  handleToggleOpenAccess = (row: AdminTournamentRow) => {
    const turningOn = !row.openAccess;
    const apply = () =>
      this.guard(() => setOpenAccess(row.id, turningOn),
        turningOn ? 'Đã bật mở tự do.' : 'Đã tắt mở tự do.',
        'Không đổi được.');

    if (!turningOn) {
      void apply();
      return;
    }
    this.askConfirm({
      title: 'Bật “Mở tự do”',
      message: 'Bỏ hẳn bước duyệt: bất kỳ ai đăng nhập cũng vào giám sát và ghi điểm giải này được. Chỉ nên bật khi đang kẹt giữa giải.',
      label: 'Bật',
      tone: 'primary',
      action: apply,
    });
  };

  handleRename = () => {
    const { rename } = this.state;
    if (!rename) return;
    const value = rename.value.trim();
    if (!value) {
      toast.error('Tên giải không được để trống.');
      return;
    }
    this.setState({ rename: null });
    void this.guard(() => renameTournament(rename.id, value),
      'Đã đổi tên giải.', 'Không đổi được tên giải.');
  };

  /** Cuu khi chu giai nghi, mat tai khoan, hoac tao nham bang tai khoan khac */
  handleTransfer = (target: PickableUser) => {
    const row = this.state.transfer;
    if (!row) return;
    this.setState({ transfer: null });

    this.askConfirm({
      title: 'Đổi chủ giải',
      message: (
        <>
          <strong>{row.name.replace(/\n/g, ' ')}</strong> sẽ chuyển sang{' '}
          <strong>{target.name || target.email}</strong>. Chủ cũ mất toàn quyền ngay lập tức.
        </>
      ),
      label: 'Đổi chủ giải',
      action: () =>
        this.guard(
          () => transferOwnership(row.id, { uid: target.uid, email: target.email || '' }),
          'Đã đổi chủ giải.',
          'Không đổi được chủ giải.'
        ),
    });
  };

  handleClaim = (row: AdminTournamentRow) =>
    this.askConfirm({
      title: 'Nhận giải về tài khoản này',
      message: `Giải "${row.name.replace(/\n/g, ' ')}" chưa có chủ nên hiện ai đăng nhập cũng ghi được. Nhận về sẽ khoá lại cho ${this.props.user.email}.`,
      label: 'Nhận về',
      tone: 'primary',
      action: () =>
        this.guard(() => transferOwnership(row.id, this.props.user),
          'Đã nhận giải về tài khoản của bạn.', 'Không nhận được giải này.'),
    });

  handleDelete = (row: AdminTournamentRow) =>
    this.askConfirm({
      title: 'Xoá giải',
      message: (
        <>
          <strong>{row.name.replace(/\n/g, ' ')}</strong> sẽ biến khỏi mọi danh sách — trang công khai,
          bảng chọn giải của giám sát, và trang Thiết đặt. Toàn bộ mã giám định bị thu hồi và 2 số của
          giải được trả về kho.
          <br /><br />
          Dữ liệu vẫn còn trong DB và <strong>khôi phục lại được</strong> từ chính trang này.
        </>
      ),
      label: 'Xoá giải',
      action: () =>
        this.guard(() => deleteTournament(row.id).then(() => undefined),
          'Đã xoá giải và thu hồi mã.', 'Không xoá được giải này.'),
    });

  handleRestore = (row: AdminTournamentRow) =>
    this.askConfirm({
      title: 'Khôi phục giải',
      message: 'Giải quay lại ở trạng thái ĐÃ ĐÓNG. Mã đã bị thu hồi lúc xoá, nên muốn chấm tiếp thì bấm “Mở lại” rồi cấp mã mới.',
      label: 'Khôi phục',
      tone: 'primary',
      action: () =>
        this.guard(() => restoreTournament(row.id), 'Đã khôi phục giải.', 'Không khôi phục được.'),
    });

  handlePurge = (row: AdminTournamentRow) =>
    this.askConfirm({
      title: 'Xoá vĩnh viễn',
      message: (
        <>
          <strong>{row.name.replace(/\n/g, ' ')}</strong> cùng toàn bộ danh sách VĐV, lịch thi đấu,
          điểm số, danh sách nhân sự và mã giám định sẽ bị xoá khỏi database.
          <br /><br />
          <strong>Không hoàn tác được.</strong> Không có bản sao lưu nào trong app.
        </>
      ),
      label: 'Xoá vĩnh viễn',
      action: () =>
        this.guard(async () => {
          await purgeTournament(row.id);
          this.unsubStaff?.();
          this.unsubStaff = null;
          this.setState({ expanded: null, staff: [] });
        }, 'Đã xoá vĩnh viễn.', 'Không xoá được giải này.'),
    });

  // ==================== Hanh dong tren nguoi dung ====================

  handleAssign = async () => {
    const { assign } = this.state;
    if (!assign || assign.id === null) return;
    const picks = assignedKeys(assign.draft);
    if (!picks.length) {
      toast.error('Chọn ít nhất một sân.');
      return;
    }

    const index = assign.id;
    const target = assign.user;
    this.setState({ assign: null });
    await this.guard(
      () =>
        grantStaff(
          index,
          { uid: target.uid, email: target.email, name: target.name, photo: target.photo },
          assign.draft,
          this.props.user.uid
        ),
      `Đã cho ${target.name || target.email} trực ${picks.map(arenaKeyLabel).join(', ')}.`,
      'Không chỉ định được.'
    );
  };

  handleRevokeEverywhere = (u: AdminUserRow) =>
    this.askConfirm({
      title: 'Gỡ khỏi mọi giải',
      message: (
        <>
          <strong>{u.name || u.email}</strong> mất quyền chấm trên {u.duties.length} giải ngay lập tức.
          Máy của họ đang mở sẽ hiện “Quyền đã bị thu hồi”.
          <br /><br />
          Việc này <strong>không khoá tài khoản Google</strong> của họ — app không có server nên không
          làm được điều đó. Họ vẫn đăng nhập được, chỉ là không còn sân nào để vào.
        </>
      ),
      label: 'Gỡ hết',
      action: () =>
        this.guard(
          () => revokeEverywhere(u.uid, u.duties.map((d) => d.id)).then(() => undefined),
          'Đã gỡ khỏi mọi giải.',
          'Không gỡ được.'
        ),
    });

  // ==================== Bang giai dau ====================

  visibleTournaments(): AdminTournamentRow[] {
    const { query, statusFilter } = this.state;
    const needle = query.trim().toLowerCase();

    return this.tournaments.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (statusFilter === 'all' && t.status === 'deleted') return false;
      if (!needle) return true;
      return (
        t.name.toLowerCase().includes(needle) ||
        String(t.id).includes(needle) ||
        t.ownerName?.toLowerCase().includes(needle) ||
        t.ownerEmail?.toLowerCase().includes(needle)
      );
    });
  }

  renderTournamentRow(row: AdminTournamentRow) {
    const { expanded, staff, busy } = this.state;
    const open = expanded === row.id;
    const badge = STATUS_BADGE[row.status];
    const removed = row.status === 'deleted';
    // `canPurge` chi cho chu giai va giai cu chua co chu; trang nay chi ve
    // duoc khi `allowed` (la admin) ma rules cho admin ghi moi giai — nen o day
    // dieu kien duy nhat con lai la "khong phai ban cham nhanh".
    const purgeable = canPurge(row, this.props.user.uid) || (this.state.allowed && !row.demo);

    return (
      <div key={row.id}
        className={`border rounded-card overflow-hidden ${removed ? 'border-slate-300 bg-slate-50' : 'border-slate-200'}`}>
        <div className={`p-3.5 ${removed ? 'bg-slate-50' : 'bg-white'}`}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className={`m-0 font-semibold whitespace-pre-line
                ${removed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                {row.name}
              </p>
              <p className="m-0 mt-1 text-xs text-slate-500 truncate">
                {row.ownerUid
                  ? `Chủ giải: ${row.ownerName || row.ownerEmail || row.ownerUid}`
                  : 'Chưa có chủ — ai đăng nhập cũng ghi được'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.text}
                </span>
                {formatEventDate(row.eventDate) && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full
                    bg-sky-100 text-sky-800">
                    <i className="fa-solid fa-calendar-days mr-1" aria-hidden="true" />
                    {formatEventDate(row.eventDate)}
                  </span>
                )}
                {row.demo && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
                    CHẤM NHANH
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
                {row.pendingCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {row.pendingCount} đơn chờ
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Button size="sm" variant="ghost"
              icon={open ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'}
              onClick={() => this.toggleExpand(row.id)}>
              {open ? 'Thu gọn' : 'Nhân sự & mã'}
            </Button>

            {removed ? (
              <>
                <Button size="sm" variant="ghost" icon="fa-solid fa-rotate-left"
                  disabled={busy} onClick={() => this.handleRestore(row)}>
                  Khôi phục
                </Button>
                {purgeable && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50"
                    icon="fa-solid fa-trash" disabled={busy} onClick={() => this.handlePurge(row)}>
                    Xoá vĩnh viễn
                  </Button>
                )}
              </>
            ) : (
              <>
                {row.status !== 'open' && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => this.handleOpen(row)}>
                    {row.status === 'closed' ? 'Mở lại' : 'Mở giải'}
                  </Button>
                )}
                {row.status === 'open' && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => this.handleClose(row)}>
                    Đóng giải
                  </Button>
                )}

                <Button size="sm" variant="ghost" icon="fa-solid fa-pen"
                  onClick={() => this.setState({ rename: { id: row.id, value: row.name } })}>
                  Đổi tên
                </Button>

                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => this.handleToggleOpenAccess(row)}>
                  {row.openAccess ? 'Tắt mở tự do' : 'Bật mở tự do'}
                </Button>

                {/* Ban cham nhanh la ban rieng cua mot tai khoan — khong sang tay */}
                {row.demo ? (
                  <span className="text-[11px] text-slate-400 self-center">
                    bàn chấm nhanh riêng — không đổi chủ, không xoá
                  </span>
                ) : (
                  <>
                    {row.ownerUid ? (
                      <Button size="sm" variant="ghost" onClick={() => this.setState({ transfer: row })}>
                        Đổi chủ giải
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => this.handleClaim(row)}>
                        Nhận về tài khoản tôi
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50"
                      icon="fa-solid fa-trash" disabled={busy} onClick={() => this.handleDelete(row)}>
                      Xoá
                    </Button>
                  </>
                )}

                <NavLink to={`/thiet-dat?giai=${row.id}`}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 min-h-[36px]
                    rounded-lg text-accent-700 hover:bg-accent-50 font-medium">
                  <i className="fa-solid fa-gear" aria-hidden="true" />
                  Thiết đặt
                </NavLink>
              </>
            )}
          </div>
        </div>

        {open && this.renderTournamentDetail(row, staff)}
      </div>
    );
  }

  renderTournamentDetail(row: AdminTournamentRow, staff: StaffMember[]) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 p-3.5 space-y-5">
        {!row.demo && row.status !== 'deleted' && (
          <div>
            <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Chấm hộ giải này
            </p>
            <div className="flex flex-wrap gap-1.5">
              <NavLink to={`/giam-sat-doi-khang?giai=${row.id}`}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 min-h-[36px]
                  rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                <i className="fa-solid fa-hand-fist" aria-hidden="true" />
                Giám sát đối kháng
              </NavLink>
              <NavLink to={`/giam-sat-thi-quyen?giai=${row.id}`}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 min-h-[36px]
                  rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                <i className="fa-solid fa-person-walking" aria-hidden="true" />
                Giám sát thi quyền
              </NavLink>
            </div>
            <p className="m-0 mt-1.5 text-[11px] text-slate-400">
              Admin vào thẳng, không phải xin quyền — dùng khi phải thay người ngay giữa trận.
            </p>
          </div>
        )}

        <div>
          <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Đơn xin quyền &amp; nhân sự
          </p>
          <div className="bg-white border border-slate-200 rounded-card p-3.5">
            <StaffApprovalPanel
              tournamentIndex={row.id}
              approvedBy={this.props.user.uid}
              tournamentStatus={row.status}
            />
          </div>
        </div>

        {row.status !== 'deleted' && (
          <div>
            <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Chỉ định người chấm
            </p>
            <AssignStaffPanel
              tournamentIndex={row.id}
              users={this.users}
              staff={staff}
              approvedBy={this.props.user.uid}
              onChanged={() => void this.reload()}
            />
          </div>
        )}

        <div>
          <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Bảng mã giám định
          </p>
          <CodeBoard
            tournamentIndex={row.id}
            tournamentName={row.name}
            canManage
            compact
          />
        </div>
      </div>
    );
  }

  // ==================== Bang nguoi dung ====================

  visibleUsers(): AdminUserRow[] {
    const needle = this.state.query.trim().toLowerCase();
    const list = this.users
      .slice()
      .sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
    if (!needle) return list;
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(needle) ||
        u.email?.toLowerCase().includes(needle) ||
        u.uid.toLowerCase().includes(needle)
    );
  }

  renderUserRow(u: AdminUserRow) {
    const open = this.state.expandedUser === u.uid;

    return (
      <div key={u.uid} className="border border-slate-200 rounded-card overflow-hidden">
        <button
          type="button"
          onClick={() => this.setState({ expandedUser: open ? null : u.uid })}
          className="w-full text-left p-3.5 bg-white hover:bg-slate-50 transition-colors
            flex items-center gap-3"
        >
          {u.photo ? (
            <img src={u.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center
              text-slate-500 font-bold flex-shrink-0">
              {(u.name || u.email || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-slate-800 truncate">
              {u.name || '(chưa có tên)'}
            </span>
            <span className="block text-xs text-slate-500 truncate">{u.email}</span>
            <span className="flex flex-wrap gap-1.5 mt-1.5">
              {u.isViewer && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-600 text-white">
                  BẠN
                </span>
              )}
              {u.owns.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  chủ {u.owns.length} giải
                </span>
              )}
              {u.duties.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  trực {u.duties.length} giải
                </span>
              )}
              {u.pending.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {u.pending.length} đơn chờ
                </span>
              )}
            </span>
          </span>
          <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-300 flex-shrink-0`}
            aria-hidden="true" />
        </button>

        {open && (
          <div className="border-t border-slate-200 bg-slate-50 p-3.5 space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="m-0 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Đăng nhập lần cuối
                </p>
                <p className="m-0 text-sm text-slate-700">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="m-0 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Mã tài khoản
                </p>
                <code className="block text-[11px] text-slate-500 break-all bg-white border
                  border-slate-200 rounded px-2 py-1">{u.uid}</code>
              </div>
            </div>

            <div>
              <p className="m-0 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Đang trực ({u.duties.length})
              </p>
              {u.duties.length === 0 ? (
                <p className="m-0 text-sm text-slate-400 italic">Không trực sân nào.</p>
              ) : (
                <div className="space-y-1">
                  {u.duties.map((d) => (
                    <button key={d.id} type="button" onClick={() => this.openTournamentTab(d.id)}
                      className="w-full text-left bg-white border border-slate-200 rounded-control
                        px-3 py-2 hover:border-accent-400 transition-colors">
                      <span className="block text-sm text-slate-800 truncate">
                        {d.name.replace(/\n/g, ' ')}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {d.arenas.map(arenaKeyLabel).join(' · ') || 'chưa có sân — vào app sẽ kẹt'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {u.owns.length > 0 && (
              <div>
                <p className="m-0 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Làm chủ giải ({u.owns.length})
                </p>
                <div className="space-y-1">
                  {u.owns.map((o) => (
                    <button key={o.id} type="button" onClick={() => this.openTournamentTab(o.id)}
                      className="w-full text-left bg-white border border-slate-200 rounded-control
                        px-3 py-2 hover:border-accent-400 transition-colors flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-sm text-slate-800 truncate">
                        {o.name.replace(/\n/g, ' ')}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0
                        ${STATUS_BADGE[o.status].className}`}>
                        {STATUS_BADGE[o.status].text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {u.pending.length > 0 && (
              <div>
                <p className="m-0 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Đơn đang chờ duyệt
                </p>
                <div className="space-y-1">
                  {u.pending.map((p) => (
                    <button key={p.id} type="button" onClick={() => this.openTournamentTab(p.id)}
                      className="w-full text-left bg-white border border-red-200 rounded-control
                        px-3 py-2 text-sm text-slate-800 hover:bg-red-50 transition-colors truncate">
                      {p.name.replace(/\n/g, ' ')}
                      <span className="text-xs text-red-600 ml-1.5">→ duyệt hộ</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" variant="success" icon="fa-solid fa-user-plus"
                onClick={() => this.setState({ assign: { user: u, id: null, draft: allArenas(), page: 0 } })}>
                Chỉ định vào một giải
              </Button>
              {u.duties.length > 0 && (
                <Button size="sm" variant="ghost" icon="fa-solid fa-user-slash"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => this.handleRevokeEverywhere(u)}>
                  Gỡ khỏi mọi giải
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== Hop thoai ====================

  renderTransferModal() {
    const { transfer } = this.state;
    if (!transfer) return null;

    return (
      <Modal
        isOpen
        title="Đổi chủ giải"
        icon="fa-solid fa-user-gear"
        size="md"
        onClose={() => this.setState({ transfer: null })}
      >
        <p className="m-0 mb-3 text-sm text-slate-600 leading-relaxed">
          Chọn chủ mới cho <strong>{transfer.name.replace(/\n/g, ' ')}</strong>.
          Chủ cũ mất toàn quyền ngay khi bạn xác nhận.
        </p>
        <UserPicker
          users={this.users}
          excludeUids={transfer.ownerUid ? [transfer.ownerUid] : []}
          onPick={this.handleTransfer}
        />
      </Modal>
    );
  }

  renderRenameModal() {
    const { rename } = this.state;
    if (!rename) return null;

    return (
      <Modal
        isOpen
        title="Đổi tên giải"
        icon="fa-solid fa-pen"
        size="md"
        onClose={() => this.setState({ rename: null })}
        footer={
          <>
            <Button variant="secondary" block onClick={() => this.setState({ rename: null })}>Huỷ</Button>
            <Button variant="primary" block icon="fa-solid fa-check" onClick={this.handleRename}>Lưu</Button>
          </>
        }
      >
        <textarea
          value={rename.value}
          rows={3}
          onChange={(e) => this.setState({ rename: { ...rename, value: e.target.value } })}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-control text-sm
            focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        />
        <p className="m-0 mt-2 text-xs text-slate-500">
          Xuống dòng được — màn hình công khai hiển thị đúng như bạn gõ. Đổi tên xong chỉ mục công khai
          tự chạy theo.
        </p>
      </Modal>
    );
  }

  renderAssignModal() {
    const { assign } = this.state;
    if (!assign) return null;

    const choices = this.tournaments.filter((t) => t.status !== 'deleted' && !t.demo);
    const already = new Set(assign.user.duties.map((d) => d.id));
    // Hop thoai chi cao co han: cuon mot khung 14rem qua ca tram giai la cach
    // chac chan nhat de chi dinh nham nguoi vao nham giai
    const paged = paginate(choices, assign.page, ASSIGN_PAGE_SIZE);

    return (
      <Modal
        isOpen
        title={`Chỉ định ${assign.user.name || assign.user.email}`}
        icon="fa-solid fa-user-plus"
        size="md"
        onClose={() => this.setState({ assign: null })}
        footer={
          <>
            <Button variant="secondary" block onClick={() => this.setState({ assign: null })}>Huỷ</Button>
            <Button variant="success" block icon="fa-solid fa-check"
              disabled={assign.id === null} onClick={this.handleAssign}>
              Chỉ định
            </Button>
          </>
        }
      >
        <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Giải</p>
        {choices.length === 0 ? (
          <p className="m-0 text-sm text-slate-400 italic">Chưa có giải nào để chỉ định.</p>
        ) : (
          <div className="mb-4">
            <div className="space-y-1">
              {paged.items.map((t) => {
                const on = assign.id === t.id;
                return (
                  <button key={t.id} type="button"
                    onClick={() => this.setState({ assign: { ...assign, id: t.id } })}
                    className={`w-full text-left px-2.5 py-2 rounded-control border transition-colors
                      ${on ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className="block text-sm text-slate-800 truncate">
                      {t.name.replace(/\n/g, ' ')}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {STATUS_BADGE[t.status].text}
                      {already.has(t.id) && ' · đang trực giải này'}
                    </span>
                  </button>
                );
              })}
            </div>

            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              from={paged.from}
              to={paged.to}
              total={paged.total}
              onPage={(p) => this.setState({ assign: { ...assign, page: p } })}
              unit="giải"
            />
          </div>
        )}

        <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sân</p>
        <ArenaTicks
          value={assign.draft}
          onToggle={(k: ArenaAssignmentKey) =>
            this.setState({ assign: { ...assign, draft: { ...assign.draft, [k]: !assign.draft[k] } } })
          }
        />
      </Modal>
    );
  }

  // ==================== Khung trang ====================

  renderTabs() {
    const { tab, overview } = this.state;
    const pending = (overview?.tournaments || []).reduce((n, t) => n + t.pendingCount, 0);

    const item = (key: Tab, icon: string, label: string, badge?: number) => (
      <button
        type="button"
        onClick={() => this.setState({ tab: key, query: '', page: 0 })}
        className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-control
          border transition-colors
          ${tab === key
            ? 'border-accent-500 bg-accent-50 text-accent-700'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
      >
        <i className={icon} aria-hidden="true" />
        {label}
        {badge ? (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
            rounded-full bg-red-500 text-white text-[11px] font-bold">{badge}</span>
        ) : null}
      </button>
    );

    return (
      <div className="flex flex-wrap gap-1.5">
        {item('tournaments', 'fa-solid fa-trophy', 'Giải đấu')}
        {item('users', 'fa-solid fa-users', 'Người dùng')}
        {item('audit', 'fa-solid fa-stethoscope', 'Chẩn đoán', pending)}
      </div>
    );
  }

  renderSearch(placeholder: string) {
    return (
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
          text-slate-300 text-sm" aria-hidden="true" />
        <input
          value={this.state.query}
          onChange={(e) => this.setState({ query: e.target.value, page: 0 })}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-control bg-white
            focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        />
      </div>
    );
  }

  renderTournamentsTab() {
    const { statusFilter, busy, page } = this.state;
    const rows = this.visibleTournaments();
    const paged = paginate(rows, page, TOURNAMENT_PAGE_SIZE);
    const deletedCount = this.tournaments.filter((t) => t.status === 'deleted').length;

    const filters: { key: StatusFilter; label: string }[] = [
      { key: 'all', label: 'Đang dùng' },
      { key: 'open', label: 'Đang mở' },
      { key: 'draft', label: 'Chưa mở' },
      { key: 'closed', label: 'Đã đóng' },
      { key: 'deleted', label: `Đã xoá${deletedCount ? ` (${deletedCount})` : ''}` },
    ];

    return (
      <SectionCard
        title={`Giải đấu (${rows.length})`}
        icon="fa-solid fa-trophy"
        action={
          <Button size="sm" variant="ghost" icon="fa-solid fa-rotate"
            className="text-white hover:bg-white/15" disabled={busy} onClick={() => this.reload()}>
            Tải lại
          </Button>
        }
      >
        <div className="space-y-3">
          {this.renderSearch('Tìm theo tên giải, số thứ tự, hoặc chủ giải…')}

          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button key={f.key} type="button"
                onClick={() => this.setState({ statusFilter: f.key, page: 0 })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors
                  ${statusFilter === f.key
                    ? 'border-accent-500 bg-accent-50 text-accent-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-folder-open" title="Không có giải nào khớp" />
          ) : (
            <>
              <div className="space-y-2.5">
                {paged.items.map((row) => this.renderTournamentRow(row))}
              </div>
              <Pagination
                page={paged.page}
                pageCount={paged.pageCount}
                from={paged.from}
                to={paged.to}
                total={paged.total}
                onPage={(p) => this.setState({ page: p })}
                unit="giải"
              />
            </>
          )}
        </div>
      </SectionCard>
    );
  }

  renderUsersTab() {
    const { busy } = this.state;
    const rows = this.visibleUsers();

    return (
      <SectionCard
        title={`Người dùng (${rows.length})`}
        icon="fa-solid fa-users"
        tone="neutral"
        action={
          <Button size="sm" variant="ghost" icon="fa-solid fa-rotate"
            className="text-white hover:bg-white/15" disabled={busy} onClick={() => this.reload()}>
            Tải lại
          </Button>
        }
      >
        <div className="space-y-3">
          {this.renderSearch('Tìm theo tên, email hoặc mã tài khoản…')}

          {rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-user-slash"
              title="Không có ai khớp"
              hint="Danh sách chỉ có người đã đăng nhập vào app ít nhất một lần."
            />
          ) : (
            <div className="space-y-2">{rows.map((u) => this.renderUserRow(u))}</div>
          )}

        </div>
      </SectionCard>
    );
  }

  renderAuditTab() {
    return (
      <>
        <SectionCard title="Rà soát hệ thống" icon="fa-solid fa-stethoscope" tone="warning">
          <AuditPanel
            overview={this.state.overview}
            onOpenTournament={this.openTournamentTab}
            onReloaded={() => void this.reload()}
          />
        </SectionCard>

        <SectionCard title="Máy giám định đang mở" icon="fa-solid fa-signal" tone="neutral">
          <OnlineBoard tournaments={this.tournaments} />
        </SectionCard>
      </>
    );
  }

  render() {
    const { user } = this.props;
    const { checking, allowed, tab, confirm } = this.state;

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
              hint="Quyền admin nằm ở nhánh appAdmin của Firebase Database. Không cấp được cho người khác từ trong app — việc đó phải làm trong Firebase Console."
            />
            <p className="text-center text-xs text-slate-400 mt-4">
              Mã tài khoản của bạn:{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">{user.uid}</code>
            </p>
            <p className="text-center text-xs text-slate-400 mt-2">
              Vừa được cấp quyền? Trang này tự mở ra, không phải tải lại.
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
        <PageHeader title="Quản trị" icon="fa-solid fa-shield-halved" action={<AccountChip user={user} />} />

        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          {this.renderTabs()}

          {tab === 'tournaments' && this.renderTournamentsTab()}
          {tab === 'users' && this.renderUsersTab()}
          {tab === 'audit' && this.renderAuditTab()}
        </main>

        <AppFooter />

        <ConfirmModal
          isOpen={confirm !== null}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          confirmLabel={confirm?.label}
          tone={confirm?.tone}
          onConfirm={this.runConfirm}
          onCancel={() => this.setState({ confirm: null })}
        />
        {this.renderTransferModal()}
        {this.renderRenameModal()}
        {this.renderAssignModal()}

        <Toast />
      </PageShell>
    );
  }
}

export default AdminContainer;
