import React, { Component } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import logo from '../../assets/img/logo.png';
import Button from '../ui/Button';
import { AppUser, signOut } from '../../services/authService';
import { ArenaKind, arenaName, kindName } from '../../services/accessCodeService';
import {
  ARENA_KEYS, ArenaAssignmentKey, Assignments, StaffMember,
  allArenas, arenaKeyLabel, assignedKeys, getStaff, requestAccess,
  setLastArena, subscribeMyAccess, subscribeMyRequest, withdrawRequest,
} from '../../services/staffService';
import {
  TournamentSummary, getTournamentSummary, listTournaments, subscribeTournamentSummary,
} from '../../services/tournamentService';
import { ensureMyDemoTournament, topUpDemo } from '../../services/demoService';

export interface SupervisorAccess {
  tournament: TournamentSummary;
  /** 0 = San A, 1 = San B */
  arenaIndex: number;
  arenaKey: ArenaAssignmentKey;
  /** San duoc phan cong cho mon nay — >1 thi hien nut "Doi san" */
  availableArenas: number[];
  isOwner: boolean;
  /** Doi san */
  onChangeArena: () => void;
  /** Ve bang chon giai — loi duy nhat de sang ban cham nhanh va nguoc lai */
  onChangeTournament: () => void;
}

interface RequestAccessPanelProps {
  user: AppUser;
  kind: ArenaKind;
  children: (access: SupervisorAccess) => React.ReactNode;
}

type Phase = 'loading' | 'pick-tournament' | 'request' | 'waiting' | 'pick-arena' | 'ready' | 'revoked';

interface RequestAccessPanelState {
  phase: Phase;
  tournaments: TournamentSummary[];
  /** Giai da la nhan su hoac chu — hien nhom rieng, vao thang duoc */
  myTournaments: Set<number>;
  selected: TournamentSummary | null;
  staff: StaffMember | null;
  want: Assignments;
  note: string;
  arenaIndex: number | null;
  busy: boolean;
  error: string;
}

const ARENA_INDEXES = [0, 1];

/**
 * Cong vao cua giam sat: chon giai -> xin quyen -> cho duyet -> vao thang san.
 *
 * Ba duong tat co y de mo, theo dung thu tu uu tien:
 *  1. **Chu giai luon tu vao duoc, khong can xin quyen.** Day la loi thoat
 *     hiem quan trong nhat khi co che duyet truc trac giua giai.
 *  2. Giai bat `openAccess` — ai dang nhap cung vao.
 *  3. Giai cu chua co chu — van mo nhu truoc de khong lam hong du lieu cu.
 *
 * Duoc duyet roi thi lan sau **vao thang**, khong hoi lai lan nao nua. Nho theo
 * TAI KHOAN chu khong theo may: doi laptop, muon may khac van dung san.
 */
class RequestAccessPanel extends Component<RequestAccessPanelProps, RequestAccessPanelState> {
  unsubStaff: (() => void) | null = null;
  unsubRequest: (() => void) | null = null;
  unsubSummary: (() => void) | null = null;

  state: RequestAccessPanelState = {
    phase: 'loading',
    tournaments: [],
    myTournaments: new Set(),
    selected: null,
    staff: null,
    want: allArenas(),
    note: '',
    arenaIndex: null,
    busy: false,
    error: '',
  };

  componentDidMount() {
    void this.loadTournaments();
  }

  componentWillUnmount() {
    this.detach();
  }

  detach() {
    this.unsubStaff?.();
    this.unsubRequest?.();
    this.unsubSummary?.();
    this.unsubStaff = this.unsubRequest = this.unsubSummary = null;
  }

  /** Ban cham nhanh cua chinh tai khoan nay — ban cua nguoi khac khong tinh. */
  myDemo(): TournamentSummary | null {
    return this.state.tournaments.find((t) => t.demo && t.ownerUid === this.props.user.uid) || null;
  }

  /**
   * Vao ban cham nhanh. Lan dau vao thang San A.
   *
   * Danh sach giai da doc xong tu truoc khi bang chon hien ra, nen duong
   * thuong khong doc them gi ca: vao thang bang dong tom tat dang cam tren tay,
   * con viec vat (ten cu, ma giam dinh thieu) tra ve chay nen. Chi khi CHUA co
   * ban nao moi phai dung — luc do mo cho la dung, vi khong the vao truoc.
   */
  enterDemo = async () => {
    const { user } = this.props;
    const owner = { uid: user.uid, email: user.email };

    const known = this.myDemo();
    if (known) {
      topUpDemo(known.index, owner, known.name);
      this.setState({ arenaIndex: 0, error: '' });
      await this.pick(known);
      return;
    }

    this.setState({ busy: true, error: '' });
    try {
      const index = await ensureMyDemoTournament(owner);
      const summary = await getTournamentSummary(index);
      if (!summary) throw new Error('no summary');
      this.setState({ arenaIndex: 0, busy: false });
      await this.pick(summary);
    } catch {
      this.setState({
        busy: false,
        phase: 'pick-tournament',
        error: 'Chưa mở được bàn chấm nhanh. Kiểm tra kết nối mạng rồi thử lại.',
      });
    }
  };

  async loadTournaments() {
    const { user } = this.props;

    try {
      const all = await listTournaments();
      // Giai da dong khong hien trong bang chon nua
      const usable = all.filter((t) => t.status !== 'closed');

      // Doc quyen truc cua tat ca giai MOT LUOT: xep hang tung giai mot thi
      // bang chon hien ra cham dan theo so giai trong he thong
      const checked = await Promise.all(
        usable.map(async (t) => {
          if (t.demo) return null; // co khoi rieng, khong xep vao nhom nao
          if (t.ownerUid === user.uid) return t.index;
          const staff = await getStaff(t.index, user.uid).catch(() => null);
          return staff ? t.index : null;
        })
      );
      const mine = new Set<number>(checked.filter((i): i is number => i !== null));

      // Dung mot giai dung duoc thi vao thang, khong bat chon
      const candidates = usable.filter((t) => mine.has(t.index));
      if (candidates.length === 1) {
        await this.pick(candidates[0]);
        this.setState({ tournaments: usable, myTournaments: mine });
        return;
      }

      this.setState({ tournaments: usable, myTournaments: mine, phase: 'pick-tournament' });
    } catch (err: any) {
      this.setState({ phase: 'pick-tournament', error: err?.message || 'Không đọc được danh sách giải.' });
    }
  }

  pick = async (t: TournamentSummary) => {
    const { user } = this.props;
    this.detach();
    this.setState({ selected: t, error: '' });

    this.unsubSummary = subscribeTournamentSummary(t.index, (fresh) => {
      if (fresh) this.setState({ selected: fresh });
    });

    // Chu giai / giai mo tu do / giai cu chua co chu: bo han buoc duyet
    const freePass = t.ownerUid === user.uid || t.openAccess || !t.ownerUid;

    this.unsubStaff = subscribeMyAccess(t.index, user.uid, (staff) => {
      const hadAccess = this.state.phase === 'ready' || this.state.phase === 'pick-arena';

      if (!staff && !freePass) {
        if (hadAccess) {
          this.setState({ phase: 'revoked', staff: null });
        } else {
          this.watchRequest(t);
        }
        return;
      }

      this.setState({ staff }, () => this.resolveArena(t, staff, freePass));
    });
  };

  watchRequest(t: TournamentSummary) {
    const { user } = this.props;
    this.unsubRequest?.();
    this.unsubRequest = subscribeMyRequest(t.index, user.uid, (req) => {
      if (!req) {
        this.setState({ phase: 'request' });
      } else if (req.rejectedAt) {
        this.setState({
          phase: 'request',
          error: 'Đơn của bạn đã bị từ chối. Liên hệ chủ giải để được mở lại.',
        });
      } else {
        this.setState({ phase: 'waiting' });
      }
    });
  }

  /**
   * Duoc duyet dung 1 san -> vao thang. Nhieu san -> chon dung mot lan dau,
   * ghi vao `lastArena`, tu lan sau vao thang.
   */
  resolveArena(t: TournamentSummary, staff: StaffMember | null, freePass: boolean) {
    const { kind } = this.props;

    // Ban cham nhanh: khong hoi san lan dau — vao thang San A cho nhanh. Nhung
    // da tu bam "Doi san" sang B thi phai giu, dung keo nguoc ve A.
    if (t.demo) {
      this.setState({ arenaIndex: this.state.arenaIndex ?? 0, phase: 'ready' });
      return;
    }

    const available = freePass && !staff
      ? ARENA_INDEXES
      : ARENA_INDEXES.filter((a) => staff?.assignments?.[`${kind}${a}` as ArenaAssignmentKey] === true);

    const usable = available.length ? available : (freePass ? ARENA_INDEXES : []);

    if (!usable.length) {
      this.setState({ phase: 'request', error: `Bạn chưa được phân công sân nào cho ${kindName(kind).toLowerCase()}.` });
      return;
    }

    if (this.state.arenaIndex !== null && usable.includes(this.state.arenaIndex)) {
      this.setState({ phase: 'ready' });
      return;
    }

    if (usable.length === 1) {
      this.setState({ arenaIndex: usable[0], phase: 'ready' });
      return;
    }

    const last = staff?.lastArena;
    const lastForKind = last && last.startsWith(kind) ? Number(last.slice(kind.length)) : null;
    if (lastForKind !== null && usable.includes(lastForKind)) {
      this.setState({ arenaIndex: lastForKind, phase: 'ready' });
      return;
    }

    this.setState({ phase: 'pick-arena' });
  }

  chooseArena = async (a: number) => {
    const { user, kind } = this.props;
    const { selected } = this.state;
    this.setState({ arenaIndex: a, phase: 'ready' });
    if (selected) {
      // Nho theo tai khoan -> doi may van vao dung san
      await setLastArena(selected.index, user.uid, `${kind}${a}` as ArenaAssignmentKey).catch(
        () => undefined
      );
    }
  };

  submitRequest = async () => {
    const { user } = this.props;
    const { selected, want, note } = this.state;
    if (!selected) return;

    if (!assignedKeys(want).length) {
      toast.error('Chọn ít nhất một sân muốn trực.');
      return;
    }

    this.setState({ busy: true, error: '' });
    try {
      await requestAccess(selected.index, user, want, note);
      this.setState({ phase: 'waiting' });
      this.watchRequest(selected);
    } catch (err: any) {
      this.setState({
        error:
          selected.status !== 'open'
            ? 'Giải này chưa mở nên chưa nhận đơn. Nhờ chủ giải bấm “Mở giải”.'
            : 'Không gửi được đơn. Thử lại giúp.',
      });
    } finally {
      this.setState({ busy: false });
    }
  };

  cancelRequest = async () => {
    const { selected } = this.state;
    if (!selected) return;
    await withdrawRequest(selected.index, this.props.user.uid).catch(() => undefined);
    this.setState({ phase: 'request' });
  };

  backToList = () => {
    this.detach();
    this.setState({ selected: null, staff: null, arenaIndex: null, phase: 'pick-tournament', error: '' });
    void this.loadTournaments();
  };

  changeArena = () => {
    this.setState({ arenaIndex: null, phase: 'pick-arena' });
  };

  // ==================== Khung chung ====================

  shell(title: string, subtitle: string, body: React.ReactNode) {
    const { user } = this.props;
    return (
      <div data-accent="brand" className="min-h-screen flex flex-col items-center justify-center
        p-4 select-text bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <div className="inline-flex bg-white p-3 rounded-card shadow-card mb-4">
              <img src={logo} alt="Cóc Vương" className="h-11 w-auto" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">{title}</h1>
            <p className="text-sm text-slate-500 m-0">{subtitle}</p>
          </div>

          <div className="bg-white rounded-card shadow-card border border-slate-100 p-5">{body}</div>

          <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
            <span className="truncate">
              <i className="fa-solid fa-user mr-1.5" aria-hidden="true" />
              {user.email || 'Phiên ẩn danh'}
            </span>
            <button type="button" onClick={() => signOut().then(() => window.location.reload())}
              className="text-red-600 hover:underline font-medium flex-shrink-0 ml-3">
              Đăng xuất
            </button>
          </div>

          <p className="text-center mt-4 mb-0">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">Về trang chủ</Link>
          </p>
        </div>
      </div>
    );
  }

  renderError() {
    const { error } = this.state;
    if (!error) return null;
    return (
      <p role="alert" className="m-0 mb-4 text-sm text-red-700 bg-red-50 border border-red-200
        rounded-control px-3 py-2.5">
        <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
        {error}
      </p>
    );
  }

  render() {
    const { kind, user, children } = this.props;
    const { phase, tournaments, myTournaments, selected, staff, want, note, arenaIndex, busy } = this.state;

    if (phase === 'loading') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3
          bg-slate-50 text-slate-500">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl text-accent-600" aria-hidden="true" />
          <p className="m-0 text-sm">Đang đọc danh sách giải…</p>
        </div>
      );
    }

    if (phase === 'ready' && selected && arenaIndex !== null) {
      const available = ARENA_INDEXES.filter(
        (a) => staff?.assignments?.[`${kind}${a}` as ArenaAssignmentKey] === true
      );
      return (
        <>
          {children({
            tournament: selected,
            arenaIndex,
            arenaKey: `${kind}${arenaIndex}` as ArenaAssignmentKey,
            availableArenas: available.length ? available : ARENA_INDEXES,
            isOwner: selected.ownerUid === user.uid,
            onChangeArena: this.changeArena,
            onChangeTournament: this.backToList,
          })}
        </>
      );
    }

    if (phase === 'revoked') {
      return this.shell(
        'Quyền đã bị thu hồi',
        selected?.name.replace(/\n/g, ' ') || '',
        <>
          <p className="m-0 mb-4 text-sm text-slate-600 leading-relaxed">
            Chủ giải vừa thu hồi quyền giám sát của bạn trên giải này. Mọi thao tác chấm điểm
            từ máy này sẽ bị từ chối.
          </p>
          <Button variant="secondary" block onClick={this.backToList} icon="fa-solid fa-arrow-left">
            Về danh sách giải
          </Button>
        </>
      );
    }

    if (phase === 'waiting' && selected) {
      return this.shell(
        'Đang chờ duyệt…',
        selected.name.replace(/\n/g, ' '),
        <>
          <div className="flex items-center gap-3 mb-4">
            <i className="fa-solid fa-circle-notch fa-spin text-accent-600 text-xl" aria-hidden="true" />
            <p className="m-0 text-sm text-slate-600">
              Đã gửi cho chủ giải{selected.ownerEmail ? ` (${selected.ownerEmail})` : ''}.
              Được duyệt là màn hình tự vào thẳng, không phải tải lại trang.
            </p>
          </div>
          <p className="m-0 mb-4 text-xs text-slate-500 bg-slate-50 border border-slate-200
            rounded-control px-3 py-2.5 leading-relaxed">
            Chủ giải phải đang mở app mới thấy đơn — app không gửi được thông báo đẩy.
            Đang gấp thì gọi trực tiếp cho chủ giải.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={this.cancelRequest}>Rút đơn</Button>
            <Button variant="ghost" block onClick={this.backToList}>Chọn giải khác</Button>
          </div>
        </>
      );
    }

    if (phase === 'pick-arena' && selected) {
      const available = ARENA_INDEXES.filter(
        (a) => staff?.assignments?.[`${kind}${a}` as ArenaAssignmentKey] === true
      );
      const usable = available.length ? available : ARENA_INDEXES;

      return this.shell(
        'Chọn sân bạn trực',
        selected.name.replace(/\n/g, ' '),
        <>
          <p className="m-0 mb-4 text-sm text-slate-500">
            Chỉ hỏi lần này thôi — lần sau mở app là vào thẳng sân bạn chọn.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {usable.map((a) => {
              const busyBy = staff?.lastArena === `${kind}${a}`;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => this.chooseArena(a)}
                  className="p-5 border-2 border-slate-200 rounded-card hover:border-accent-500
                    hover:bg-accent-50 transition-colors text-center"
                >
                  <i className="fa-solid fa-chess-board text-2xl text-accent-600 mb-2 block"
                    aria-hidden="true" />
                  <span className="block font-bold text-slate-800">{arenaName(a)}</span>
                  {busyBy && <span className="block text-[11px] text-slate-400 mt-1">lần trước bạn trực sân này</span>}
                </button>
              );
            })}
          </div>
          <p className="m-0 mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200
            rounded-control px-3 py-2.5">
            <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
            Hai giám sát cùng một sân dễ ghi đè điểm của nhau — hỏi lại người bên cạnh trước khi chọn.
          </p>
          <Button variant="ghost" block onClick={this.backToList} icon="fa-solid fa-arrow-left"
            className="mt-3">
            Chọn giải khác
          </Button>
        </>
      );
    }

    if (phase === 'request' && selected) {
      return this.shell(
        'Xin quyền giám sát',
        selected.name.replace(/\n/g, ' '),
        <>
          {this.renderError()}

          <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Muốn trực sân
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {ARENA_KEYS.map((key) => (
              <label key={key}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-control border cursor-pointer
                  text-sm transition-colors
                  ${want[key] ? 'border-accent-500 bg-accent-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="checkbox" checked={want[key] === true}
                  onChange={() => this.setState((p) => ({ want: { ...p.want, [key]: !p.want[key] } }))}
                  className="w-4 h-4" />
                <span className="text-slate-700">{arenaKeyLabel(key)}</span>
              </label>
            ))}
          </div>
          <p className="m-0 mb-4 text-xs text-slate-400">
            Cứ xin hết rồi chủ giải cắt bớt — bạn không phải đoán mình được trực sân nào.
          </p>

          <label htmlFor="req-note" className="block text-sm font-semibold text-slate-600 mb-1.5">
            Lời nhắn cho chủ giải (không bắt buộc)
          </label>
          <input id="req-note" value={note} maxLength={120}
            onChange={(e) => this.setState({ note: e.target.value })}
            placeholder="VD: Tôi trực sân A buổi sáng"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-control mb-4
              focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent" />

          <div className="flex gap-2">
            <Button variant="primary" block disabled={busy} onClick={this.submitRequest}
              icon="fa-solid fa-paper-plane">
              {busy ? 'Đang gửi…' : 'Xin quyền giám sát'}
            </Button>
            <Button variant="secondary" onClick={this.backToList}>Giải khác</Button>
          </div>
        </>
      );
    }

    // pick-tournament
    // Ban cham nhanh dung mot khoi rieng: ve DB no la giai binh thuong, nhung
    // no khong gan voi danh sach VDV nao ca — xep chung vao "vao thang duoc"
    // thi nguoi ta tuong day la mot giai da duoc duyet
    const real = tournaments.filter((t) => !t.demo);
    const mine = real.filter((t) => myTournaments.has(t.index));
    const others = real.filter((t) => !myTournaments.has(t.index));

    const row = (t: TournamentSummary, ready: boolean) => (
      <button
        key={t.index}
        type="button"
        disabled={busy}
        onClick={() => this.pick(t)}
        className="w-full text-left p-3.5 border border-slate-200 rounded-control bg-white
          hover:border-accent-400 hover:bg-accent-50/40 transition-colors flex items-center gap-3
          disabled:opacity-60"
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0
          ${ready ? 'bg-emerald-500' : t.status === 'open' ? 'bg-amber-400' : 'bg-slate-300'}`} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-slate-800 whitespace-pre-line">{t.name}</span>
          <span className="block text-xs text-slate-500 mt-0.5">
            {ready
              ? (t.ownerUid === user.uid ? 'Giải của bạn — vào thẳng' : 'Đã được duyệt — vào thẳng')
              : t.status === 'open' ? 'Đang mở · cần xin quyền'
              : !t.ownerUid ? 'Giải cũ chưa có chủ · vào được'
              : 'Chưa mở'}
          </span>
        </span>
        <i className="fa-solid fa-chevron-right text-slate-300" aria-hidden="true" />
      </button>
    );

    // Hien ca khi tai khoan chua co ban nao — bam vao moi dung. Di qua
    // `enterDemo` chu khong qua `pick` de con lo ma giam dinh va san B.
    const hasDemo = this.myDemo() !== null;
    const demoRow = (
      <button
        type="button"
        disabled={busy}
        onClick={this.enterDemo}
        className="w-full text-left p-3.5 border-2 border-emerald-200 rounded-control
          bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50 transition-colors
          flex items-center gap-3 disabled:opacity-60"
      >
        <span className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center
          justify-center flex-shrink-0">
          <i className="fa-solid fa-play text-sm" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-slate-800">
            {busy ? 'Đang mở bàn chấm…' : 'Chấm ngay'}
          </span>
          <span className="block text-xs text-slate-500 mt-0.5">
            {hasDemo
              ? 'Bàn riêng của bạn · mã giám định riêng · không có danh sách VĐV'
              : 'Dựng bàn riêng của bạn — chỉ XANH và ĐỎ, không có danh sách VĐV'}
          </span>
        </span>
        <i className="fa-solid fa-chevron-right text-emerald-400" aria-hidden="true" />
      </button>
    );

    return this.shell(
      `Giám sát ${kindName(kind).toLowerCase()}`,
      'Chọn giải bạn đang trực',
      <>
        {this.renderError()}

        <div className="mb-5">
          <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Chưa kịp chuẩn bị giải
          </p>
          {demoRow}
        </div>

        {mine.length > 0 && (
          <div className="mb-5">
            <p className="m-0 mb-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Vào thẳng được
            </p>
            <div className="space-y-2">{mine.map((t) => row(t, true))}</div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <p className="m-0 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Giải đang mở
            </p>
            <div className="space-y-2">{others.map((t) => row(t, false))}</div>
          </div>
        )}

        {real.length === 0 && (
          <p className="m-0 text-sm text-slate-500 text-center py-4">
            Chưa có giải nào đang mở — cứ bấm “Chấm ngay” ở trên mà chấm.
            Có giải thật thì nhờ ban tổ chức tạo rồi bấm “Mở giải”.
          </p>
        )}
      </>
    );
  }
}

export default RequestAccessPanel;
