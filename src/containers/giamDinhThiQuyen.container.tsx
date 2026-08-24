import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { toast } from 'react-toastify';

// Import Martial Write Service (logic ghi thi quyền — dùng chung với bộ test e2e)
import { submitMartialRefereeScore } from '../services/martialWriteService';

import { PasswordModal, Toast } from '../components/ui';
import {
  RefereeHeader,
  RefereeSetupModal,
  RefereeHelpModal,
  ShortcutModal,
  ScoreKey,
} from '../components/referee';

/** 1..9 - hang 0 va hai phim chuc nang duoc dat rieng o cuoi ban phim */
const NUMPAD_KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3];

interface GiamDinhThiQuyenContainerProps {}

interface GiamDinhThiQuyenContainerState {
  data: any;
  password: string;
  arenaName: string;
  gdName: string;
  matchMartialName: string;
  matchMartialNo: string;
  refereeResultBox: string;
  isInternetConnected: boolean;
  showPasswordModal: boolean;
  showChooseRefereeNoModal: boolean;
  isShowFiveReferee: boolean;
  selectedTournament: number;
  selectedArena: number;
  selectedReferee: number;
  showHelpModal: boolean;
  showModalShortcut: boolean;
}

interface TournamentSetting {
  martial: {
    isShowFiveReferee: boolean;
  };
}

class GiamDinhThiQuyenContainer extends Component<GiamDinhThiQuyenContainerProps, GiamDinhThiQuyenContainerState> {
  firebaseListeners: DatabaseReference[] = [];
  db: Database;
  tournamentObj: any[] | null = null;
  settingObj: TournamentSetting | null = null;
  tournaments: [number, string][] = [];
  numReferee: number = 3;
  refereeName: string = "";
  referreIndex: number = -1;
  path: string = "";
  pathMartial: string = "";
  pathMartialScore: string = "";
  refereeMartialScore: string = "";
  matchNoCurrentIndex: number = 0;
  teamNoCurrentIndex: number = 0;
  martialArenaNoIndex: number = 0;
  tournamentNoIndex: number = 0;

  constructor(props: GiamDinhThiQuyenContainerProps) {
    super(props);
    document.title = 'Giám Định Thi Quyền';
    
    this.state = {
      data: null,
      password: '',
      arenaName: '',
      gdName: '',
      matchMartialName: '',
      matchMartialNo: '',
      refereeResultBox: '00',
      isInternetConnected: true,
      showPasswordModal: true,
      showChooseRefereeNoModal: false,
      isShowFiveReferee: false,
      selectedTournament: 0,
      selectedArena: 0,
      selectedReferee: 1,
      showHelpModal: false,
      showModalShortcut: false
    };
    
    this.db = database;
  }

  componentDidMount() {
    // Check for cached password
    this.checkCachedPassword();
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._handleKeyDown);
    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];
  }

  checkCachedPassword = () => {
    const cachedValid = localStorage.getItem('giamDinh_password_valid');
    const cachedTime = localStorage.getItem('giamDinh_password_timestamp');
    
    if (cachedValid === 'true' && cachedTime) {
      const timestamp = parseInt(cachedTime, 10);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - timestamp < sixHours) {
        // Password still valid, skip modal
        this.setState({ showPasswordModal: false });
        document.addEventListener("keydown", this._handleKeyDown);
        this.main();
        return;
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
          document.addEventListener("keydown", this._handleKeyDown);
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
        if (this.settingObj.martial.isShowFiveReferee === true) {
          this.numReferee = 5;
        }
        const isShowFiveReferee = this.settingObj.martial.isShowFiveReferee;
        this.setState({ 
          isShowFiveReferee,
          showChooseRefereeNoModal: true 
        });

        // Kiểm tra kết nối internet
        const connectedRef = ref(this.db, '.info/connected');
        this.firebaseListeners.push(connectedRef);
        onValue(connectedRef, (snapshot) => {
          this.setState({ isInternetConnected: snapshot.val() === true });
        });
      }
    });
  }

  chooseTournament = (tournamentNoIndex: number) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.setState({ selectedTournament: tournamentNoIndex });
  }

  /** Con modal nao dang mo thi ban phim thuoc ve modal do */
  isAnyModalOpen(): boolean {
    const { showPasswordModal, showChooseRefereeNoModal, showHelpModal, showModalShortcut } = this.state;
    return showPasswordModal || showChooseRefereeNoModal || showHelpModal || showModalShortcut;
  }

  _handleKeyDown = (e: KeyboardEvent) => {
    // Modal tu xu ly phim cua no (Esc de dong, so de nhap mat khau)
    if (this.isAnyModalOpen()) return;

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

  chooseRefereeNo = () => {
    const { selectedArena, selectedReferee } = this.state;
    this.martialArenaNoIndex = selectedArena;
    
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/martialArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });
    
    if (selectedReferee != null) {
      this.setState({ showChooseRefereeNoModal: false });

      this.refereeName = "Giám Định " + selectedReferee;
      this.referreIndex = selectedReferee - 1;
      this.setState({ gdName: this.refereeName });

      const lastMatchRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/lastMatchMartial');
      this.firebaseListeners.push(lastMatchRef);
      onValue(lastMatchRef, (snapshot) => {
        // Kiểm tra kết nối internet
        const connectedRef = ref(this.db, '.info/connected');
        onValue(connectedRef, (connSnapshot) => {
          this.setState({ isInternetConnected: connSnapshot.val() === true });
        });

        const lastMatchMartial = snapshot.val();

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


  inputPw = (value: string) => {
    if (value === "-1") {
      this.setState({ password: '' });
    } else {
      this.setState(prevState => ({ 
        password: prevState.password + value 
      }));
    }
  }

  handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ password: e.target.value });
  }

  handleArenaChange = (arenaIndex: number) => {
    this.setState({ selectedArena: arenaIndex });
  }

  handleRefereeChange = (refereeIndex: number) => {
    this.setState({ selectedReferee: refereeIndex });
  }

  openShortcuts = () => this.setState({ showModalShortcut: true });

  openHelp = () => this.setState({ showHelpModal: true });

  closeShortcuts = () => this.setState({ showModalShortcut: false });

  closeHelp = () => this.setState({ showHelpModal: false });

  hidePasswordModal = () => this.setState({ showPasswordModal: false });

  hideChooseRefereeNoModal = () => this.setState({ showChooseRefereeNoModal: false });

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

  render() {
    const {
      password,
      arenaName,
      gdName,
      matchMartialName,
      matchMartialNo,
      refereeResultBox,
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

    const hasInput = this.refereeMartialScore !== '';

    return (
      <div data-accent="martial" className="app-fullscreen bg-slate-100">
        {!gdName && this.renderSkeleton()}

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
          onSelectArena={this.handleArenaChange}
          selectedReferee={selectedReferee}
          onSelectReferee={this.handleRefereeChange}
          showFiveReferees={isShowFiveReferee}
          onConfirm={this.chooseRefereeNo}
          onClose={this.hideChooseRefereeNoModal}
        />

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
