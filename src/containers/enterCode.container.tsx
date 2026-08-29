import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/img/logo.png';
import { Button, NumericKeypad, Toast } from '../components/ui';
import { ensureAnonymous } from '../services/authService';
import {
  AccessCode, CODE_LENGTH, CodeError, CodeSlot,
  cacheSession, claimCode, getCachedSession, getCode, parseSlot,
  resolveRefereeSession, slotLabel, spacedCode,
} from '../services/accessCodeService';
import { getData } from '../services/firebaseService';

const LAST_UID_KEY = 'cocvuong_last_anon_uid';

interface EnterCodeContainerProps {
  history?: { push: (path: string) => void };
}

type Phase = 'signing-in' | 'auth-failed' | 'keypad' | 'confirm' | 'entering';

interface EnterCodeContainerState {
  phase: Phase;
  uid: string;
  value: string;
  error: string;
  /** Ma da tra cuu xong, dang cho xac nhan */
  found: { code: string; data: AccessCode; slot: CodeSlot; tournamentName: string } | null;
  /** Trinh duyet o che do rieng tu: uid an danh sinh lai moi lan mo */
  privateModeWarning: boolean;
  busy: boolean;
}

/**
 * Trang `/vao` — man hinh duy nhat cua giam dinh.
 *
 * Ban phim so, go 2 chu so, het. App tu biet day la "giam dinh thi quyen GD2
 * San B cua giai X" va nhay thang vao dung man hinh do. Bo han ba vong radio
 * chon giai -> chon san -> chon vi tri: **day chinh la cho xoa loi "chon toi
 * lui gay sai sot"**.
 *
 * Giam dinh KHONG dang nhap gi ca. Chu ky an danh chay ngam — khong mot chu
 * "dang nhap" nao xuat hien tren duong di cua ho.
 *
 * Man xac nhan mot dong la **bat buoc**, khong phai trang tri: voi 99 ma ma
 * ~25 ma dang song, go dai mot so co xac suat ~1/4 trung mot ma that — va ma do
 * co the thuoc **giai khac**. Ten giai to va ro la thu duy nhat phan biet duoc
 * "GD2 San B giai minh" voi "GD2 San B giai nguoi ta".
 */
class EnterCodeContainer extends Component<EnterCodeContainerProps, EnterCodeContainerState> {
  state: EnterCodeContainerState = {
    phase: 'signing-in',
    uid: '',
    value: '',
    error: '',
    found: null,
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
    } catch (err: any) {
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
    if (value.length === CODE_LENGTH) void this.lookup(value);
  };

  async lookup(code: string) {
    this.setState({ busy: true });
    try {
      const data = await getCode(code);
      if (!data) {
        this.setState({ error: 'Không có mã này. Kiểm tra lại số giám sát đọc cho.', busy: false });
        return;
      }
      const slot = parseSlot(data.slot);
      if (!slot) {
        this.setState({ error: 'Mã hỏng — nhờ giám sát cấp lại mã mới.', busy: false });
        return;
      }
      if (data.claimedUid && data.claimedUid !== this.state.uid) {
        this.setState({
          error: 'Mã này đã có người dùng. Nhờ giám sát bấm “Mở khoá” rồi gõ lại đúng mã này.',
          busy: false,
        });
        return;
      }

      const tournamentName =
        (await getData<string>(`tournament/${slot.t}/setting/tournamentName`)) || `Giải ${slot.t + 1}`;

      this.setState({ phase: 'confirm', found: { code, data, slot, tournamentName }, busy: false });
    } catch {
      this.setState({ error: 'Không đọc được mã — kiểm tra kết nối mạng rồi thử lại.', busy: false });
    }
  }

  confirm = async () => {
    const { found, uid } = this.state;
    if (!found) return;

    this.setState({ phase: 'entering', busy: true });
    try {
      await claimCode(found.code, uid);
      cacheSession({
        code: found.code,
        slot: found.data.slot,
        label: slotLabel(found.slot),
        tournamentName: found.tournamentName,
      });
      this.go(found.slot.kind === 'combat' ? '/giam-dinh-doi-khang' : '/giam-dinh-thi-quyen');
    } catch (err: any) {
      const message =
        err instanceof CodeError
          ? err.message
          : 'Không vào được. Kiểm tra mạng rồi thử lại — hoặc nhờ giám sát bấm “Mở khoá”.';
      this.setState({ phase: 'keypad', found: null, value: '', error: message, busy: false });
    }
  };

  retype = () => this.setState({ phase: 'keypad', found: null, value: '', error: '' });

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

  render() {
    const { phase, value, error, found, privateModeWarning, busy } = this.state;

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

    if (phase === 'confirm' && found) {
      return this.shell(
        <div className="bg-white rounded-card shadow-card border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 px-5 py-3">
            <p className="m-0 text-white/80 text-xs uppercase tracking-wide font-semibold">
              Mã {spacedCode(found.code)} — đúng chưa?
            </p>
          </div>

          <div className="p-5 text-center">
            {/* Ten giai to nhat: day la thu DUY NHAT phan biet duoc GD2 San B
                cua giai minh voi GD2 San B cua giai nguoi khac */}
            <p className="m-0 mb-1 text-xs text-slate-400 uppercase tracking-wide">Giải</p>
            <p className="m-0 mb-5 text-xl font-bold text-slate-800 whitespace-pre-line leading-snug">
              {found.tournamentName}
            </p>

            <p className="m-0 mb-5 text-lg font-semibold text-accent-700">
              {slotLabel(found.slot)}
            </p>

            <Button variant="success" size="lg" block icon="fa-solid fa-check"
              disabled={busy} onClick={this.confirm}>
              Đúng rồi — vào chấm
            </Button>
            <Button variant="secondary" size="lg" block className="mt-2.5"
              icon="fa-solid fa-arrow-left" onClick={this.retype}>
              Không đúng — gõ lại
            </Button>
          </div>
        </div>
      );
    }

    return this.shell(
      <>
        <div className="text-center mb-6">
          <div className="inline-flex bg-white p-3 rounded-card shadow-card mb-4">
            <img src={logo} alt="Cóc Vương" className="h-11 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Gõ mã vào bàn chấm</h1>
          <p className="text-sm text-slate-500 m-0">
            {CODE_LENGTH} chữ số do giám sát đọc cho bạn
          </p>
        </div>

        <div className="bg-white rounded-card shadow-card border border-slate-100 p-5">
          <NumericKeypad
            value={value}
            length={CODE_LENGTH}
            onChange={this.handleChange}
            onSubmit={() => value.length === CODE_LENGTH && this.lookup(value)}
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
              Mã sẽ báo “đã có người dùng” — nhờ giám sát bấm <strong>Mở khoá</strong>, hoặc
              mở app ở cửa sổ thường.
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
