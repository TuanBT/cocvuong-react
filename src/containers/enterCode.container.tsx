import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/img/logo.png';
import { Button, NumericKeypad, Toast } from '../components/ui';
import { ensureAnonymous } from '../services/authService';
import {
  CodeError, CodeSlot, OpenPosition, PREFIX_LENGTH,
  arenaName, cacheSession, claimCode, getCachedSession, getCode, kindName,
  positionLabel, positionsForPrefix, refreshPosition, resolveRefereeSession,
  slotString, spacedCode,
} from '../services/accessCodeService';
import { getData } from '../services/firebaseService';
import type { TournamentId } from '../types';

const LAST_UID_KEY = 'cocvuong_last_anon_uid';

interface EnterCodeContainerProps {
  history?: { push: (path: string) => void };
}

type Phase = 'signing-in' | 'auth-failed' | 'keypad' | 'pick' | 'entering';

/** Giai tim thay tu 2 so — dang cho giam dinh chon cho ngoi cua minh */
interface Picking {
  prefix: string;
  t: TournamentId;
  tournamentName: string;
  positions: OpenPosition[];
  /** Giai mot san thi dat san luon, khong hoi thua mot cau */
  arena: number | null;
  /** Da chon vi tri — chi con cau "hom nay cham gi" neu o do co ca hai mon */
  chosen: OpenPosition | null;
  /** Cham vao o dang co may khac cam: bao ngay tai cho, khong day ra man khac */
  blocked: string;
}

interface EnterCodeContainerState {
  phase: Phase;
  uid: string;
  value: string;
  error: string;
  picking: Picking | null;
  /** Trinh duyet o che do rieng tu: uid an danh sinh lai moi lan mo */
  privateModeWarning: boolean;
  busy: boolean;
}

/**
 * Trang `/gd` — man hinh duy nhat cua giam dinh.
 *
 * **Giam dinh chi go DUNG 2 SO**: so cua giai. San va vi tri thi ho cham vao
 * man hinh — mot cai bam thi khong go nham duoc, con mot chu so go nham thi
 * roi thang sang ban ben canh ma khong ai biet.
 *
 * Ma 4 so `[2 so cua giai][san][vi tri]` van la thu that su mo cua o duoi:
 * bam xong, app ghep du 4 so roi claim y het nhu cu. Cai bo di la viec bat
 * NGUOI phai ghep — mot phep tinh nham cho khong ai kiem lai duoc.
 *
 * Giai cu (moi o mot ma 2 so ngau nhien) van vao duoc bang chinh 2 so ay: go
 * 2 so ra ma that thi vao thang, ra so cua giai thi hien bang chon. Hai the he
 * ma cung mot thao tac — **go 2 so**.
 *
 * Giam dinh KHONG dang nhap gi ca. Chu ky an danh chay ngam — khong mot chu
 * "dang nhap" nao xuat hien tren duong di cua ho.
 *
 * Ten giai luon nam to o dau man chon: kho ma nho nen go nham mot chu so van
 * co the roi vao mot giai that KHAC. Ten giai la thu duy nhat phan biet duoc
 * "GD2 San B giai minh" voi "GD2 San B giai nguoi ta".
 */
class EnterCodeContainer extends Component<EnterCodeContainerProps, EnterCodeContainerState> {
  state: EnterCodeContainerState = {
    phase: 'signing-in',
    uid: '',
    value: '',
    error: '',
    picking: null,
    privateModeWarning: false,
    busy: false,
  };

  constructor(props: EnterCodeContainerProps) {
    super(props);
    document.title = 'Vào chấm điểm - Cóc Vương';
  }

  componentDidMount() {
    void this.start();
  }

  go(path: string) {
    if (this.props.history) this.props.history.push(path);
    else window.location.href = path;
  }

  async start() {
    this.setState({ phase: 'signing-in', error: '' });

    let uid = '';
    try {
      const user = await ensureAnonymous();
      uid = user.uid;
    } catch {
      this.setState({
        phase: 'auth-failed',
        error:
          'Máy chưa kết nối được với hệ thống. Thường là do mất mạng hoặc trình duyệt đang chặn cookie.',
      });
      return;
    }

    // uid doi ma van con ban sao phien cu => trinh duyet dang o che do rieng tu
    const cached = getCachedSession();
    let privateModeWarning = false;
    try {
      const lastUid = localStorage.getItem(LAST_UID_KEY);
      privateModeWarning = !!cached && !!lastUid && lastUid !== uid;
      localStorage.setItem(LAST_UID_KEY, uid);
    } catch {
      /* khong doc duoc storage cung la mot dau hieu cua che do rieng tu */
      privateModeWarning = true;
    }

    // Da co phien roi thi vao thang, khong hoi lai
    const session = await resolveRefereeSession(uid);
    if (session) {
      this.go(session.slot.kind === 'combat' ? '/giam-dinh-doi-khang' : '/giam-dinh-thi-quyen');
      return;
    }

    this.setState({ phase: 'keypad', uid, privateModeWarning });
  }

  handleChange = (value: string) => {
    // Go sai thi bao ngay tai cho, KHONG xoa het so da go
    this.setState({ value, error: '' });
    if (value.length === PREFIX_LENGTH) void this.lookup(value);
  };

  async tournamentName(t: TournamentId | undefined): Promise<string> {
    if (!t) return '';
    return (await getData<string>(`tournament/${t}/setting/tournamentName`)) || 'Giải chưa đặt tên';
  }

  /**
   * 2 so vua go la SO CUA GIAI — bay ra dung nhung ban cham co that de ho cham.
   *
   * Bo o thi doc thang tu node so cua giai: no mang san so san va so giam
   * dinh, nen dung lai duoc ca bang ma khong ton them vong doc nao. Chi con
   * phai hoi that mot thu la "o nay may nao dang cam".
   */
  async lookup(code: string) {
    this.setState({ busy: true });
    try {
      const holder = await getCode(code);
      if (!holder || !holder.reserved) {
        this.setState({
          busy: false,
          error: 'Không có số này. Kiểm tra lại số giám sát đọc cho.',
        });
        return;
      }

      const [tournamentName, positions] = await Promise.all([
        this.tournamentName(holder.tKey),
        positionsForPrefix(code, holder),
      ]);

      if (!positions.length) {
        this.setState({
          busy: false,
          error: 'Giải này chưa mở bàn chấm nào. Nhờ giám sát kiểm tra lại giúp.',
        });
        return;
      }

      const arenas = [...new Set(positions.map((p) => p.a))];
      this.setState({
        phase: 'pick',
        busy: false,
        error: '',
        picking: {
          prefix: code,
          t: holder.tKey,
          tournamentName,
          positions,
          // Giai mot san thi dat san luon, khong hoi thua mot cau
          arena: arenas.length === 1 ? arenas[0] : null,
          chosen: null,
          blocked: '',
        },
      });
    } catch {
      this.setState({ error: 'Không đọc được — kiểm tra kết nối mạng rồi thử lại.', busy: false });
    }
  }

  // ==================== Chon cho ngoi ====================

  patch(next: Partial<Picking>) {
    this.setState((prev) => (prev.picking ? { picking: { ...prev.picking, ...next } } : null));
  }

  chooseArena = (a: number) => this.patch({ arena: a, blocked: '' });

  /**
   * Cham vao mot vi tri.
   *
   * O dang co nguoi thi doc lai chinh node do truoc khi bao loi: giam sat vua
   * bam "Mo khoa" o may ben canh xong thi cham phat nua la vao duoc, khong
   * phai thoat ra go lai so.
   */
  choosePosition = async (pos: OpenPosition) => {
    const { uid, picking } = this.state;
    if (!picking) return;

    if (pos.claimedUid && pos.claimedUid !== uid) {
      this.setState({ busy: true });
      const fresh = await refreshPosition(pos).catch(() => pos);
      this.setState({ busy: false });

      if (!fresh) {
        this.patch({ blocked: 'Ô này vừa bị thu hồi. Nhờ giám sát kiểm tra lại giúp.' });
        return;
      }
      this.patch({
        positions: picking.positions.map((p) => (p.code === fresh.code ? fresh : p)),
        blocked:
          fresh.claimedUid && fresh.claimedUid !== uid
            ? `${positionLabel(pos.a, pos.r)} đang có máy khác dùng. Nhờ giám sát bấm “Mở khoá” rồi chạm lại.`
            : '',
      });
      if (fresh.claimedUid && fresh.claimedUid !== uid) return;
      this.take(fresh);
      return;
    }

    this.take(pos);
  };

  /** Mot mon thi vao thang; hai mon thi con dung mot cau hoi nua */
  take(pos: OpenPosition) {
    if (pos.slots.length > 1) {
      this.patch({ chosen: pos, blocked: '' });
      return;
    }
    void this.enter(pos.code, pos.slots[0], this.state.picking?.tournamentName || '');
  }

  chooseKind = (slot: CodeSlot) => {
    const { picking } = this.state;
    if (picking?.chosen) void this.enter(picking.chosen.code, slot, picking.tournamentName);
  };

  /**
   * Ghep du 4 so roi nhan ma — y het luong cu, chi khac la NGUOI khong phai
   * ghep. Ma kieu cu di chung duong nay: ma cua no von da la ca 4 so kia.
   */
  async enter(code: string, slot: CodeSlot, tournamentName: string) {
    const { uid } = this.state;

    this.setState({ phase: 'entering', busy: true });
    try {
      await claimCode(code, uid, slot);
      cacheSession({ code, slot: slotString(slot), tournamentName });
      this.go(slot.kind === 'combat' ? '/giam-dinh-doi-khang' : '/giam-dinh-thi-quyen');
    } catch (err: any) {
      const message =
        err instanceof CodeError
          ? err.message
          : 'Không vào được. Kiểm tra mạng rồi thử lại — hoặc nhờ giám sát bấm “Mở khoá”.';

      // Hai may cung cham mot o mot luc: nguoi cham sau quay ve dung bang chon
      // de cham o khac, khong bat go lai so tu dau
      const { picking } = this.state;
      if (picking) {
        const target = picking.positions.find((p) => p.code === code);
        const fresh = target ? await refreshPosition(target).catch(() => null) : null;
        this.setState({
          phase: 'pick',
          busy: false,
          picking: {
            ...picking,
            chosen: null,
            positions: fresh
              ? picking.positions.map((p) => (p.code === code ? { ...p, claimedUid: fresh.claimedUid } : p))
              : picking.positions,
            blocked: message,
          },
        });
        return;
      }

      this.setState({ phase: 'keypad', value: '', error: message, busy: false });
    }
  }

  /** Lui mot buoc — khong bao gio bat go lai so chi vi bam nham san */
  back = () => {
    const { picking } = this.state;
    if (!picking) return this.retype();

    if (picking.chosen) return this.patch({ chosen: null, blocked: '' });

    const arenas = [...new Set(picking.positions.map((p) => p.a))];
    if (picking.arena !== null && arenas.length > 1) return this.patch({ arena: null, blocked: '' });

    return this.retype();
  };

  retype = () =>
    this.setState({ phase: 'keypad', picking: null, value: '', error: '' });

  // ==================== Ve ====================

  shell(children: React.ReactNode) {
    return (
      <div data-accent="brand" className="min-h-screen flex flex-col select-text
        bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <Toast autoClose={2000} />
      </div>
    );
  }

  /** Khung chung cua man chon: ten giai luon nam tren dau, to va ro */
  pickShell(step: string, children: React.ReactNode) {
    const { picking } = this.state;
    return this.shell(
      <div className="bg-white rounded-card shadow-card border border-slate-100 overflow-hidden">
        <div className="bg-emerald-600 px-5 py-3">
          <p className="m-0 text-white/80 text-[11px] uppercase tracking-wide font-semibold">
            Giải số {spacedCode(picking?.prefix || '')}
          </p>
          <p className="m-0 text-white font-bold leading-snug whitespace-pre-line">
            {picking?.tournamentName}
          </p>
        </div>

        <div className="p-5">
          <p className="m-0 mb-4 text-center text-base font-semibold text-slate-700">{step}</p>
          {children}

          {picking?.blocked && (
            <p role="alert" className="mt-4 mb-0 text-sm text-amber-800 bg-amber-50 border
              border-amber-200 rounded-control px-3 py-2.5">
              <i className="fa-solid fa-lock mr-1.5" aria-hidden="true" />
              {picking.blocked}
            </p>
          )}

          <Button variant="secondary" size="lg" block className="mt-4"
            icon="fa-solid fa-arrow-left" onClick={this.back}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  renderPick(picking: Picking) {
    const { busy, uid } = this.state;
    const arenas = [...new Set(picking.positions.map((p) => p.a))].sort();

    // Buoc 1 — san. Giai mot san khong bao gio thay man nay.
    if (picking.arena === null) {
      return this.pickShell(
        'Bạn ngồi sân nào?',
        <div className="grid grid-cols-2 gap-3">
          {arenas.map((a) => (
            <button
              key={a}
              type="button"
              disabled={busy}
              onClick={() => this.chooseArena(a)}
              className="rounded-card py-7 bg-white border-2 border-slate-200 text-slate-800
                text-xl font-bold shadow-sm hover:border-accent-400 hover:bg-accent-50
                active:scale-95 disabled:opacity-40 transition tap-target"
            >
              {arenaName(a)}
            </button>
          ))}
        </div>
      );
    }

    // Buoc 3 — mon. Cai duy nhat o cham diem khong noi ho duoc.
    if (picking.chosen) {
      return this.pickShell(
        `${positionLabel(picking.chosen.a, picking.chosen.r)} — hôm nay bạn chấm gì?`,
        <div className="flex gap-3">
          {picking.chosen.slots.map((slot) => {
            const combat = slot.kind === 'combat';
            return (
              <button
                key={slot.kind}
                type="button"
                disabled={busy}
                onClick={() => this.chooseKind(slot)}
                className={`flex-1 rounded-card px-4 py-5 text-white shadow-card transition-transform
                  active:scale-95 disabled:opacity-40
                  ${combat ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <i className={`fa-solid ${combat ? 'fa-hand-back-fist' : 'fa-hand-fist'} text-2xl block mb-2`}
                  aria-hidden="true" />
                <span className="block text-lg font-bold uppercase tracking-wide">
                  {kindName(slot.kind)}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    // Buoc 2 — vi tri. O nao dang co nguoi thi noi ra ngay tai o do, de ho biet
    // phai goi giam sat truoc khi cham chu khong cham roi moi an loi.
    const here = picking.positions.filter((p) => p.a === picking.arena);
    return this.pickShell(
      `${arenaName(picking.arena)} — bạn là giám định số mấy?`,
      <div className="grid grid-cols-3 gap-3">
        {here.map((pos) => {
          const mine = !!pos.claimedUid && pos.claimedUid === uid;
          const taken = !!pos.claimedUid && !mine;
          return (
            <button
              key={pos.code}
              type="button"
              disabled={busy}
              onClick={() => void this.choosePosition(pos)}
              className={`rounded-card py-5 border-2 shadow-sm active:scale-95 disabled:opacity-40
                transition tap-target
                ${taken
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : mine
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-accent-400 hover:bg-accent-50'}`}
            >
              <span className="block text-2xl font-black">GĐ{pos.r + 1}</span>
              {(taken || mine) && (
                <span className="block mt-1 text-[10px] uppercase tracking-wide">
                  {mine ? 'máy này' : 'đang có người'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  render() {
    const { phase, value, error, picking, privateModeWarning, busy } = this.state;

    if (phase === 'signing-in' || phase === 'entering') {
      return this.shell(
        <div className="text-center text-slate-500">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-accent-600 mb-3 block"
            aria-hidden="true" />
          <p className="m-0">{phase === 'entering' ? 'Đang vào bàn chấm…' : 'Đang chuẩn bị…'}</p>
        </div>
      );
    }

    if (phase === 'auth-failed') {
      return this.shell(
        <div className="bg-white rounded-card shadow-card border border-slate-100 p-6 text-center">
          <i className="fa-solid fa-plug-circle-xmark text-4xl text-red-500 mb-4 block"
            aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-800 mb-2">Chưa vào được</h1>
          <p className="text-sm text-slate-600 mb-5">{error}</p>
          <Button variant="primary" size="lg" block icon="fa-solid fa-rotate-right"
            onClick={() => this.start()}>
            Thử lại
          </Button>
          <p className="mt-4 mb-0 text-xs text-slate-400">
            Vẫn không được thì báo giám sát — có thể phải đổi máy khác.
          </p>
        </div>
      );
    }

    if (phase === 'pick' && picking) return this.renderPick(picking);

    return this.shell(
      <>
        <div className="text-center mb-6">
          <Link to="/" title="Về trang chủ"
            className="inline-flex bg-white p-3 rounded-card shadow-card mb-4
              hover:shadow-lg transition-shadow">
            <img src={logo} alt="Cóc Vương" className="h-11 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Gõ số của giải</h1>
          <p className="text-sm text-slate-500 m-0">
            Hai số giám sát đọc cho cả đoàn — xong rồi chọn sân và số của bạn
          </p>
        </div>

        <div className="bg-white rounded-card shadow-card border border-slate-100 p-5">
          <NumericKeypad
            value={value}
            length={PREFIX_LENGTH}
            onChange={this.handleChange}
            onSubmit={() => value.length === PREFIX_LENGTH && this.lookup(value)}
            disabled={busy}
          />

          {error && (
            <p role="alert" className="mt-5 mb-0 text-sm text-red-700 bg-red-50 border
              border-red-200 rounded-control px-3 py-2.5">
              <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
              {error}
            </p>
          )}

          {privateModeWarning && (
            <p className="mt-4 mb-0 text-xs text-amber-800 bg-amber-50 border border-amber-200
              rounded-control px-3 py-2.5 leading-relaxed">
              <i className="fa-solid fa-user-secret mr-1.5" aria-hidden="true" />
              Trình duyệt đang ở chế độ riêng tư nên máy này bị coi là máy mới mỗi lần mở.
              Chỗ ngồi của bạn sẽ báo “đang có người” — nhờ giám sát bấm <strong>Mở khoá</strong>,
              hoặc mở app ở cửa sổ thường.
            </p>
          )}
        </div>

        <p className="text-center mt-5 mb-0 text-sm">
          <Link to="/" className="text-slate-400 hover:text-slate-600">Về trang chủ</Link>
        </p>
      </>
    );
  }
}

export default EnterCodeContainer;
