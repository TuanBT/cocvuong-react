import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import constants
import { REFEREE_COUNT } from '../constants/rounds';

// Import Bridge utilities
import { sendScoreFromGiamDinh, connectBridgeAsGiamDinh, isBridgeConnected, onBridgeConnectionChange, disconnectBridge } from '../utils/scoreSync';

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
  isBridgeConnected: boolean;
  showPasswordModal: boolean;
  showChooseRefereeNoModal: boolean;
  showBridgeModal: boolean;
  bridgeUrl: string;
  bridgeConnecting: boolean;
  isShowFiveReferee: boolean;
  showSettingsMenu: boolean;
  showHelpModal: boolean;
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

  // Bridge cleanup function
  bridgeCleanup: (() => void) | null = null;
  
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
      isBridgeConnected: isBridgeConnected(),
      showPasswordModal: true,
      showChooseRefereeNoModal: false,
      showBridgeModal: false,
      bridgeUrl: localStorage.getItem('bridgeUrl') || '',
      bridgeConnecting: false,
      isShowFiveReferee: false,
      showSettingsMenu: false,
      showHelpModal: false
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

    // Subscribe to Bridge connection changes
    this.bridgeCleanup = onBridgeConnectionChange((connected) => {
      this.setState({ isBridgeConnected: connected });
    });
  }

  componentWillUnmount() {
    // Cleanup event listeners
    document.removeEventListener("keydown", this._handleKeyDown);
    
    // Cleanup Firebase listeners
    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];

    // Cleanup Bridge listener
    if (this.bridgeCleanup) {
      this.bridgeCleanup();
    }
    
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
      const { showPasswordModal, showChooseRefereeNoModal, showBridgeModal, showHelpModal } = this.state;
      if (showPasswordModal) {
        this.hidePasswordModal();
      } else if (showChooseRefereeNoModal) {
        this.hideChooseRefereeNoModal();
      } else if (showBridgeModal) {
        this.hideBridgeModal();
      } else if (showHelpModal) {
        this.setState({ showHelpModal: false });
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
        this.setState({ isInternetConnected: snapshot.val() === true });
      });

      // Thiết lập Firebase presence (online status)
      this.setupPresence();

      // Auto-connect Bridge nếu đã có URL lưu sẵn
      this.autoConnectBridge();
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

  autoConnectBridge = async () => {
    const savedUrl = localStorage.getItem('bridgeUrl');
    if (savedUrl && !isBridgeConnected()) {
      try {
        const arena = this.combatArenaNoIndex === 0 ? 'A' : 'B';
        const name = (this.refereeName || `Giám Định ${this.referreIndex + 1}`) + ' DK';
        const success = await connectBridgeAsGiamDinh(savedUrl, this.referreIndex, arena, this.tournamentNoIndex, name);
        if (success) {
          toast.success('Đã tự động kết nối LAN!', { autoClose: 2000 });
        }
      } catch (err) {
        // Silent fail - không cần thông báo lỗi vì Bridge có thể không chạy
      }
    }
  }

  redAddition = (score: number) => {
    // Gửi qua Bridge (nếu có) + Firebase
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
    // Gửi qua Bridge (nếu có) + Firebase
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

  // Bridge connection methods
  showBridgeSettings = () => {
    this.setState({ showBridgeModal: true });
  }

  hideBridgeModal = () => {
    this.setState({ showBridgeModal: false });
  }

  handleBridgeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ bridgeUrl: e.target.value });
  }

  connectToBridge = async () => {
    const { bridgeUrl } = this.state;
    if (!bridgeUrl.trim()) {
      toast.error('Vui lòng nhập địa chỉ Bridge');
      return;
    }

    this.setState({ bridgeConnecting: true });
    
    try {
      // Format URL properly
      let url = bridgeUrl.trim();
      if (!url.startsWith('ws://')) {
        url = 'ws://' + url;
      }
      if (!url.includes(':')) {
        url = url + ':9765';
      }

      // Save for next time
      localStorage.setItem('bridgeUrl', url);
      this.setState({ bridgeUrl: url });

      // Connect with proper info
      const arena = this.combatArenaNoIndex === 0 ? 'A' : 'B';
      const name = (this.refereeName || `Giám Định ${this.referreIndex + 1}`) + ' DK';
      
      const success = await connectBridgeAsGiamDinh(url, this.referreIndex, arena, this.tournamentNoIndex, name);
      
      if (success) {
        toast.success('Đã kết nối LAN!');
        this.setState({ showBridgeModal: false });
      } else {
        toast.error('Không thể kết nối LAN');
      }
    } catch (err) {
      toast.error('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      this.setState({ bridgeConnecting: false });
    }
  }

  disconnectFromBridge = () => {
    disconnectBridge();
    toast.info('Đã ngắt kết nối Bridge');
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
      isBridgeConnected: bridgeConnected,
      showPasswordModal,
      showChooseRefereeNoModal,
      showBridgeModal,
      bridgeUrl,
      bridgeConnecting,
      isShowFiveReferee,
      showSettingsMenu,
      showHelpModal
    } = this.state;

    return (
      <div className="fixed inset-0 flex flex-col bg-slate-100 overflow-hidden">
        {/* Loading Skeleton - full screen when no match data (z-20 so modals can overlay) */}
        {!gdMatch && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-100">
            {/* Skeleton Header */}
            <div className="bg-white shadow-md px-3 py-2 flex-shrink-0 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-slate-300 rounded-lg animate-pulse"></div>
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-6 w-14 bg-slate-200 rounded-lg animate-pulse"></div>
                </div>
                <div className="h-6 w-20 bg-slate-300 rounded-lg animate-pulse"></div>
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

        {/* Header - status dot LEFT, settings RIGHT */}
        <header className="bg-white shadow-md px-3 py-2 flex-shrink-0 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            {/* LEFT: Status dot + Arena, GĐ name, Match */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Connection Status Dot - 4 colors */}
              <span 
                className={`w-3 h-3 rounded-full block flex-shrink-0 ${
                  isInternetConnected && bridgeConnected ? 'bg-green-500' :
                  isInternetConnected ? 'bg-blue-500' :
                  bridgeConnected ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`}
              ></span>
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                {arenaName || '...'}
              </span>
              <span className="text-slate-700 font-semibold text-sm truncate">
                {gdName || '...'}
              </span>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                {gdMatch || '...'}
              </span>
            </div>
            {/* RIGHT: Settings menu */}
            <div className="relative flex-shrink-0">
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
                      onClick={() => this.setState({ showSettingsMenu: false, showBridgeModal: true })}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa-solid fa-network-wired text-slate-500"></i>
                      Kết nối LAN
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
          {/* Warning when both disconnected */}
          {!isInternetConnected && !bridgeConnected && (
            <div className="mt-2 bg-red-100 text-red-700 py-1 px-2 text-center text-xs font-medium rounded-lg border border-red-200">
              <i className="fa-solid fa-exclamation-triangle mr-1"></i>
              Không có kết nối - Không thể chấm điểm
            </div>
          )}
        </header>

        {/* Full-screen Scoring Area - takes all remaining space */}
        <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0 relative">
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

        {/* Bridge Connection Modal */}
        {showBridgeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-network-wired"></i>Kết nối LAN
                  </h5>
                  <button onClick={this.hideBridgeModal} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">IP:Port</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-base"
                    placeholder="192.168.1.100:9765"
                    value={bridgeUrl.replace('ws://', '')}
                    onChange={(e) => this.setState({ bridgeUrl: e.target.value })}
                    disabled={bridgeConnected}
                  />
                </div>

                {bridgeConnected && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-sm font-medium text-green-700">Đã kết nối</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 p-3 bg-slate-50 border-t">
                <button onClick={this.hideBridgeModal}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-medium">Đóng</button>
                {bridgeConnected ? (
                  <button onClick={this.disconnectFromBridge}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-500 text-white font-medium">Ngắt kết nối</button>
                ) : (
                  <button onClick={this.connectToBridge} disabled={bridgeConnecting}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                    {bridgeConnecting ? 'Đang kết nối...' : 'Kết nối'}
                  </button>
                )}
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
                {/* Keyboard Shortcuts Section */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-keyboard text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Phím tắt chấm điểm</span>
                  </div>
                  {/* Arrow keys visual */}
                  <div className="flex justify-center mb-3">
                    <div className="grid grid-cols-3 gap-1">
                      <div></div>
                      <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                        <span className="text-red-600 font-bold">↑</span>
                      </div>
                      <div></div>
                      <div className="w-10 h-10 bg-red-200 rounded flex items-center justify-center">
                        <span className="text-red-700 font-bold">←</span>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 font-bold">↓</span>
                      </div>
                      <div className="w-10 h-10 bg-blue-200 rounded flex items-center justify-center">
                        <span className="text-blue-700 font-bold">→</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                      <span className="text-red-700 font-medium">← +2 Đỏ | ↑ +1 Đỏ</span>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-blue-700 font-medium">→ +2 Xanh | ↓ +1 Xanh</span>
                    </div>
                  </div>
                  <div className="mt-2 text-center p-2 bg-slate-100 rounded-lg text-sm">
                    <span className="text-slate-600"><strong>Esc</strong> = Đóng cửa sổ đang mở</span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-slate-200 my-4"></div>

                {/* Status Dot Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-signal text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Trạng thái kết nối</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></span>
                      <span className="text-slate-600">Internet + LAN</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span>
                      <span className="text-slate-600">Chỉ Internet</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></span>
                      <span className="text-slate-600">Chỉ LAN</span>
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

        <ToastContainer position="top-center" autoClose={800} hideProgressBar />
      </div>
    );
  }
}

export default GiamDinhDoiKhangContainer;
