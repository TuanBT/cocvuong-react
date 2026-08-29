import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';

import { REFEREE_COUNT } from '../constants/rounds';
import { sendScoreFromGiamDinh } from '../utils/scoreSync';
import { setSlotPresence } from '../services/firebaseService';
import { ensureAnonymous } from '../services/authService';
import { displayTournamentName } from '../services/demoService';
import {
  AccessCode, CodeSlot, clearSession, resolveRefereeSession,
  slotLabel, slotString, subscribeCode,
} from '../services/accessCodeService';

import { Button, Toast } from '../components/ui';
import {
  RefereeHeader,
  RefereeHelpModal,
  ShortcutModal,
  ScoreKey,
} from '../components/referee';

interface GiamDinhDoiKhangContainerProps {
  history?: { push: (path: string) => void };
}

/** Vi sao man cham diem khong dung duoc nua — moi ly do mot cau, khong lap lo */
type LockReason = null | 'no-session' | 'unlocked' | 'closed';

interface GiamDinhDoiKhangContainerState {
  tournamentName: string;
  isDemo: boolean;
  arenaName: string;
  gdName: string;
  gdMatch: string;
  isInternetConnected: boolean;
  showHelpModal: boolean;
  showModalShortcut: boolean;
  /** Man chan khi mat quyen cham — khong de bam vao hu khong roi loi am tham */
  lock: LockReason;
  ready: boolean;
}

interface TournamentSetting {
  tournamentName: string;
  demo?: boolean;
  combat: {
    isShowFiveReferee: boolean;
  };
}

/** Co chu cua so 1 / 2 tren phim cham diem, theo be ngang man hinh */
const SCORE_LABEL = 'text-[18vw] sm:text-[14vw] md:text-[12vw] font-black text-white drop-shadow-lg leading-none';

/**
 * Trang giam dinh doi khang - dung tren dien thoai doc, cam tay suot tran.
 *
 * Ca man hinh chi la 4 phim lon: mot cot Do, mot cot Xanh. Bo cuc uu tien
 * vung cham to nhat co the va khong bao gio phai cuon, vi giam dinh bam trong
 * luc dang nhin san chu khong nhin dien thoai.
 */
class GiamDinhDoiKhangContainer extends Component<GiamDinhDoiKhangContainerProps, GiamDinhDoiKhangContainerState> {
  firebaseListeners: DatabaseReference[] = [];
  db: Database;
  settingObj: TournamentSetting | null = null;
  numReferee: number = REFEREE_COUNT.DEFAULT;
  refereeName: string = "";
  referreIndex: number = -1;
  path: string = "";
  combatArenaNoIndex: number = 0;
  tournamentNoIndex: number = 0;

  presenceCleanup: (() => void) | null = null;
  unsubCode: (() => void) | null = null;
  uid = '';
  code = '';
  slot: CodeSlot | null = null;

  constructor(props: GiamDinhDoiKhangContainerProps) {
    super(props);
    document.title = 'Giám Định Đối Kháng';

    this.state = {
      tournamentName: '',
      isDemo: false,
      arenaName: '',
      gdName: '',
      gdMatch: '',
      isInternetConnected: true,
      showHelpModal: false,
      showModalShortcut: false,
      lock: null,
      ready: false,
    };

    this.db = database;
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    void this.startSession();
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._handleKeyDown);

    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];

    if (this.presenceCleanup) {
      this.presenceCleanup();
    }

    this.unsubCode?.();
    this.unsubCode = null;
  }

  /**
   * Vao thang tu so da go o `/gd` — khong hoi mat khau, khong chon giai/san/
   * vi tri lan nao nua. Chua co phien thi day ve `/gd`.
   */
  async startSession() {
    let uid = '';
    try {
      const user = await ensureAnonymous();
      uid = user.uid;
    } catch {
      this.setState({ lock: 'no-session' });
      return;
    }

    const session = await resolveRefereeSession(uid, 'combat');
    if (!session) {
      this.goToEnterCode();
      return;
    }

    this.uid = uid;
    this.code = session.code;
    this.slot = session.slot;
    this.tournamentNoIndex = session.slot.t;
    this.combatArenaNoIndex = session.slot.a;
    this.referreIndex = session.slot.r;
    this.refereeName = `Giám Định ${session.slot.r + 1}`;

    this.setState({
      gdName: this.refereeName,
      tournamentName: session.tournamentName,
      ready: true,
    });

    this.watchCode();
    this.main();
    this.attachArenaListeners();
  }

  goToEnterCode() {
    if (this.props.history) this.props.history.push('/gd');
    else window.location.href = '/gd';
  }

  /**
   * Theo doi CHINH ma minh dang giu.
   *
   * Giam sat bam "Mo khoa" hoac chu giai dong giai (ma bi xoa) thi phai hien
   * man hinh ro rang ngay — de bam tiep vao hu khong roi loi am tham la kieu
   * hong te nhat giua tran.
   */
  watchCode() {
    this.unsubCode?.();
    this.unsubCode = subscribeCode(this.code, (data: AccessCode | null) => {
      if (!data) {
        this.setState({ lock: 'closed' });
      } else if (data.claimedUid !== this.uid) {
        this.setState({ lock: 'unlocked' });
      } else {
        this.setState({ lock: null });
      }
    });
  }

  exitSession = async () => {
    await clearSession(this.uid).catch(() => undefined);
    this.goToEnterCode();
  };

  main() {
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (this.settingObj) {
        this.setState({
          tournamentName: displayTournamentName(this.settingObj, 'combat'),
          isDemo: this.settingObj.demo === true,
        });

        if (this.settingObj.combat.isShowFiveReferee === true) {
          this.numReferee = REFEREE_COUNT.FIVE;
        }
      }
    });
  }

  /** Con modal nao dang mo thi phim mui ten khong duoc tinh la cham diem */
  isAnyModalOpen(): boolean {
    const { showHelpModal, showModalShortcut } = this.state;
    return showHelpModal || showModalShortcut;
  }

  _handleKeyDown = (e: KeyboardEvent) => {
    // Modal tu xu ly Esc va phim so cua no
    if (this.isAnyModalOpen()) return;
    // Chua co phien / mat quyen cham thi phim mui ten khong lam gi
    if (this.referreIndex < 0 || this.state.lock) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.redAddition(2);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.redAddition(1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.blueAddition(2);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.blueAddition(1);
        break;
      default:
        break;
    }
  }

  /** Noi listener cho dung o da duoc ma troi san */
  attachArenaListeners = () => {
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/combatArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });

    const lastMatchRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch/no');
    this.firebaseListeners.push(lastMatchRef);
    onValue(lastMatchRef, (snapshot) => {
      const matchCurrentNoIndex = snapshot.val() - 1;
      const matchCurrentNo = matchCurrentNoIndex + 1;
      this.setState({ gdMatch: "Trận số " + matchCurrentNo });
      this.path = "tournament/" + this.tournamentNoIndex + "/combatArena/" + this.combatArenaNoIndex + "/referee/" + this.referreIndex;
    });

    // Kiểm tra kết nối internet
    const connectedRef = ref(this.db, '.info/connected');
    this.firebaseListeners.push(connectedRef);
    onValue(connectedRef, (snapshot) => {
      const hasInternet = snapshot.val() === true;
      this.setState({ isInternetConnected: hasInternet });
    });

    this.setupPresence();
  }

  setupPresence = async () => {
    if (!this.slot) return;
    try {
      this.presenceCleanup = await setSlotPresence(slotString(this.slot), slotLabel(this.slot));
    } catch (err) {
      // Silent fail - presence là tính năng phụ
    }
  }

  /** Rung nhe de giam dinh biet da an trung phim ma khong can nhin man hinh */
  buzz() {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
  }

  redAddition = (score: number) => {
    this.buzz();
    sendScoreFromGiamDinh({
      db: this.db,
      tournamentNoIndex: this.tournamentNoIndex,
      combatArenaNoIndex: this.combatArenaNoIndex,
      refereeIndex: this.referreIndex,
      arena: this.combatArenaNoIndex === 0 ? 'A' : 'B'
    }, 'red', score);

    toast.error("+" + score + " điểm cho ĐỎ", {
      position: "top-left",
      autoClose: 1000,
      theme: "light",
    });
  }

  blueAddition = (score: number) => {
    this.buzz();
    sendScoreFromGiamDinh({
      db: this.db,
      tournamentNoIndex: this.tournamentNoIndex,
      combatArenaNoIndex: this.combatArenaNoIndex,
      refereeIndex: this.referreIndex,
      arena: this.combatArenaNoIndex === 0 ? 'A' : 'B'
    }, 'blue', score);

    toast.info("+" + score + " điểm cho XANH", {
      position: "top-right",
      autoClose: 1000,
      theme: "light",
    });
  }

  openShortcuts = () => this.setState({ showModalShortcut: true });

  openHelp = () => this.setState({ showHelpModal: true });

  closeShortcuts = () => this.setState({ showModalShortcut: false });

  closeHelp = () => this.setState({ showHelpModal: false });

  renderSkeleton() {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-slate-100">
        <div className="bg-white px-3 py-2 flex-shrink-0 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-slate-300 rounded-full animate-pulse" />
              <div className="h-6 w-16 bg-slate-300 rounded-lg animate-pulse" />
              <div className="h-6 w-14 bg-slate-200 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-9 w-9 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2 p-2">
          {[0, 1].map((column) => (
            <div key={column} className="flex flex-col gap-2">
              <div className="flex-1 bg-slate-300 rounded-card animate-pulse" />
              <div className="flex-1 bg-slate-300 rounded-card animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * Man chan khi mat quyen cham.
   *
   * Ba tinh huong deu ket thuc o day: giam sat bam Mo khoa (doi may, het pin),
   * chu giai dong giai, hoac may nay chua co phien nao. Moi truong hop mot cau
   * tieng Viet ro va mot duong di tiep — khong bao gio de man hinh dung im.
   */
  renderLock() {
    const { lock, tournamentName } = this.state;
    if (!lock) return null;

    const copy = {
      'unlocked': {
        icon: 'fa-solid fa-unlock',
        title: 'Mã đã được mở khoá',
        body: 'Giám sát vừa mở khoá chỗ này cho máy khác. Gõ lại số của giải rồi chọn đúng chỗ cũ để vào lại.',
        cta: 'Gõ lại mã',
      },
      'closed': {
        icon: 'fa-solid fa-flag-checkered',
        title: 'Giải đã kết thúc',
        body: 'Chủ giải đã đóng giải nên mã này không còn hiệu lực. Điểm đã chấm vẫn được lưu.',
        cta: 'Về trang vào mã',
      },
      'no-session': {
        icon: 'fa-solid fa-plug-circle-xmark',
        title: 'Chưa vào được hệ thống',
        body: 'Máy chưa kết nối được. Kiểm tra mạng hoặc cài đặt chặn cookie của trình duyệt.',
        cta: 'Thử lại',
      },
    }[lock];

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/85 p-5">
        <div className="bg-white rounded-card shadow-pop max-w-sm w-full p-6 text-center">
          <i className={`${copy.icon} text-4xl text-amber-500 mb-4 block`} aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800 m-0 mb-2">{copy.title}</h2>
          {tournamentName && (
            <p className="text-xs text-slate-400 m-0 mb-3 whitespace-pre-line">{tournamentName}</p>
          )}
          <p className="text-sm text-slate-600 m-0 mb-5 leading-relaxed">{copy.body}</p>
          <Button variant="primary" size="lg" block icon="fa-solid fa-keyboard"
            onClick={this.exitSession}>
            {copy.cta}
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const {
      arenaName,
      gdName,
      gdMatch,
      tournamentName,
      isDemo,
      isInternetConnected,
      showHelpModal,
      showModalShortcut,
      ready,
    } = this.state;

    return (
      <div data-accent="combat" className="app-fullscreen bg-slate-100">
        {(!gdMatch || !ready) && this.renderSkeleton()}
        {this.renderLock()}

        <RefereeHeader
          isOnline={isInternetConnected}
          chips={[
            { label: arenaName || '...', className: 'bg-emerald-600' },
            { label: gdMatch || '...', className: 'bg-slate-600' },
          ]}
          refereeName={gdName}
          tournamentName={tournamentName}
          isDemo={isDemo}
          onExit={this.exitSession}
          onOpenShortcuts={this.openShortcuts}
          onOpenHelp={this.openHelp}
        />

        {/* Vung cham diem chiem toan bo phan con lai cua man hinh.
            Cot trai Do / cot phai Xanh trung voi vi tri VDV tren san. */}
        <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 min-h-0">
            <ScoreKey
              value={1}
              onPress={this.redAddition}
              ariaLabel="Đỏ cộng 1 điểm"
              className="flex-1 bg-gradient-to-br from-red-500 to-red-600 active:brightness-110"
              labelClassName={SCORE_LABEL}
            >
              1
            </ScoreKey>
            <ScoreKey
              value={2}
              onPress={this.redAddition}
              ariaLabel="Đỏ cộng 2 điểm"
              className="flex-1 bg-gradient-to-br from-red-600 to-red-700 active:brightness-110"
              labelClassName={SCORE_LABEL}
            >
              2
            </ScoreKey>
          </div>

          <div className="flex flex-col gap-2 min-h-0">
            <ScoreKey
              value={1}
              onPress={this.blueAddition}
              ariaLabel="Xanh cộng 1 điểm"
              className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 active:brightness-110"
              labelClassName={SCORE_LABEL}
            >
              1
            </ScoreKey>
            <ScoreKey
              value={2}
              onPress={this.blueAddition}
              ariaLabel="Xanh cộng 2 điểm"
              className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 active:brightness-110"
              labelClassName={SCORE_LABEL}
            >
              2
            </ScoreKey>
          </div>
        </div>

        <RefereeHelpModal isOpen={showHelpModal} onClose={this.closeHelp} />

        <ShortcutModal isOpen={showModalShortcut} onClose={this.closeShortcuts}>
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-star text-slate-400" aria-hidden="true" />
            <span className="font-semibold text-slate-700">Chấm điểm bằng bàn phím</span>
          </div>

          <div className="flex justify-center mb-4">
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <div className="w-12 h-12 bg-red-100 border border-red-200 rounded-control flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">↑</span>
              </div>
              <div />
              <div className="w-12 h-12 bg-red-200 border border-red-300 rounded-control flex items-center justify-center">
                <span className="text-red-700 font-bold text-lg">←</span>
              </div>
              <div className="w-12 h-12 bg-blue-100 border border-blue-200 rounded-control flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">↓</span>
              </div>
              <div className="w-12 h-12 bg-blue-200 border border-blue-300 rounded-control flex items-center justify-center">
                <span className="text-blue-700 font-bold text-lg">→</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-3 bg-red-50 rounded-control border border-red-100">
              <div className="text-red-700 font-bold mb-1">VĐV Đỏ</div>
              <div className="text-red-600 text-xs">↑ Gò (+1) · ← TĐT (+2)</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-control border border-blue-100">
              <div className="text-blue-700 font-bold mb-1">VĐV Xanh</div>
              <div className="text-blue-600 text-xs">↓ Gò (+1) · → TĐT (+2)</div>
            </div>
          </div>
        </ShortcutModal>

        <Toast autoClose={1000} />
      </div>
    );
  }
}

export default GiamDinhDoiKhangContainer;
