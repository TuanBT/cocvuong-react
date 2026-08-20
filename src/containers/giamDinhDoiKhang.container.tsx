import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import constants
import { REFEREE_COUNT } from '../constants/rounds';

// Import Score Sync utilities
import { sendScoreFromGiamDinh } from '../utils/scoreSync';

// Import Firebase presence
import { setGiamDinhPresence, removeGiamDinhPresence } from '../services/firebaseService';

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
  showSettingsMenu: boolean;
  showHelpModal: boolean;
  showModalShortcut: boolean;
}

interface TournamentSetting {
  tournamentName: string;
  combat: {
    isShowFiveReferee: boolean;
  };
}

class GiamDinhDoiKhangContainer extends Component<GiamDinhDoiKhangContainerProps, GiamDinhDoiKhangContainerState> {
  // Firebase listener references for cleanup
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

  // Refs for radio inputs
  arenaRadioRefs: RefObject<HTMLInputElement>[] = [createRef(), createRef()];
  refereeRadioRefs: RefObject<HTMLInputElement>[] = [];

  
  // Presence cleanup function
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
      showSettingsMenu: false,
      showHelpModal: false,
      showModalShortcut: false
    };
    
    this.db = database;
    
    // Create refs for 5 referees
    for (let i = 0; i < 5; i++) {
      this.refereeRadioRefs.push(createRef());
    }
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    
    // Check for cached password
    this.checkCachedPassword();
  }

  componentWillUnmount() {
    // Cleanup event listeners
    document.removeEventListener("keydown", this._handleKeyDown);
    
    // Cleanup Firebase listeners
    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];
    
    // Cleanup Firebase presence
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
        // Password still valid, skip modal
        this.setState({ showPasswordModal: false });
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
  }

  _handleKeyDown = (e: KeyboardEvent) => {
    // ESC - Đóng modal đang mở
    if (e.which === 27) {
      const { showPasswordModal, showChooseRefereeNoModal, showHelpModal, showModalShortcut } = this.state;
      if (showPasswordModal) {
        this.hidePasswordModal();
      } else if (showChooseRefereeNoModal) {
        this.hideChooseRefereeNoModal();
      } else if (showHelpModal) {
        this.setState({ showHelpModal: false });
      } else if (showModalShortcut) {
        this.setState({ showModalShortcut: false });
      }
      return;
    }
    
    // Left arrow
    if (e.which === 37) {
      this.redAddition(2);
    }
    // Up arrow
    if (e.which === 38) {
      this.redAddition(1);
    }
    // Right arrow
    if (e.which === 39) {
      this.blueAddition(2);
    }
    // Down arrow
    if (e.which === 40) {
      this.blueAddition(1);
    }
  }

  getSelectedArenaIndex = (): number => {
    for (let i = 0; i < this.arenaRadioRefs.length; i++) {
      if (this.arenaRadioRefs[i].current?.checked) {
        return i;
      }
    }
    return 0;
  }

  getSelectedRefereeNo = (): string | null => {
    for (let i = 0; i < this.refereeRadioRefs.length; i++) {
      if (this.refereeRadioRefs[i].current?.checked) {
        return (i + 1).toString();
      }
    }
    return null;
  }

  chooseRefereeNo = () => {
    const combatArenaNo = this.getSelectedArenaIndex();
    this.combatArenaNoIndex = combatArenaNo;
    
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/combatArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });
    
    const refereeNo = this.getSelectedRefereeNo();
    if (refereeNo != null && refereeNo !== "") {
      this.setState({ showChooseRefereeNoModal: false });

      for (let i = 1; i <= this.numReferee; i++) {
        if (refereeNo === i + "") {
          this.refereeName = "Giám Định " + i;
          this.referreIndex = i - 1;
        }
      }
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


  redAddition = (score: number) => {
    // Gửi điểm lên Firebase
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
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
      theme: "light",
    });
  }

  blueAddition = (score: number) => {
    // Gửi điểm lên Firebase
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
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
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

  hidePasswordModal = () => {
    this.setState({ showPasswordModal: false });
  };

  hideChooseRefereeNoModal = () => {
    this.setState({ showChooseRefereeNoModal: false });
  };

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
      showSettingsMenu,
      showHelpModal,
      showModalShortcut
    } = this.state;

    return (
      <div className="giam-dinh-container bg-slate-100">
        {/* Loading Skeleton - full screen when no match data (z-20 so modals can overlay) */}
        {!gdMatch && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-100">
            {/* Skeleton Header */}
            <div className="bg-white shadow-md px-3 py-2 flex-shrink-0 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                {/* LEFT skeleton - status dot + arena + match */}
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-slate-300 rounded-full animate-pulse"></div>
                  <div className="h-6 w-16 bg-slate-300 rounded-lg animate-pulse"></div>
                  <div className="h-6 w-14 bg-slate-200 rounded-lg animate-pulse"></div>
                </div>
                {/* RIGHT skeleton - Giám Định nổi bật + settings */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-24 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-lg animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            {/* Skeleton Buttons */}
            <div className="flex-1 grid grid-cols-2 gap-2 p-2">
              <div className="flex flex-col gap-2">
                <div className="flex-1 bg-slate-300 rounded-2xl animate-pulse"></div>
                <div className="flex-1 bg-slate-300 rounded-2xl animate-pulse"></div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex-1 bg-slate-300 rounded-2xl animate-pulse"></div>
                <div className="flex-1 bg-slate-300 rounded-2xl animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Header - status dot LEFT, Giám Định name RIGHT */}
        <header className="bg-white shadow-md px-3 py-2 flex-shrink-0 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            {/* LEFT: Status dot + Arena, Match */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Connection Status Dot */}
              <span 
                className={`status-dot w-3 h-3 rounded-full block flex-shrink-0 ${
                  isInternetConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}
                data-tooltip={isInternetConnected ? 'Đã kết nối Internet' : 'Mất kết nối'}
              ></span>
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                {arenaName || '...'}
              </span>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                {gdMatch || '...'}
              </span>
            </div>
            {/* RIGHT: Giám Định name (nổi bật) + Settings */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-md">
                {gdName || '...'}
              </span>
              <div className="relative">
                <button 
                  onClick={() => this.setState({ showSettingsMenu: !showSettingsMenu })}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center"
                >
                  <i className="fa fa-cog text-sm"></i>
                </button>
                {/* Dropdown Menu */}
                {showSettingsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => this.setState({ showSettingsMenu: false })}></div>
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]">
                      <button 
                        onClick={() => this.setState({ showSettingsMenu: false, showModalShortcut: true })}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <i className="fa-solid fa-keyboard text-slate-500"></i>
                        Phím tắt
                      </button>
                      <button 
                        onClick={() => this.setState({ showSettingsMenu: false, showHelpModal: true })}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <i className="fa-solid fa-circle-question text-slate-500"></i>
                        Giúp đỡ
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Warning when disconnected */}
          {!isInternetConnected && (
            <div className="mt-2 bg-red-100 text-red-700 py-1 px-2 text-center text-xs font-medium rounded-lg border border-red-200">
              <i className="fa-solid fa-exclamation-triangle mr-1"></i>
              Không có kết nối - Không thể chấm điểm
            </div>
          )}
        </header>

        {/* Full-screen Scoring Area - takes all remaining space */}
        <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0 h-full overflow-hidden">
          {/* Red Team - Left Column */}
          <div className="flex flex-col gap-2 min-h-0">
            <button 
              onClick={() => this.redAddition(1)}
              className="flex-1 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.97] active:brightness-110 active:shadow-[inset_0_0_30px_rgba(255,255,255,0.4)]"
              style={{ minHeight: 0 }}
            >
              <span className="text-[18vw] sm:text-[14vw] md:text-[12vw] font-black text-white drop-shadow-lg leading-none">1</span>
            </button>
            <button 
              onClick={() => this.redAddition(2)}
              className="flex-1 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-lg flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.97] active:brightness-110 active:shadow-[inset_0_0_30px_rgba(255,255,255,0.4)]"
              style={{ minHeight: 0 }}
            >
              <span className="text-[18vw] sm:text-[14vw] md:text-[12vw] font-black text-white drop-shadow-lg leading-none">2</span>
            </button>
          </div>

          {/* Blue Team - Right Column */}
          <div className="flex flex-col gap-2 min-h-0">
            <button 
              onClick={() => this.blueAddition(1)}
              className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.97] active:brightness-110 active:shadow-[inset_0_0_30px_rgba(255,255,255,0.4)]"
              style={{ minHeight: 0 }}
            >
              <span className="text-[18vw] sm:text-[14vw] md:text-[12vw] font-black text-white drop-shadow-lg leading-none">1</span>
            </button>
            <button 
              onClick={() => this.blueAddition(2)}
              className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.97] active:brightness-110 active:shadow-[inset_0_0_30px_rgba(255,255,255,0.4)]"
              style={{ minHeight: 0 }}
            >
              <span className="text-[18vw] sm:text-[14vw] md:text-[12vw] font-black text-white drop-shadow-lg leading-none">2</span>
            </button>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-lock"></i>Nhập mật khẩu
                  </h5>
                  <button onClick={this.hidePasswordModal} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="password" 
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-lg tracking-widest text-center"
                    placeholder="••••••"
                    value={password}
                    readOnly
                  />
                  <button 
                    onClick={() => this.inputPw('-1')}
                    className="p-2 bg-red-100 text-red-600 rounded-xl"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {['1','2','3','4','5'].map(num => (
                    <button key={num} onClick={() => this.inputPw(num)}
                      className="p-3 text-lg font-bold bg-slate-100 active:bg-slate-300 rounded-xl">{num}</button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {['6','7','8','9','0'].map(num => (
                    <button key={num} onClick={() => this.inputPw(num)}
                      className="p-3 text-lg font-bold bg-slate-100 active:bg-slate-300 rounded-xl">{num}</button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 p-3 bg-slate-50 border-t">
                <button onClick={this.hidePasswordModal}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-medium">Hủy</button>
                <button onClick={this.verifyPassword}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700">OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Choose Referee Modal */}
        {showChooseRefereeNoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sticky top-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-id-badge"></i>Chọn thông tin
                  </h5>
                  <button onClick={this.hideChooseRefereeNoModal} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Tournament Selection */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Giải đấu</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                      <label key={i} onClick={() => this.chooseTournament(i)}
                        className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-blue-50">
                        <input type="radio" name="tournamentRadio" defaultChecked={i === 0} className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-slate-700">{tournament[1]}</span>
                      </label>
                    )) : <p className="text-slate-400 italic text-sm">Không có giải đấu</p>}
                  </div>
                </div>

                {/* Arena Selection */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sân thi đấu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="relative">
                      <input type="radio" name="optionsArena" value="0" defaultChecked ref={this.arenaRadioRefs[0]} className="peer sr-only" />
                      <div className="p-3 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex flex-col items-center justify-center min-h-[60px]">
                        <i className="fa-solid fa-chess-board text-xl text-blue-500"></i>
                        <span className="font-bold text-sm text-slate-700 mt-1">Sân A</span>
                      </div>
                    </label>
                    <label className="relative">
                      <input type="radio" name="optionsArena" value="1" ref={this.arenaRadioRefs[1]} className="peer sr-only" />
                      <div className="p-3 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex flex-col items-center justify-center min-h-[60px]">
                        <i className="fa-solid fa-chess-board text-xl text-blue-500"></i>
                        <span className="font-bold text-sm text-slate-700 mt-1">Sân B</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Referee Selection */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Vị trí giám định</p>
                  <div className={`grid ${isShowFiveReferee ? 'grid-cols-5' : 'grid-cols-3'} gap-1.5`}>
                    {[1, 2, 3].map((num, i) => (
                      <label key={num} className="relative">
                        <input type="radio" name="optionsReferee" value={num} defaultChecked={i === 0} ref={this.refereeRadioRefs[i]} className="peer sr-only" />
                        <div className="p-2 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex items-center justify-center min-h-[40px]">
                          <span className="font-bold text-sm text-slate-700">GĐ{num}</span>
                        </div>
                      </label>
                    ))}
                    {isShowFiveReferee && [4, 5].map((num, i) => (
                      <label key={num} className="relative">
                        <input type="radio" name="optionsReferee" value={num} ref={this.refereeRadioRefs[i + 3]} className="peer sr-only" />
                        <div className="p-2 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex items-center justify-center min-h-[40px]">
                          <span className="font-bold text-sm text-slate-700">GĐ{num}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 p-3 bg-slate-50 border-t sticky bottom-0">
                <button onClick={this.hideChooseRefereeNoModal}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-medium">Hủy</button>
                <button onClick={this.chooseRefereeNo}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-500 text-white font-medium">OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => this.setState({ showHelpModal: false })}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-circle-question"></i>Hướng dẫn sử dụng
                  </h5>
                  <button onClick={() => this.setState({ showHelpModal: false })} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-5">
                {/* Status Dot Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-signal text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Trạng thái kết nối</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></span>
                      <span className="text-slate-600">Đã kết nối Internet</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="w-3 h-3 rounded-full bg-gray-400 shadow-sm"></span>
                      <span className="text-slate-600">Mất kết nối</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-slate-50 border-t">
                <button onClick={() => this.setState({ showHelpModal: false })}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">Đã hiểu</button>
              </div>
            </div>
          </div>
        )}

        {/* Shortcut Modal */}
        {showModalShortcut && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => this.setState({ showModalShortcut: false })}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-keyboard"></i>Phím tắt
                  </h5>
                  <button onClick={() => this.setState({ showModalShortcut: false })} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* Scoring Keys */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-star text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Phím tắt chấm điểm</span>
                  </div>
                  
                  {/* Arrow keys visual */}
                  <div className="flex justify-center mb-3">
                    <div className="grid grid-cols-3 gap-1">
                      <div></div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center border border-red-200">
                        <span className="text-red-600 font-bold text-lg">↑</span>
                      </div>
                      <div></div>
                      <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center border border-red-300">
                        <span className="text-red-700 font-bold text-lg">←</span>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                        <span className="text-blue-600 font-bold text-lg">↓</span>
                      </div>
                      <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center border border-blue-300">
                        <span className="text-blue-700 font-bold text-lg">→</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="text-red-700 font-bold mb-1">VĐV Đỏ</div>
                      <div className="text-red-600 text-xs">↑ Gò (+1) | ← TĐT (+2)</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-blue-700 font-bold mb-1">VĐV Xanh</div>
                      <div className="text-blue-600 text-xs">↓ Gò (+1) | → TĐT (+2)</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-slate-50 border-t">
                <button onClick={() => this.setState({ showModalShortcut: false })}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">Đã hiểu</button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="top-center" autoClose={800} hideProgressBar />
      </div>
    );
  }
}

export default GiamDinhDoiKhangContainer;
