import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';

import { REFEREE_COUNT } from '../constants/rounds';
import { sendScoreFromGiamDinh } from '../utils/scoreSync';
import { setGiamDinhPresence } from '../services/firebaseService';

import { PasswordModal, Toast } from '../components/ui';
import {
  RefereeHeader,
  RefereeSetupModal,
  RefereeHelpModal,
  ShortcutModal,
  ScoreKey,
} from '../components/referee';

interface GiamDinhDoiKhangContainerProps {}

interface GiamDinhDoiKhangContainerState {
  data: [number, string][];
  password: string;
  tournamentName: string;
  arenaName: string;
  gdName: string;
  gdMatch: string;
  isInternetConnected: boolean;
  showPasswordModal: boolean;
  showChooseRefereeNoModal: boolean;
  isShowFiveReferee: boolean;
  showHelpModal: boolean;
  showModalShortcut: boolean;
  /** O chon trong modal thiet lap - truoc day doc truc tiep tu DOM qua ref */
  selectedTournament: number;
  selectedArena: number;
  selectedReferee: number;
}

interface TournamentSetting {
  tournamentName: string;
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
  tournamentObj: any[] | null = null;
  settingObj: TournamentSetting | null = null;
  tournaments: [number, string][] = [];
  numReferee: number = REFEREE_COUNT.DEFAULT;
  refereeName: string = "";
  referreIndex: number = -1;
  path: string = "";
  combatArenaNoIndex: number = 0;
  tournamentNoIndex: number = 0;

  presenceCleanup: (() => void) | null = null;

  constructor(props: GiamDinhDoiKhangContainerProps) {
    super(props);
    document.title = 'Giám Định Đối Kháng';

    this.state = {
      data: [],
      password: '',
      tournamentName: '',
      arenaName: '',
      gdName: '',
      gdMatch: '',
      isInternetConnected: true,
      showPasswordModal: true,
      showChooseRefereeNoModal: false,
      isShowFiveReferee: false,
      showHelpModal: false,
      showModalShortcut: false,
      selectedTournament: 0,
      selectedArena: 0,
      selectedReferee: 1,
    };

    this.db = database;
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    this.checkCachedPassword();
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
  }

  checkCachedPassword = () => {
    const cachedValid = localStorage.getItem('giamDinh_password_valid');
    const cachedTime = localStorage.getItem('giamDinh_password_timestamp');

    if (cachedValid === 'true' && cachedTime) {
      const timestamp = parseInt(cachedTime, 10);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;

      if (now - timestamp < sixHours) {
        // Mat khau con han, bo qua modal
        this.setState({ showPasswordModal: false });
        this.main();
      }
    }
  }

  cachePassword = () => {
    localStorage.setItem('giamDinh_password_valid', 'true');
    localStorage.setItem('giamDinh_password_timestamp', Date.now().toString());
  }

  verifyPassword = () => {
    const { password } = this.state;

    if (password != null && password !== "") {
      const passwordRef = ref(this.db, 'commonSetting/passwordGiamDinh');
      onValue(passwordRef, (snapshot) => {
        if (password === String(snapshot.val())) {
          this.cachePassword();
          this.setState({ showPasswordModal: false });
          this.main();
        } else {
          toast.error("Sai mật khẩu!");
          window.location.reload();
        }
      }, { onlyOnce: true });
    } else {
      toast.error("Sai mật khẩu!");
    }
  }

  main() {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournaments = [];

      if (this.tournamentObj) {
        for (let i = 0; i < this.tournamentObj.length; i++) {
          this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
        }
      }
      this.setState({ data: this.tournaments });
    });

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (this.settingObj) {
        this.setState({
          tournamentName: this.settingObj.tournamentName,
          showChooseRefereeNoModal: true
        });

        if (this.settingObj.combat.isShowFiveReferee === true) {
          this.numReferee = REFEREE_COUNT.FIVE;
          this.setState({ isShowFiveReferee: true });
        }
      }
    });
  }

  chooseTournament = (tournamentNoIndex: number) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.setState({ selectedTournament: tournamentNoIndex });
  }

  selectArena = (index: number) => this.setState({ selectedArena: index });

  selectReferee = (position: number) => this.setState({ selectedReferee: position });

  /** Con modal nao dang mo thi phim mui ten khong duoc tinh la cham diem */
  isAnyModalOpen(): boolean {
    const { showPasswordModal, showChooseRefereeNoModal, showHelpModal, showModalShortcut } = this.state;
    return showPasswordModal || showChooseRefereeNoModal || showHelpModal || showModalShortcut;
  }

  _handleKeyDown = (e: KeyboardEvent) => {
    // Modal tu xu ly Esc va phim so cua no
    if (this.isAnyModalOpen()) return;
    // Chua chon vi tri giam dinh thi chua cham duoc
    if (this.referreIndex < 0) return;

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

  chooseRefereeNo = () => {
    const { selectedArena, selectedReferee } = this.state;
    this.combatArenaNoIndex = selectedArena;

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/combatArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });

    if (selectedReferee >= 1 && selectedReferee <= this.numReferee) {
      this.setState({ showChooseRefereeNoModal: false });

      this.refereeName = "Giám Định " + selectedReferee;
      this.referreIndex = selectedReferee - 1;
      this.setState({ gdName: this.refereeName });

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

      // Thiết lập Firebase presence (online status)
      this.setupPresence();
    }
  }

  setupPresence = async () => {
    const arena = this.combatArenaNoIndex === 0 ? 'A' : 'B';
    try {
      this.presenceCleanup = await setGiamDinhPresence(
        arena,
        this.tournamentNoIndex,
        this.referreIndex,
        this.refereeName
      );
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

  inputPw = (value: string) => {
    if (value === "-1") {
      this.setState({ password: '' });
    } else {
      this.setState(prevState => ({ password: prevState.password + value }));
    }
  }

  hidePasswordModal = () => this.setState({ showPasswordModal: false });

  hideChooseRefereeNoModal = () => this.setState({ showChooseRefereeNoModal: false });

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

  render() {
    const {
      password,
      arenaName,
      gdName,
      gdMatch,
      isInternetConnected,
      showPasswordModal,
      showChooseRefereeNoModal,
      isShowFiveReferee,
      showHelpModal,
      showModalShortcut,
      selectedTournament,
      selectedArena,
      selectedReferee,
    } = this.state;

    return (
      <div data-accent="combat" className="app-fullscreen bg-slate-100">
        {!gdMatch && this.renderSkeleton()}

        <RefereeHeader
          isOnline={isInternetConnected}
          chips={[
            { label: arenaName || '...', className: 'bg-emerald-600' },
            { label: gdMatch || '...', className: 'bg-slate-600' },
          ]}
          refereeName={gdName}
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

        <PasswordModal
          isOpen={showPasswordModal}
          value={password}
          onInput={this.inputPw}
          onSubmit={this.verifyPassword}
          onClose={this.hidePasswordModal}
        />

        <RefereeSetupModal
          isOpen={showChooseRefereeNoModal}
          tournaments={this.tournaments}
          selectedTournament={selectedTournament}
          onSelectTournament={this.chooseTournament}
          selectedArena={selectedArena}
          onSelectArena={this.selectArena}
          selectedReferee={selectedReferee}
          onSelectReferee={this.selectReferee}
          showFiveReferees={isShowFiveReferee}
          onConfirm={this.chooseRefereeNo}
          onClose={this.hideChooseRefereeNoModal}
        />

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
