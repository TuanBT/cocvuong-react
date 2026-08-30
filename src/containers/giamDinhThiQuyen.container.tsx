import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';

// Import Martial Write Service (logic ghi thi quyền — dùng chung với bộ test e2e)
import { submitMartialRefereeScore } from '../services/martialWriteService';
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
import type { TournamentId } from '../types';

/** 1..9 - hang 0 va hai phim chuc nang duoc dat rieng o cuoi ban phim */
const NUMPAD_KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3];

interface GiamDinhThiQuyenContainerProps {
  history?: { push: (path: string) => void };
}

/** Vi sao man cham diem khong dung duoc nua — moi ly do mot cau, khong lap lo */
type LockReason = null | 'no-session' | 'unlocked' | 'closed';

interface GiamDinhThiQuyenContainerState {
  arenaName: string;
  tournamentName: string;
  isDemo: boolean;
  gdName: string;
  matchMartialName: string;
  matchMartialNo: string;
  refereeResultBox: string;
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
  martial: {
    isShowFiveReferee: boolean;
  };
}

class GiamDinhThiQuyenContainer extends Component<GiamDinhThiQuyenContainerProps, GiamDinhThiQuyenContainerState> {
  firebaseListeners: DatabaseReference[] = [];
  db: Database;
  settingObj: TournamentSetting | null = null;
  numReferee: number = 3;
  presenceCleanup: (() => void) | null = null;
  unsubCode: (() => void) | null = null;
  uid = '';
  code = '';
  slot: CodeSlot | null = null;
  refereeName: string = "";
  referreIndex: number = -1;
  path: string = "";
  pathMartial: string = "";
  pathMartialScore: string = "";
  refereeMartialScore: string = "";
  matchNoCurrentIndex: number = 0;
  teamNoCurrentIndex: number = 0;
  martialArenaNoIndex: number = 0;
  tournamentNoIndex: TournamentId = '0';

  constructor(props: GiamDinhThiQuyenContainerProps) {
    super(props);
    document.title = 'Giám Định Thi Quyền';
    
    this.state = {
      arenaName: '',
      tournamentName: '',
      isDemo: false,
      gdName: '',
      matchMartialName: '',
      matchMartialNo: '',
      refereeResultBox: '00',
      isInternetConnected: true,
      showHelpModal: false,
      showModalShortcut: false,
      lock: null,
      ready: false,
    };
    
    this.db = database;
  }

  componentDidMount() {
    void this.startSession();
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._handleKeyDown);
    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];

    this.presenceCleanup?.();
    this.presenceCleanup = null;
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

    const session = await resolveRefereeSession(uid, 'martial');
    if (!session) {
      this.goToEnterCode();
      return;
    }

    this.uid = uid;
    this.code = session.code;
    this.slot = session.slot;
    this.tournamentNoIndex = session.slot.t;
    this.martialArenaNoIndex = session.slot.a;
    this.referreIndex = session.slot.r;
    this.refereeName = `Giám Định ${session.slot.r + 1}`;

    this.setState({
      gdName: this.refereeName,
      tournamentName: session.tournamentName,
      ready: true,
    });

    document.addEventListener("keydown", this._handleKeyDown);
    this.watchCode();
    this.main();
    this.attachArenaListeners();
  }

  goToEnterCode() {
    if (this.props.history) this.props.history.push('/gd');
    else window.location.href = '/gd';
  }

  /**
   * Theo doi CHINH ma minh dang giu: giam sat bam "Mo khoa" hoac chu giai dong
   * giai thi phai hien man hinh ro rang ngay.
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
        if (this.settingObj.martial.isShowFiveReferee === true) {
          this.numReferee = 5;
        }
        this.setState({
          tournamentName: displayTournamentName(this.settingObj, 'martial'),
          isDemo: this.settingObj.demo === true,
        });
      }
    });

    const connectedRef = ref(this.db, '.info/connected');
    this.firebaseListeners.push(connectedRef);
    onValue(connectedRef, (snapshot) => {
      this.setState({ isInternetConnected: snapshot.val() === true });
    });
  }

  /** Con modal nao dang mo thi ban phim thuoc ve modal do */
  isAnyModalOpen(): boolean {
    const { showHelpModal, showModalShortcut } = this.state;
    return showHelpModal || showModalShortcut;
  }

  _handleKeyDown = (e: KeyboardEvent) => {
    // Modal tu xu ly phim cua no (Esc de dong)
    if (this.isAnyModalOpen()) return;
    // Mat quyen cham thi ban phim khong lam gi
    if (this.state.lock) return;

    if (e.key === 'Escape') {
      this.clearInput();
      return;
    }

    if (e.key === 'Enter') {
      this.submitInput();
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      this.input(Number(e.key));
    }
  }

  /** Noi listener cho dung o da duoc ma troi san */
  attachArenaListeners = () => {
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/martialArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });

    const lastMatchRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/lastMatchMartial');
    this.firebaseListeners.push(lastMatchRef);
    onValue(lastMatchRef, (snapshot) => {
      const lastMatchMartial = snapshot.val();
      if (!lastMatchMartial) return;

      this.matchNoCurrentIndex = lastMatchMartial.matchMartialNo - 1;
      this.teamNoCurrentIndex = lastMatchMartial.teamMartialNo - 1;

      get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martial/' + this.matchNoCurrentIndex)).then((martialSnapshot) => {
        const martialData = martialSnapshot.val();
        if (martialData) {
          this.setState({
            matchMartialName: martialData.match.name,
            matchMartialNo: martialData.team[this.teamNoCurrentIndex].no
          });
        }
      });

      this.pathMartial = "tournament/" + this.tournamentNoIndex + "/martial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex + "/refereeMartial/" + this.referreIndex;
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

  input = (score: number) => {
    // Điểm thi quyền là số nguyên 0-99
    if (this.refereeMartialScore.length >= 2) {
      toast.error("Chỉ nhập điểm từ 0 đến 99");
      return;
    }
    this.refereeMartialScore += score;
    this.setState({ refereeResultBox: this.refereeMartialScore || '00' });
  }

  clearInput = () => {
    this.refereeMartialScore = "";
    this.setState({ refereeResultBox: '00' });
  }

  submitInput = () => {
    if (parseInt(this.refereeMartialScore) > 99) {
      this.refereeMartialScore = "";
    }

    const scoreValue = parseInt(this.refereeMartialScore) || 0;

    // Gửi điểm lên Firebase + tính lại điểm tổng của đội
    submitMartialRefereeScore(
      { db: this.db, tournamentIndex: this.tournamentNoIndex, arenaIndex: this.martialArenaNoIndex },
      this.matchNoCurrentIndex,
      this.teamNoCurrentIndex,
      this.referreIndex,
      scoreValue,
      this.numReferee
    );

    this.refereeMartialScore = "";
    this.setState({ refereeResultBox: '00' });
    toast.success("Chấm điểm thành công!");
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
              <div className="h-6 w-20 bg-slate-200 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-9 w-9 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col p-2 gap-2">
          <div className="h-[18vh] bg-slate-300 rounded-card animate-pulse" />
          <div className="flex-1 grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-slate-300 rounded-card animate-pulse" />
            ))}
          </div>
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
      tournamentName,
      isDemo,
      matchMartialName,
      matchMartialNo,
      refereeResultBox,
      isInternetConnected,
      showHelpModal,
      showModalShortcut,
      ready,
    } = this.state;

    const hasInput = this.refereeMartialScore !== '';

    return (
      <div data-accent="martial" className="app-fullscreen bg-slate-100">
        {(!gdName || !ready) && this.renderSkeleton()}
        {this.renderLock()}

        <RefereeHeader
          isOnline={isInternetConnected}
          chips={[
            { label: arenaName || '...', className: 'bg-amber-600' },
            {
              label: `${matchMartialName || '...'}${matchMartialNo ? ` - ${matchMartialNo}` : ''}`,
              className: 'bg-slate-600',
            },
          ]}
          refereeName={gdName}
          tournamentName={tournamentName}
          isDemo={isDemo}
          onExit={this.exitSession}
          onOpenShortcuts={this.openShortcuts}
          onOpenHelp={this.openHelp}
        />

        <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
          {/* O diem: chua bam gui thi mo, da co so thi noi ro len de giam dinh
              lien mat vao khong nham */}
          <div
            className={`rounded-card shadow-sm px-3 py-2 mb-2 flex-shrink-0 transition-colors duration-150
              ${hasInput ? 'bg-amber-500' : 'bg-slate-300'}`}
          >
            <output
              className="block text-[15vw] sm:text-[12vw] md:text-[10vw] font-black text-white
                text-center tracking-wider drop-shadow leading-none tabular-nums"
            >
              {refereeResultBox}
            </output>
          </div>

          {/* Ban phim lap day toan bo phan con lai; phim to nhat co the de bam
              nhanh bang ngon cai khi cam mot tay. Diem thi quyen la so nguyen
              nen ban phim chi co 0-9, khong co dau thap phan. */}
          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
            {NUMPAD_KEYS.map((key) => (
              <ScoreKey
                key={key}
                value={key}
                onPress={this.input}
                ariaLabel={`Nhập ${key}`}
                className="bg-white active:bg-amber-100"
                labelClassName="text-[9vw] sm:text-[7vw] font-bold text-slate-700"
              >
                {key}
              </ScoreKey>
            ))}

            <ScoreKey
              value={0}
              onPress={this.clearInput}
              ariaLabel="Xoá điểm vừa nhập"
              className="bg-red-500 text-white active:brightness-110"
              labelClassName="text-[7vw] sm:text-[5vw]"
            >
              <i className="fa-regular fa-trash-can" aria-hidden="true" />
            </ScoreKey>

            <ScoreKey
              value={0}
              onPress={this.input}
              ariaLabel="Nhập 0"
              className="bg-white active:bg-amber-100"
              labelClassName="text-[9vw] sm:text-[7vw] font-bold text-slate-700"
            >
              0
            </ScoreKey>

            <ScoreKey
              value={0}
              onPress={this.submitInput}
              ariaLabel="Gửi điểm"
              className="bg-emerald-600 text-white shadow active:brightness-110"
              labelClassName="text-[7vw] sm:text-[5vw]"
            >
              <i className="fa-solid fa-check" aria-hidden="true" />
            </ScoreKey>
          </div>
        </div>

        <RefereeHelpModal isOpen={showHelpModal} onClose={this.closeHelp} />

        <ShortcutModal isOpen={showModalShortcut} onClose={this.closeShortcuts}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-calculator text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-slate-700">Nhập điểm</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-3 bg-slate-50 rounded-control">
                {['0', '1', '2', '3'].map((n) => (
                  <span key={n} className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center
                    text-sm font-bold text-slate-600">{n}</span>
                ))}
                <span className="w-8 h-8 flex items-center justify-center text-slate-400">…</span>
                <span className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center
                  text-sm font-bold text-slate-600">9</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 mb-0">Dùng hàng phím số hoặc numpad</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-check-double text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-slate-700">Thao tác</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-control border border-emerald-100">
                  <span className="px-2 h-8 bg-emerald-600 text-white rounded flex items-center
                    justify-center text-xs font-bold">Enter</span>
                  <span className="text-emerald-700 text-sm">Gửi điểm</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-control border border-red-100">
                  <span className="px-2 h-8 bg-red-500 text-white rounded flex items-center
                    justify-center text-xs font-bold">Esc</span>
                  <span className="text-red-700 text-sm">Xoá / Đóng</span>
                </div>
              </div>
            </div>
          </div>
        </ShortcutModal>

        <Toast autoClose={800} />
      </div>
    );
  }
}

export default GiamDinhThiQuyenContainer;
