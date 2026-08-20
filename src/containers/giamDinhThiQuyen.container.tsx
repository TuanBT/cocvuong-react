import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, onValue, off, DatabaseReference, Database } from "firebase/database";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  showSettingsMenu: boolean;
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
      showSettingsMenu: false,
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

  _handleKeyDown = (e: KeyboardEvent) => {
    // ESC - Xóa input hoặc đóng modal
    if (e.which === 27) {
      const { showPasswordModal, showChooseRefereeNoModal, showHelpModal, showModalShortcut, refereeResultBox } = this.state;
      // Nếu có input, xóa input trước
      if (refereeResultBox && refereeResultBox !== '') {
        this.clearInput();
        return;
      }
      // Nếu không có input, đóng modal
      if (showPasswordModal) {
        this.setState({ showPasswordModal: false });
      } else if (showChooseRefereeNoModal) {
        this.setState({ showChooseRefereeNoModal: false });
      } else if (showHelpModal) {
        this.setState({ showHelpModal: false });
      } else if (showModalShortcut) {
        this.setState({ showModalShortcut: false });
      }
      return;
    }
    // Enter - Gửi điểm
    if (e.which === 13) {
      this.submitInput();
      return;
    }
    // . (Chấm) - Nhập dấu thập phân (keyCode 190 hoặc 110 cho numpad)
    if (e.which === 190 || e.which === 110) {
      this.input('.');
      return;
    }
    // 0-9 (keyboard và numpad)
    if (e.which >= 48 && e.which <= 57) {
      this.input(e.which - 48);
    } else if (e.which >= 96 && e.which <= 105) {
      // Numpad 0-9
      this.input(e.which - 96);
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

  input = (score: number | string) => {
    // Xử lý dấu thập phân
    if (score === '.') {
      if (this.refereeMartialScore.includes('.')) {
        return; // Đã có dấu thập phân rồi
      }
      this.refereeMartialScore += '.';
      this.setState({ refereeResultBox: this.refereeMartialScore || '00' });
      return;
    }
    
    // Kiểm tra độ dài (cho phép thêm 1 ký tự nếu có dấu thập phân)
    const maxLength = this.refereeMartialScore.includes('.') ? 4 : 2; // Ví dụ: 9.5 hoặc 99
    if (this.refereeMartialScore.replace('.', '').length >= 2) {
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
    
    // Gửi điểm lên Firebase
    update(ref(this.db, this.pathMartial), { "score": scoreValue });

    this.pathMartialScore = "tournament/" + this.tournamentNoIndex + "/martial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
    get(ref(this.db, this.pathMartialScore)).then((snapshot) => {
      const refereeMartialObj = snapshot.val();
      if (refereeMartialObj) {
        let finalScore = 0;
        let totalRefereeScore = 0;
        let minScore = refereeMartialObj.refereeMartial[0].score;
        let maxScore = refereeMartialObj.refereeMartial[0].score;
        
        for (let i = 0; i < this.numReferee; i++) {
          const score = refereeMartialObj.refereeMartial[i].score;
          totalRefereeScore += score;
          minScore = Math.min(minScore, score);
          maxScore = Math.max(maxScore, score);
        }
        
        if (this.numReferee === 5) {
          finalScore = totalRefereeScore - (minScore + maxScore);
        } else {
          finalScore = totalRefereeScore;
        }
        
        update(ref(this.db, this.pathMartialScore), { "finalScore": parseInt(String(finalScore)) });
      }
    });

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
      selectedTournament,
      selectedArena,
      selectedReferee,
      showSettingsMenu,
      showHelpModal,
      showModalShortcut
    } = this.state;

    return (
      <div className="giam-dinh-container bg-slate-100">
        {/* Loading Skeleton when no match data - covers entire screen */}
        {!matchMartialName && (
          <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-slate-100">
            {/* Skeleton Header */}
            <div className="bg-white shadow-md px-3 py-2 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                {/* LEFT skeleton - status dot + arena + match */}
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-slate-300 rounded-full animate-pulse"></div>
                  <div className="h-6 w-16 bg-slate-300 rounded-lg animate-pulse"></div>
                  <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
                </div>
                {/* RIGHT skeleton - Giám Định nổi bật + settings */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-24 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-lg animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            {/* Skeleton Body */}
            <div className="flex-1 flex flex-col p-2">
              {/* Score Display Skeleton */}
              <div className="bg-slate-400 rounded-2xl h-32 mb-2 flex-shrink-0 animate-pulse"></div>
              {/* Numpad Skeleton */}
              <div className="flex-1 grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                  <div key={i} className="bg-slate-300 rounded-xl animate-pulse"></div>
                ))}
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
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                {arenaName || '...'}
              </span>
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                {matchMartialName || '...'}{matchMartialNo ? ` - ${matchMartialNo}` : ''}
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

        {/* Full-screen Calculator - takes all remaining space */}
        <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
          {/* Score Display - compact for portrait mode */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg p-2 mb-2 flex-shrink-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg py-2 px-3">
              <p className="text-[15vw] sm:text-[12vw] md:text-[10vw] font-black text-white text-center tracking-wider drop-shadow-lg leading-none">
                {refereeResultBox}
              </p>
            </div>
          </div>

          {/* Numpad - fills ALL remaining space */}
          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
            {/* Row 1: 7, 8, 9 */}
            <button onClick={() => this.input(7)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">7</span>
            </button>
            <button onClick={() => this.input(8)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">8</span>
            </button>
            <button onClick={() => this.input(9)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">9</span>
            </button>
            
            {/* Row 2: 4, 5, 6 */}
            <button onClick={() => this.input(4)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">4</span>
            </button>
            <button onClick={() => this.input(5)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">5</span>
            </button>
            <button onClick={() => this.input(6)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">6</span>
            </button>
            
            {/* Row 3: 1, 2, 3 */}
            <button onClick={() => this.input(1)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">1</span>
            </button>
            <button onClick={() => this.input(2)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">2</span>
            </button>
            <button onClick={() => this.input(3)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">3</span>
            </button>
            
            {/* Row 4: Clear, 0, Submit */}
            <button onClick={this.clearInput}
              className="bg-red-500 text-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:brightness-110 active:shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]"
              style={{ minHeight: 0 }}>
              <i className="fa-regular fa-trash-can text-[7vw] sm:text-[5vw]"></i>
            </button>
            <button onClick={() => this.input(0)}
              className="bg-white rounded-xl shadow-md flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:bg-amber-100 active:shadow-[inset_0_0_20px_rgba(251,191,36,0.4)]"
              style={{ minHeight: 0 }}>
              <span className="text-[9vw] sm:text-[7vw] font-bold text-slate-700">0</span>
            </button>
            <button onClick={this.submitInput}
              className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-center touch-manipulation select-none transition-all duration-100 active:scale-[0.95] active:brightness-110 active:shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]"
              style={{ minHeight: 0 }}>
              <i className="fa-solid fa-check text-[7vw] sm:text-[5vw]"></i>
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
                  <button onClick={() => this.setState({ showPasswordModal: false })} className="text-white/80 hover:text-white transition-colors">
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
                <button onClick={() => this.setState({ showPasswordModal: false })}
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
                  <button onClick={() => this.setState({ showChooseRefereeNoModal: false })} className="text-white/80 hover:text-white transition-colors">
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
                        <input type="radio" name="tournamentRadio" checked={selectedTournament === i}
                          onChange={() => this.chooseTournament(i)} className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-slate-700">{tournament[1]}</span>
                      </label>
                    )) : <p className="text-slate-400 italic text-sm">Không có giải đấu</p>}
                  </div>
                </div>

                {/* Arena Selection */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sân thi đấu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="relative cursor-pointer">
                      <input type="radio" name="optionsArena" value="0" checked={selectedArena === 0}
                        onChange={() => this.handleArenaChange(0)} className="peer sr-only" />
                      <div className="p-3 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex flex-col items-center justify-center min-h-[60px]">
                        <i className="fa-solid fa-chess-board text-xl text-blue-500"></i>
                        <span className="font-bold text-sm text-slate-700 mt-1">Sân A</span>
                      </div>
                    </label>
                    <label className="relative cursor-pointer">
                      <input type="radio" name="optionsArena" value="1" checked={selectedArena === 1}
                        onChange={() => this.handleArenaChange(1)} className="peer sr-only" />
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
                    {[1, 2, 3].map((num) => (
                      <label key={num} className="relative cursor-pointer">
                        <input type="radio" name="optionsReferee" value={num} checked={selectedReferee === num}
                          onChange={() => this.handleRefereeChange(num)} className="peer sr-only" />
                        <div className="p-2 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex items-center justify-center min-h-[40px]">
                          <span className="font-bold text-sm text-slate-700">GĐ{num}</span>
                        </div>
                      </label>
                    ))}
                    {isShowFiveReferee && [4, 5].map((num) => (
                      <label key={num} className="relative cursor-pointer">
                        <input type="radio" name="optionsReferee" value={num} checked={selectedReferee === num}
                          onChange={() => this.handleRefereeChange(num)} className="peer sr-only" />
                        <div className="p-2 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex items-center justify-center min-h-[40px]">
                          <span className="font-bold text-sm text-slate-700">GĐ{num}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 p-3 bg-slate-50 border-t sticky bottom-0">
                <button onClick={() => this.setState({ showChooseRefereeNoModal: false })}
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
                {/* Number Input */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-calculator text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Nhập điểm</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="flex gap-1">
                      {['0','1','2','3'].map(n => (
                        <span key={n} className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-sm font-bold text-slate-600">{n}</span>
                      ))}
                      <span className="w-8 h-8 flex items-center justify-center text-slate-400">...</span>
                      <span className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-sm font-bold text-slate-600">9</span>
                      <span className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-sm font-bold text-slate-600">.</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Dùng bàn phím số hoặc numpad</p>
                </div>
                
                {/* Actions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-check-double text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Thao tác</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                      <span className="min-w-12 h-8 px-2 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold">Enter</span>
                      <span className="text-green-700 text-sm">Gửi điểm</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                      <span className="min-w-10 h-8 px-2 bg-red-500 text-white rounded flex items-center justify-center text-xs font-bold">Esc</span>
                      <span className="text-red-700 text-sm">Xóa / Đóng</span>
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

export default GiamDinhThiQuyenContainer;
