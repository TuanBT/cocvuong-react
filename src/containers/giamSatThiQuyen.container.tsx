import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, child, onValue, Database, DatabaseReference, off } from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/Reg.mp3';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { subscribeToGiamDinhPresence, PresenceData } from '../services/firebaseService';
import { connectBridgeAsGiamSat, isBridgeConnected, onBridgeConnectionChange, onBridgeClientsChange, disconnectBridge } from '../utils/scoreSync';

// Interfaces for martial data
interface MartialFighterData {
  fighter: {
    name: string;
    code: string;
    country: string;
  };
}

interface RefereeMartialScore {
  score: number;
}

interface MartialTeamData {
  no: number;
  finalScore: number;
  fighters: MartialFighterData[];
  refereeMartial: RefereeMartialScore[];
}

interface MartialMatchData {
  match: {
    name: string;
  };
  team: MartialTeamData[];
}

interface LastMatchMartialData {
  matchMartialNo: number;
  teamMartialNo: number;
}

interface TournamentSettingData {
  tournamentName: string;
  martial: {
    isShowArenaB: boolean;
    isShowCountryFlag: boolean;
    isShowFiveReferee: boolean;
  };
}

interface TournamentData {
  setting: TournamentSettingData;
}

// Props and State interfaces
interface GiamSatThiQuyenProps {}

interface GiamSatThiQuyenState {
  data: any;
  password: string;
  tournamentName: string;
  arenaName: string;
  matchMartialName: string;
  matchMartialNo: string;
  matchMartialCode: string;
  matchMartialTeam: MartialFighterData[];
  averageScore: string;
  refereeScores: string[];
  matchTime: string;
  timerBgColor: string;
  refereeResultBox: string;
  confirmModalTitle: string;
  confirmModalBody: string;
  isInternetConnected: boolean;
  showPasswordModal: boolean;
  showChooseArenaNoModal: boolean;
  showTakeMainScoreModal: boolean;
  showModalConfirm: boolean;
  showModalShortcut: boolean;
  showModalChooseMatch: boolean;
  showQuickMenu: boolean;
  matchChooseValue: string;
  isShowFiveReferee: boolean;
  isShowCountryFlag: boolean;
  selectedTournament: number;
  selectedArena: number;
  specScoreWidth: string;
  // Connection status tracking
  refereeInternetStatus: boolean[];
  refereeLanStatus: boolean[];
  isBridgeConnected: boolean;
  showBridgeModal: boolean;
  bridgeUrl: string;
  bridgeConnecting: boolean;
  showHelpModal: boolean;
}

class GiamSatThiQuyenContainer extends Component<GiamSatThiQuyenProps, GiamSatThiQuyenState> {
  // Firebase related
  db: Database;
  firebaseListeners: DatabaseReference[];
  pathMartial: string;

  // Round labels
  fistRound: string;
  breakRound: string;
  secondRound: string;
  breakExtraRound: string;
  extraRound: string;

  // Colors
  greenColor: string;
  yellowColor: string;
  redColor: string;
  grayColor: string;
  whiteColor: string;
  blackColor: string;
  orangeColor: string;
  bodyBgColor: string;
  silverColor: string;

  // Settings
  timeScore: number;
  numReferee: number;

  // Timer related
  timerCoundown: number;
  round: string;
  timer: ReturnType<typeof setInterval> | false;
  effectTimer: ReturnType<typeof setInterval> | undefined;
  scoreTimer: ReturnType<typeof setInterval> | undefined;
  isTimerRunning: boolean;
  scoreTimerCount: number;
  minutes: string;
  seconds: string;

  // Match related
  matchNoCurrent: number | undefined;
  matchNoCurrentIndex: number;
  teamNoCurrentIndex: number;
  tournamentObj: TournamentData[] | null;
  settingObj: TournamentSettingData | null;
  refereeObj: any;
  lastMatchObj: any;
  match: any;
  soundRef: RefObject<HTMLAudioElement>;
  isFirstRefereeScore: boolean;
  temporaryWin: any;
  tournaments: [number, string][];

  // Martial related
  martialObj: MartialMatchData[] | null;
  matchMartial: any;
  teamMartial: MartialTeamData | null;
  matchMartialNoCurrent: number;
  teamMartialNoCurrent: number;
  theFirstTeamOfMatch: boolean;
  theLastTeamOfMatch: boolean;
  refereeMartialScore: string;
  martialArenaNoIndex: number | string;
  tournamentNoIndex: number;

  // Connection tracking cleanup functions
  firebasePresenceCleanup: (() => void) | null;
  bridgeConnectionCleanup: (() => void) | null;
  bridgeClientsCleanup: (() => void) | null;
  arenaNo: string;

  // Refs
  tournamentNameRef: RefObject<HTMLSpanElement>;

  // Constants
  tournamentConst: {
    lastMatch: { no: number };
    referee: { redScore: number; blueScore: number }[];
    tournament: any[];
  };
  matchObj: {
    match: { no: number; type: string; category: string; win: string };
    fighters: {
      redFighter: { name: string; code: string; score: number };
      blueFighter: { name: string; code: string; score: number };
    };
  };
  martialConst: {
    lastMatchMartial: { matchMartialNo: number; teamMartialNo: number };
    martial: any[];
  };
  matchMartialObj: {
    match: { name: string };
    team: any[];
  };
  fightersMartialObj: {
    fighters: any[];
    no: number;
    finalScore: number;
    refereeMartial: { score: number }[];
  };

  constructor(props: GiamSatThiQuyenProps) {
    document.title = 'Giám Sát Thi Quyền';
    super(props);
    this.db = database;
    this.firebaseListeners = [];
    this.pathMartial = '';

    this.fistRound = "Hiệp 1";
    this.breakRound = "Nghỉ giữa hiệp";
    this.secondRound = "Hiệp 2";
    this.breakExtraRound = "Nghỉ hiệp phụ";
    this.extraRound = "Hiệp phụ";
    this.greenColor = "#27ae60";
    this.yellowColor = "#f1c40f";
    this.redColor = "#e74c3c";
    this.grayColor = "#95a5a6";
    this.whiteColor = "#ffffff";
    this.blackColor = "#000000";
    this.orangeColor = "#e67e22";
    this.bodyBgColor = "#ecf0f1";
    this.silverColor = "#bdc3c7";
    this.timeScore = 4;
    this.numReferee = 3;

    this.timerCoundown = 0;
    this.round = this.fistRound;
    this.matchNoCurrent = undefined;
    this.matchNoCurrentIndex = 0;
    this.teamNoCurrentIndex = 0;
    this.tournamentObj = null;
    this.settingObj = null;
    this.refereeObj = null;
    this.lastMatchObj = null;
    this.match = null;
    this.timer = false;
    this.effectTimer = undefined;
    this.scoreTimer = undefined;
    this.soundRef = createRef();
    this.isFirstRefereeScore = false;
    this.isTimerRunning = false;
    this.scoreTimerCount = this.timeScore;
    this.temporaryWin = null;
    this.numReferee = 3;
    this.tournaments = [];
    this.minutes = '00';
    this.seconds = '00';

    this.martialObj = null;
    this.matchMartial = null;
    this.teamMartial = null;
    this.matchMartialNoCurrent = 1;
    this.teamMartialNoCurrent = 1;
    this.theFirstTeamOfMatch = false;
    this.theLastTeamOfMatch = false;
    this.refereeMartialScore = '';
    this.martialArenaNoIndex = 0;
    this.tournamentNoIndex = 0;

    // Connection tracking
    this.firebasePresenceCleanup = null;
    this.bridgeConnectionCleanup = null;
    this.bridgeClientsCleanup = null;
    this.arenaNo = 'A';

    this.tournamentNameRef = createRef();

    this.tournamentConst = { "lastMatch": { "no": 1 }, "referee": [{ "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }], "tournament": [] };
    this.matchObj = { "match": { "no": 1, "type": "", "category": "", "win": "" }, "fighters": { "redFighter": { "name": "Đỏ", "code": "", "score": 0 }, "blueFighter": { "name": "Xanh", "code": "", "score": 0 } } };
    this.martialConst = { "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 }, "martial": [] };
    this.matchMartialObj = { "match": { "name": "" }, "team": [] };
    this.fightersMartialObj = { "fighters": [], "no": 0, "finalScore": 0, "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }] };

    this.state = {
      data: null,
      password: '',
      tournamentName: '',
      arenaName: '',
      matchMartialName: '',
      matchMartialNo: '',
      matchMartialCode: '',
      matchMartialTeam: [],
      averageScore: '000',
      refereeScores: ['00', '00', '00', '00', '00'],
      matchTime: '00:00',
      timerBgColor: this.silverColor,
      refereeResultBox: '000',
      confirmModalTitle: '',
      confirmModalBody: '',
      isInternetConnected: true,
      showPasswordModal: true,
      showChooseArenaNoModal: false,
      showTakeMainScoreModal: false,
      showModalConfirm: false,
      showModalShortcut: false,
      showModalChooseMatch: false,
      showQuickMenu: false,
      matchChooseValue: '',
      isShowFiveReferee: false,
      isShowCountryFlag: false,
      selectedTournament: 0,
      selectedArena: 0,
      specScoreWidth: '',
      // Connection status
      refereeInternetStatus: [false, false, false, false, false],
      refereeLanStatus: [false, false, false, false, false],
      isBridgeConnected: false,
      showBridgeModal: false,
      bridgeUrl: localStorage.getItem('bridgeUrl') || '',
      bridgeConnecting: false,
      showHelpModal: false
    };
  }

  // Method to choose match directly
  chooseMatch = (): void => {
    const { matchChooseValue } = this.state;
    const matchNo = parseInt(matchChooseValue, 10);
    if (matchNo > 0 && this.martialObj) {
      // Find match index
      for (let i = 0; i < this.martialObj.length; i++) {
        const match = this.martialObj[i];
        if (match.team) {
          for (let j = 0; j < match.team.length; j++) {
            if (match.team[j].no === matchNo) {
              this.matchMartialNoCurrent = i;
              this.teamMartialNoCurrent = j;
              this.showMartialInfo();
              this.setState({ showModalChooseMatch: false, matchChooseValue: '' });
              return;
            }
          }
        }
      }
      toast.error('Không tìm thấy trận đấu!');
    }
  }

  // ============ Connection Tracking Methods ============

  subscribeFirebasePresence = (): void => {
    if (this.firebasePresenceCleanup) {
      this.firebasePresenceCleanup();
    }

    const arena = this.arenaNo || 'A';
    this.firebasePresenceCleanup = subscribeToGiamDinhPresence(
      arena,
      this.tournamentNoIndex,
      (presenceList: PresenceData[]) => {
        const newInternetStatus = [false, false, false, false, false];
        presenceList.forEach((presence) => {
          const gdIndex = presence.refereeIndex;
          if (gdIndex >= 0 && gdIndex < 5) {
            newInternetStatus[gdIndex] = true;
          }
        });
        this.setState({ refereeInternetStatus: newInternetStatus });
      }
    );
  }

  autoConnectBridge = async (): Promise<void> => {
    const savedUrl = localStorage.getItem('bridgeUrl');
    if (savedUrl && !isBridgeConnected()) {
      try {
        const arena = this.arenaNo || 'A';
        const name = `Giám Sát TQ`;
        const success = await connectBridgeAsGiamSat(savedUrl, arena, this.tournamentNoIndex, name);
        if (success) {
          toast.success('Đã tự động kết nối LAN!', { autoClose: 2000 });
        }
      } catch (err) {
        // Silent fail
      }
    }
  }

  setupBridgeListeners = (): void => {
    // Listen for Bridge connection changes
    this.bridgeConnectionCleanup = onBridgeConnectionChange((connected) => {
      this.setState({ isBridgeConnected: connected });
    });

    // Listen for clients list changes to track LAN status
    const arena = this.arenaNo || 'A';
    this.bridgeClientsCleanup = onBridgeClientsChange((clients) => {
      const newLanStatus = [false, false, false, false, false];
      clients.forEach((client: any) => {
        if (
          client.type === 'giam_dinh' &&
          client.arena === arena &&
          client.tournament === this.tournamentNoIndex
        ) {
          const gdIndex = client.gdIndex;
          if (gdIndex >= 0 && gdIndex < 5) {
            newLanStatus[gdIndex] = true;
          }
        }
      });
      this.setState({ refereeLanStatus: newLanStatus });
    });
  }

  showBridgeModal = (): void => {
    this.setState({ showBridgeModal: true });
  }

  hideBridgeModal = (): void => {
    this.setState({ showBridgeModal: false });
  }

  connectToBridge = async (): Promise<void> => {
    const { bridgeUrl } = this.state;
    if (!bridgeUrl) {
      toast.error('Vui lòng nhập địa chỉ kết nối!');
      return;
    }

    this.setState({ bridgeConnecting: true });
    try {
      const url = bridgeUrl.startsWith('ws://') ? bridgeUrl : `ws://${bridgeUrl}`;
      const arena = this.arenaNo || 'A';
      const name = `Giám Sát TQ Sân ${arena}`;
      const success = await connectBridgeAsGiamSat(url, arena, this.tournamentNoIndex, name);
      
      if (success) {
        localStorage.setItem('bridgeUrl', url);
        this.setState({ showBridgeModal: false });
        toast.success('Đã kết nối LAN!');
      } else {
        toast.error('Không thể kết nối. Kiểm tra địa chỉ và thử lại.');
      }
    } catch (err) {
      toast.error('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      this.setState({ bridgeConnecting: false });
    }
  }

  disconnectFromBridge = (): void => {
    disconnectBridge();
    this.setState({ isBridgeConnected: false });
    toast.info('Đã ngắt kết nối LAN');
  }

  // ============ End Connection Tracking Methods ============

  componentDidMount(): void {
    document.addEventListener("keydown", this._handleKeyDown);
    window.onresize = this.resizeTextToFit;
    
    // Check for saved password in localStorage (valid for 6 hours)
    const savedPassword = localStorage.getItem('giamSatPassword');
    const savedTime = localStorage.getItem('giamSatPasswordTime');
    if (savedPassword && savedTime) {
      const timeDiff = Date.now() - parseInt(savedTime);
      const sixHours = 6 * 60 * 60 * 1000;
      if (timeDiff < sixHours) {
        // Auto verify saved password
        this.setState({ password: savedPassword }, () => {
          this.autoVerifyPassword(savedPassword);
        });
        return;
      } else {
        // Clear expired password
        localStorage.removeItem('giamSatPassword');
        localStorage.removeItem('giamSatPasswordTime');
      }
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener("keydown", this._handleKeyDown);
    this.firebaseListeners.forEach(listenerRef => {
      off(listenerRef);
    });
    this.firebaseListeners = [];
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Cleanup connection tracking
    if (this.firebasePresenceCleanup) {
      this.firebasePresenceCleanup();
    }
    if (this.bridgeConnectionCleanup) {
      this.bridgeConnectionCleanup();
    }
    if (this.bridgeClientsCleanup) {
      this.bridgeClientsCleanup();
    }
  }

  autoVerifyPassword = (savedPassword: string): void => {
    onValue(ref(this.db, 'commonSetting/passwordGiamSat'), (snapshot) => {
      if (savedPassword === String(snapshot.val())) {
        this.setState({ showPasswordModal: false });
        this.main();
      } else {
        // Password changed, clear and show modal
        localStorage.removeItem('giamSatPassword');
        localStorage.removeItem('giamSatPasswordTime');
        this.setState({ password: '', showPasswordModal: true });
      }
    }, { onlyOnce: true });
  }

  verifyPassword = (): void => {
    const { password } = this.state;

    if (password != null && password !== "") {
      onValue(ref(this.db, 'commonSetting/passwordGiamSat'), (snapshot) => {
        if (password === String(snapshot.val())) {
          // Save password to localStorage for 6 hours
          localStorage.setItem('giamSatPassword', password);
          localStorage.setItem('giamSatPasswordTime', Date.now().toString());
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

  main(): void {
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
      if (this.settingObj && this.settingObj.martial.isShowArenaB === true) {
        this.setState({ showChooseArenaNoModal: true });
      } else {
        // Single arena - setup connection tracking
        this.arenaNo = 'A';
        this.subscribeFirebasePresence();
        this.setupBridgeListeners();
        this.autoConnectBridge();
        
        this.showMartialInfo();
      }
    });
  }

  chooseArenaNo = (): void => {
    const { selectedArena } = this.state;
    this.setState({ showChooseArenaNoModal: false });
    this.martialArenaNoIndex = selectedArena;
    this.arenaNo = selectedArena === 0 ? 'A' : 'B';
    
    // Subscribe to connection tracking
    this.subscribeFirebasePresence();
    this.setupBridgeListeners();
    this.autoConnectBridge();
    
    this.showMartialInfo();
  }

  chooseTournament = (tournamentNoIndex: number): void => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.setState({ selectedTournament: tournamentNoIndex });
  }

  showMartialInfo = (): void => {
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/martialArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });
    
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      if (this.settingObj) {
        this.setState({ tournamentName: this.settingObj.tournamentName });
      }
      this.resizeTextToFit();
      const isShowFiveReferee = this.settingObj?.martial.isShowFiveReferee ?? false;
      const isShowCountryFlag = this.settingObj?.martial.isShowCountryFlag ?? false;
      this.setState({ 
        isShowFiveReferee,
        isShowCountryFlag,
        specScoreWidth: isShowFiveReferee ? '4.1%' : ''
      });
      if (isShowFiveReferee) {
        this.numReferee = 5;
      }
    });
    
    get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/lastMatchMartial')).then((snapshot) => {
      const lastMatchMartialObj: LastMatchMartialData = snapshot.val();
      this.matchMartialNoCurrent = lastMatchMartialObj.matchMartialNo;
      this.teamMartialNoCurrent = lastMatchMartialObj.teamMartialNo;

      const martialRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martial');
      this.firebaseListeners.push(martialRef);
      onValue(martialRef, (snapshot) => {
        this.initVariable(snapshot);
        this.showValue();
      });

      // Kiểm tra kết nối internet
      const connectedRef = ref(this.db, '.info/connected');
      this.firebaseListeners.push(connectedRef);
      onValue(connectedRef, (snapshot) => {
        this.setState({ isInternetConnected: snapshot.val() === true });
      });
    });
  }

  _handleKeyDown = (e: KeyboardEvent): void => {
    // ESC - Đóng modal đang mở
    if (e.which === 27) {
      const { showPasswordModal, showChooseArenaNoModal, showModalChooseMatch, showModalConfirm, showTakeMainScoreModal, showBridgeModal, showHelpModal } = this.state;
      if (showPasswordModal) {
        this.setState({ showPasswordModal: false });
      } else if (showChooseArenaNoModal) {
        this.setState({ showChooseArenaNoModal: false });
      } else if (showModalChooseMatch) {
        this.setState({ showModalChooseMatch: false });
      } else if (showModalConfirm) {
        this.setState({ showModalConfirm: false });
      } else if (showTakeMainScoreModal) {
        this.setState({ showTakeMainScoreModal: false });
      } else if (showBridgeModal) {
        this.hideBridgeModal();
      } else if (showHelpModal) {
        this.setState({ showHelpModal: false });
      }
      return;
    }
    // Space - Bắt đầu/Dừng đồng hồ
    if (e.which === 32) {
      this.startTimer();
    }
    // Left arrow - Lùi trận
    if (e.which === 37) {
      this.prevMatchMartial();
    }
    // Right arrow - Tiến trận
    if (e.which === 39) {
      this.nextMatchMartial();
    }
    // C - Mở modal chọn trận
    if (e.which === 67) {
      this.setState({ showModalChooseMatch: true });
    }
    // S - Mở modal chấm điểm tổng
    if (e.which === 83) {
      this.setState({ showTakeMainScoreModal: true });
    }
    // R - Reset timer
    if (e.which === 82) {
      this.resetTimer();
    }
    // Enter - Xác nhận điểm (nếu modal chấm điểm đang mở)
    if (e.which === 13) {
      const { showTakeMainScoreModal } = this.state;
      if (showTakeMainScoreModal) {
        this.submitInput();
      }
    }
  }

  initVariable(snapshot: any): void {
    this.martialObj = snapshot.val();
    if (!this.martialObj) return;

    if (this.matchMartialNoCurrent > this.martialObj.length) {
      this.matchMartialNoCurrent = this.martialObj.length;
    }
    if (this.matchMartialNoCurrent < 1) {
      this.matchMartialNoCurrent = 1;
    }
    this.matchNoCurrentIndex = this.matchMartialNoCurrent - 1;
    this.teamNoCurrentIndex = this.teamMartialNoCurrent - 1;
    this.theLastTeamOfMatch = false;
    if (this.teamMartialNoCurrent > this.martialObj[this.matchNoCurrentIndex].team.length) {
      this.teamMartialNoCurrent = this.martialObj[this.matchNoCurrentIndex].team.length;
      this.teamNoCurrentIndex = this.teamMartialNoCurrent - 1;
    }
    if (this.teamMartialNoCurrent === this.martialObj[this.matchNoCurrentIndex].team.length) {
      this.theLastTeamOfMatch = true;
    }
    this.theFirstTeamOfMatch = false;
    if (this.teamMartialNoCurrent < 1) {
      this.teamMartialNoCurrent = 1;
      this.teamNoCurrentIndex = this.teamMartialNoCurrent - 1;
    }
    if (this.teamMartialNoCurrent === 1) {
      this.theFirstTeamOfMatch = true;
    }
    this.teamMartial = this.martialObj[this.matchNoCurrentIndex].team[this.teamNoCurrentIndex];
  }

  pad(number: number, size: number): string {
    let paddedNumber = String(number);
    while (paddedNumber.length < size) {
      paddedNumber = "0" + paddedNumber;
    }
    return paddedNumber;
  }

  showValue(): void {
    if (!this.martialObj || !this.teamMartial || !this.settingObj) return;

    const currentMatch = this.martialObj[this.matchMartialNoCurrent - 1];
    const currentTeam = currentMatch.team[this.teamMartialNoCurrent - 1];

    // Update referee scores
    const refereeScores: string[] = [];
    for (let i = 0; i < 5; i++) {
      refereeScores.push(this.pad(currentTeam.refereeMartial[i]?.score || 0, 2));
    }

    this.setState({
      matchMartialName: currentMatch.match.name,
      matchMartialNo: String(currentTeam.no),
      matchMartialCode: this.teamMartial.fighters[0].fighter.code,
      matchMartialTeam: this.teamMartial.fighters,
      refereeScores,
      averageScore: this.pad(currentTeam.finalScore, 3),
      isShowCountryFlag: this.settingObj.martial.isShowCountryFlag
    });
  }

  nextMatchMartial = (): void => {
    if (!this.martialObj) return;

    if (this.matchMartialNoCurrent === this.martialObj.length && this.teamMartialNoCurrent === this.martialObj[this.matchMartialNoCurrent - 1].team.length) {
      return;
    }

    this.teamMartialNoCurrent++;
    if (this.theLastTeamOfMatch) {
      this.matchMartialNoCurrent++;
      this.teamMartialNoCurrent = 1;
    }
    this.restoreMatch();
  }

  prevMatchMartial = (): void => {
    if (!this.martialObj) return;

    if (this.matchMartialNoCurrent === 1 && this.teamMartialNoCurrent === 1) {
      return;
    }

    this.teamMartialNoCurrent--;
    if (this.theFirstTeamOfMatch) {
      this.matchMartialNoCurrent--;
      this.teamMartialNoCurrent = this.martialObj[this.matchMartialNoCurrent - 1].team.length;
    }
    this.restoreMatch();
  }

  restoreMatch(): void {

    set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/lastMatchMartial'), {
      "matchMartialNo": this.matchMartialNoCurrent,
      "teamMartialNo": this.teamMartialNoCurrent
    });

    this.stopTimer();
    this.timerCoundown = 0;
    this.setState({ 
      timerBgColor: this.silverColor,
      matchTime: '00:00'
    });

    get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/martial')).then((snapshot) => {
      this.initVariable(snapshot);
      this.showValue();
    });

  }

  takeMainScore = (): void => {
    this.setState({ showTakeMainScoreModal: true });
  }

  input = (score: string): void => {
    if (this.refereeMartialScore.length === 3) {
      toast.error("Chỉ nhập điểm từ 0 đến 999");
      return;
    }
    this.refereeMartialScore += score;
    this.setState({ refereeResultBox: this.refereeMartialScore || '000' });
  }

  clearInput = (): void => {
    this.refereeMartialScore = "";
    this.setState({ refereeResultBox: '000' });
  }

  submitInput = (): void => {
    this.setState({
      confirmModalTitle: "Xác nhận việc ghi đè điểm tổng",
      confirmModalBody: "<b>Lưu ý:</b> Việc ghi đè điểm tổng sẽ chuyển điểm tất cả giám định về 00!",
      showModalConfirm: true
    });
  }

  confirmSubmit = (): void => {
    if (parseInt(this.refereeMartialScore) > 999) {
      this.refereeMartialScore = "";
    }
    this.pathMartial = "tournament/" + this.tournamentNoIndex + "/martial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
    update(ref(this.db, this.pathMartial), { "finalScore": parseInt(this.refereeMartialScore) || 0 });
    update(ref(this.db, this.pathMartial), { "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }] });
    this.refereeMartialScore = "";
    this.setState({ 
      refereeResultBox: '000',
      showTakeMainScoreModal: false,
      showModalConfirm: false
    });
    toast.success("Chấm điểm thành công!");
  }

  showShortcut = (): void => {
    this.setState({ showModalShortcut: true });
  }

  startTimer = (): void => {
    if (this.timer) {
      this.stopTimer();
      this.setState({ timerBgColor: this.yellowColor });
    } else {
      this.timer = setInterval(() => { this.makeTimer(); }, 1000);
      this.isTimerRunning = true;
      this.setState({ timerBgColor: this.greenColor });
      this.playSound();
    }
  }

  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = false;
    this.isTimerRunning = false;
  }

  resetTimer = (): void => {
    // Dừng timer nếu đang chạy
    this.stopTimer();
    // Reset về 00:00
    this.timerCoundown = 0;
    this.minutes = "00";
    this.seconds = "00";
    this.setState({ 
      matchTime: "00:00",
      timerBgColor: this.silverColor
    });
  }

  makeTimer(): void {

    this.timerCoundown++;

    const minutes = Math.floor(this.timerCoundown / 60);
    const seconds = Math.floor(this.timerCoundown - (minutes * 60));
    this.minutes = minutes < 10 ? "0" + minutes : String(minutes);
    this.seconds = seconds < 10 ? "0" + seconds : String(seconds);

    this.setState({ matchTime: this.minutes + ":" + this.seconds });
  }

  playSound(): void {
    const soundElement = this.soundRef.current;
    if (soundElement) {
      if (soundElement.paused) {
        soundElement.play();
      } else {
        soundElement.currentTime = 0;
      }
      soundElement.play();
    }
  }

  inputPw = (value: string): void => {
    if (value === "-1") {
      this.setState({ password: '' });
    } else {
      this.setState(prevState => ({ 
        password: prevState.password + value 
      }));
    }
  }

  resizeTextToFit = (): void => {
    const parentDiv = document.getElementsByClassName('style-hd-info')[0] as HTMLElement;
    const span = this.tournamentNameRef.current;
    if (!parentDiv || !span) return;

    let fontSize = 10;
    span.style.fontSize = fontSize + 'px';

    while (span.offsetHeight < parentDiv.offsetHeight && fontSize < 100) {
      fontSize++;
      span.style.fontSize = fontSize + 'px';
    }

    while (span.offsetHeight > parentDiv.offsetHeight && fontSize > 0) {
      fontSize--;
      span.style.fontSize = fontSize + 'px';
    }
  }

  handleArenaChange = (arenaIndex: number) => {
    this.setState({ selectedArena: arenaIndex });
  }

  render(): React.ReactNode {
    const {
      password,
      tournamentName,
      arenaName,
      matchMartialName,
      matchMartialNo,
      matchMartialCode,
      matchMartialTeam,
      averageScore,
      refereeScores,
      matchTime,
      timerBgColor,
      refereeResultBox,
      confirmModalTitle,
      confirmModalBody,
      isInternetConnected,
      showPasswordModal,
      showChooseArenaNoModal,
      showTakeMainScoreModal,
      showModalConfirm,
      showModalShortcut,
      showModalChooseMatch,
      showQuickMenu,
      matchChooseValue,
      isShowFiveReferee,
      isShowCountryFlag,
      selectedTournament,
      selectedArena,
      specScoreWidth,
      refereeInternetStatus,
      refereeLanStatus,
      isBridgeConnected: bridgeConnected,
      showBridgeModal,
      bridgeUrl,
      bridgeConnecting,
      showHelpModal
    } = this.state;

    // Helper function to get connection status dot color and title
    const getConnectionStatus = (refereeIndex: number) => {
      const hasInternet = refereeInternetStatus[refereeIndex];
      const hasLan = refereeLanStatus[refereeIndex];
      
      if (hasInternet && hasLan) {
        return { color: 'bg-green-500', title: 'Internet + LAN' };
      } else if (hasInternet && !hasLan) {
        return { color: 'bg-blue-500', title: 'Chỉ Internet' };
      } else if (!hasInternet && hasLan) {
        return { color: 'bg-yellow-500', title: 'Chỉ LAN (backup)' };
      } else {
        return { color: 'bg-gray-400', title: 'Mất kết nối' };
      }
    };

    // Get country flag for first fighter
    let countryFlag = '';
    if (matchMartialTeam.length > 0 && matchMartialTeam[0].fighter.country && isShowCountryFlag) {
      try {
        countryFlag = require('../assets/flag/' + matchMartialTeam[0].fighter.country + '.jpg');
      } catch (e) {
        countryFlag = '';
      }
    }

    // Calculate fighter name font size based on number of fighters
    const fighterCount = matchMartialTeam.length;
    const fighterFontSize = fighterCount <= 1 ? 'text-[4vh]' : fighterCount <= 2 ? 'text-[3.5vh]' : 'text-[2.8vh]';

    // Process tournament name - replace <br>, </br>, <br/> with actual line breaks
    const processedTournamentName = tournamentName
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/br>/gi, '\n');

    // Build match list for dropdown with fighter names
    const matchList: { matchIndex: number; teamIndex: number; no: number; name: string; code: string; fighters: string[] }[] = [];
    if (this.martialObj) {
      this.martialObj.forEach((match: any, mi: number) => {
        if (match.team) {
          match.team.forEach((team: any, ti: number) => {
            // Get fighter names
            const fighters: string[] = [];
            if (team.fighters) {
              team.fighters.forEach((f: any) => {
                if (f.fighter && f.fighter.name) {
                  fighters.push(f.fighter.name);
                }
              });
            }
            matchList.push({
              matchIndex: mi,
              teamIndex: ti,
              no: team.no,
              name: match.match?.name || match.name || '',
              code: team.code || '',
              fighters
            });
          });
        }
      });
    }

    // Group matches by content name for dropdown
    const matchGroups: { [key: string]: { matchIndex: number; teamIndex: number; no: number; code: string; fighters: string[] }[] } = {};
    matchList.forEach(m => {
      const key = m.name || 'Không xác định';
      if (!matchGroups[key]) matchGroups[key] = [];
      matchGroups[key].push({ matchIndex: m.matchIndex, teamIndex: m.teamIndex, no: m.no, code: m.code, fighters: m.fighters });
    });

    return (
      <div className="h-screen w-screen bg-slate-100 flex flex-col overflow-hidden relative">
        {/* Loading Skeleton when no match data - covers entire screen */}
        {(!matchMartialNo || matchMartialNo === '') && (
          <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-slate-100">
            {/* Skeleton Header */}
            <div className="bg-white border-b border-slate-200 py-2 px-4 flex items-center justify-between" style={{ minHeight: '5%' }}>
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 bg-slate-300 rounded"></div>
                <div className="h-5 w-48 bg-slate-200 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-20 bg-slate-200 rounded"></div>
              </div>
            </div>
            {/* Skeleton Body */}
            <div className="flex-1 p-3 flex flex-col gap-2">
              {/* Skeleton Row 1: Match Name & Timer (12%) */}
              <div className="flex items-stretch gap-3" style={{ height: '12%' }}>
                <div className="flex-1 bg-slate-300 rounded-xl"></div>
                <div className="bg-slate-300 rounded-xl" style={{ width: '12%' }}></div>
              </div>
              {/* Skeleton Row 2: Team Code (10%) */}
              <div className="bg-slate-400 rounded-xl" style={{ height: '10%' }}></div>
              {/* Skeleton Row 3: Fighter Names (14%) */}
              <div className="bg-slate-300 rounded-xl" style={{ height: '14%' }}></div>
              {/* Skeleton Row 4: Main Score (47%) */}
              <div className="bg-slate-500 rounded-2xl" style={{ height: '47%' }}></div>
              {/* Skeleton Row 5: Referee Scores (10%) */}
              <div className="flex items-stretch gap-2" style={{ height: '10%' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex-1 bg-slate-300 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Header - Tournament Info */}
        <div className="bg-white border-b border-slate-200 text-slate-800 px-4 py-2 flex items-center justify-between" style={{ minHeight: '5%' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Connection Status Dot - 4 colors */}
            <span 
              className={`w-3 h-3 rounded-full block flex-shrink-0 ${
                isInternetConnected && bridgeConnected ? 'bg-green-500' :
                isInternetConnected ? 'bg-blue-500' :
                bridgeConnected ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}
            ></span>
            <a href="#" onClick={this.showShortcut} className="flex-shrink-0">
              <img src={logo} alt="logo" className="h-8" />
            </a>
            <span className="text-[2vh] font-bold whitespace-pre-line leading-tight" ref={this.tournamentNameRef}>{processedTournamentName}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="bg-slate-200 px-4 py-1.5 rounded font-bold text-base">{arenaName}</span>
            {/* Quick Menu Button */}
            <div className="relative">
              <button 
                onClick={() => this.setState({ showQuickMenu: !showQuickMenu })}
                className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
              >
                <i className="fa fa-cog text-sm"></i>
              </button>
              {showQuickMenu && (
                <>
                  {/* Overlay to close menu when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => this.setState({ showQuickMenu: false })}
                  ></div>
                  <div className="absolute right-0 top-10 bg-white rounded-lg shadow-xl border border-slate-200 py-2 min-w-[200px] z-50">
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false, showModalChooseMatch: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-list text-slate-400"></i>
                      Chọn trận
                    </button>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false, showBridgeModal: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-wifi text-slate-400"></i>
                      Kết nối LAN
                    </button>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false, showHelpModal: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-circle-question text-slate-400"></i>
                      Giúp đỡ
                    </button>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false }); window.open('/#/thiet-dat', '_blank'); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-sliders text-slate-400"></i>
                      Cài đặt
                      <i className="fa fa-external-link text-slate-300 text-xs ml-auto"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-3 gap-2 relative" style={{ height: '95%' }}>

          {/* Row 1: Match Name & Timer */}
          <div className="flex items-stretch gap-3" style={{ height: '12%' }}>
            {/* Match Content Name */}
            <div className="flex-1 bg-white rounded-xl shadow p-2 flex items-center">
              <button onClick={this.prevMatchMartial} className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-lg transition-colors flex-shrink-0">
                <i className="fa fa-caret-left"></i>
              </button>
              <div className="flex-1 text-center px-2">
                <div className="text-[2.8vh] font-bold text-slate-800 leading-tight">{matchMartialName}</div>
                <div className="text-[1.5vh] font-medium text-slate-500">Lượt {matchMartialNo}</div>
              </div>
              <button onClick={this.nextMatchMartial} className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-lg transition-colors flex-shrink-0">
                <i className="fa fa-caret-right"></i>
              </button>
            </div>

            {/* Timer - Small */}
            <div 
              onClick={this.startTimer} 
              className="rounded-xl shadow cursor-pointer transition-transform hover:scale-105 flex items-center justify-center px-4"
              style={{ backgroundColor: timerBgColor || '#334155', width: '12%' }}
            >
              <div className="text-[5vh] font-bold text-white leading-none" style={{ fontFamily: 'clockicons, monospace' }}>
                {matchTime}
              </div>
            </div>
          </div>

          {/* Row 2: Team/Unit Code with Flag */}
          <div className="bg-slate-700 rounded-xl shadow p-3 flex items-center justify-center gap-6" style={{ height: '10%' }}>
            {countryFlag && (
              <img className="h-14 rounded shadow border-2 border-white/30" src={countryFlag} alt="flag" />
            )}
            <div className="text-[5vh] font-bold text-white tracking-wide">{matchMartialCode}</div>
          </div>

          {/* Row 3: Fighter Names - Large, wrap naturally */}
          <div className="bg-white rounded-xl shadow p-3 flex items-center justify-center" style={{ height: '14%' }}>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
              {matchMartialTeam.map((fighterData, i) => (
                <div key={i} className={`${fighterFontSize} font-bold text-slate-800 leading-tight text-center whitespace-nowrap`}>
                  {fighterCount > 2 && <span className="text-slate-500 font-medium">{i + 1}.</span>}
                  {' '}{fighterData.fighter.name}
                  {fighterCount > 1 && i < fighterCount - 1 && <span className="ml-4 text-slate-300">|</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Main Score - Most prominent */}
          <div className="bg-amber-500 rounded-2xl shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.01]" style={{ height: '47%' }} onClick={this.takeMainScore}>
            <div className="text-[38vh] font-black text-white leading-none">
              {averageScore}
            </div>
          </div>

          {/* Row 5: Referee Scores */}
          <div className="flex items-stretch gap-2" style={{ height: '10%' }}>
            {[1, 2, 3].map(i => {
              const status = getConnectionStatus(i - 1);
              return (
              <div key={i} className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                <div className="bg-slate-600 text-white text-center py-1 text-[1.5vh] font-medium flex items-center justify-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${status.color}`} 
                    title={status.title}
                  ></div>
                  <span>Giám định {i}</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-[4vh] font-bold text-slate-700">
                    {refereeScores[i-1] || '0.00'}
                  </div>
                </div>
              </div>
            )})}
            {isShowFiveReferee && [4, 5].map(i => {
              const status = getConnectionStatus(i - 1);
              return (
              <div key={i} className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                <div className="bg-slate-600 text-white text-center py-1 text-[1.5vh] font-medium flex items-center justify-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${status.color}`} 
                    title={status.title}
                  ></div>
                  <span>Giám định {i}</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-[4vh] font-bold text-slate-700">
                    {refereeScores[i-1] || '0.00'}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Choose Arena Modal */}
        <div className={`fixed inset-0 z-50 ${showChooseArenaNoModal ? 'flex' : 'hidden'} items-center justify-center bg-black/50 backdrop-blur-sm p-4`}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sticky top-0">
              <div className="flex items-center justify-between">
                <h5 className="text-white font-bold text-lg flex items-center gap-2">
                  <i className="fa-solid fa-id-badge"></i>Chọn thông tin
                </h5>
                <button onClick={() => this.setState({ showChooseArenaNoModal: false })} className="text-white/80 hover:text-white transition-colors">
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
                      <input 
                        type="radio" 
                        name="tournamentRadio" 
                        checked={selectedTournament === i}
                        onChange={() => this.chooseTournament(i)} 
                        className="w-4 h-4 text-blue-500" 
                      />
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
                    <input 
                      type="radio" 
                      name="optionsArena" 
                      value="0" 
                      checked={selectedArena === 0}
                      onChange={() => this.handleArenaChange(0)}
                      className="peer sr-only" 
                    />
                    <div className="p-3 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex flex-col items-center justify-center min-h-[60px]">
                      <i className="fa-solid fa-chess-board text-xl text-blue-500"></i>
                      <span className="font-bold text-sm text-slate-700 mt-1">Sân A</span>
                    </div>
                  </label>
                  <label className="relative">
                    <input 
                      type="radio" 
                      name="optionsArena" 
                      value="1" 
                      checked={selectedArena === 1}
                      onChange={() => this.handleArenaChange(1)}
                      className="peer sr-only" 
                    />
                    <div className="p-3 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex flex-col items-center justify-center min-h-[60px]">
                      <i className="fa-solid fa-chess-board text-xl text-blue-500"></i>
                      <span className="font-bold text-sm text-slate-700 mt-1">Sân B</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 p-3 bg-slate-50 border-t sticky bottom-0">
              <button onClick={() => this.setState({ showChooseArenaNoModal: false })}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-medium">Hủy</button>
              <button onClick={this.chooseArenaNo}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-500 text-white font-medium">OK</button>
            </div>
          </div>
        </div>

        {/* Take Main Score Modal */}
        <div className={`fixed inset-0 z-50 ${showTakeMainScoreModal ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h5 className="text-lg font-semibold text-slate-800">Chấm điểm</h5>
              <button onClick={() => this.setState({ showTakeMainScoreModal: false })} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="text-6xl font-bold text-center text-slate-800 mb-6 py-4 bg-slate-100 rounded-xl">{refereeResultBox}</div>
              <div className="grid grid-cols-3 gap-3">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(n => (
                  <button key={n} onClick={() => this.input(n)} className="py-4 text-2xl font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    {n}
                  </button>
                ))}
                <button onClick={this.clearInput} className="py-4 text-2xl font-semibold bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors">
                  <i className="fa-regular fa-trash-can"></i>
                </button>
                <button onClick={() => this.input('0')} className="py-4 text-2xl font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  0
                </button>
                <button onClick={this.submitInput} className="py-4 text-2xl font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
                  <i className="fa-solid fa-check"></i>
                </button>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t bg-slate-50">
              <button onClick={() => this.setState({ showTakeMainScoreModal: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>

        {/* Password Modal */}
        <div className={`fixed inset-0 z-50 ${showPasswordModal ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
              <div className="flex items-center justify-between">
                <h5 className="text-white font-bold text-lg flex items-center gap-2">
                  <i className="fa-solid fa-lock"></i>Vui lòng nhập mật khẩu
                </h5>
                <button onClick={() => this.setState({ showPasswordModal: false })} className="text-white/80 hover:text-white transition-colors">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex mb-4">
                <span className="flex items-center px-4 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg">
                  <i className="fa fa-key text-slate-500"></i>
                </span>
                <input type="password" className="flex-1 px-4 py-3 border border-slate-300 text-lg" placeholder="Mật khẩu" value={password} disabled />
                <button onClick={() => this.inputPw('-1')} className="px-4 bg-red-500 hover:bg-red-600 text-white rounded-r-lg">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 mb-2">
                {['1', '2', '3', '4', '5'].map(n => (
                  <button key={n} onClick={() => this.inputPw(n)} className="py-4 text-xl font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    {n}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['6', '7', '8', '9', '0'].map(n => (
                  <button key={n} onClick={() => this.inputPw(n)} className="py-4 text-xl font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button onClick={this.verifyPassword} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">OK</button>
              <button onClick={() => this.setState({ showPasswordModal: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        <div className={`fixed inset-0 z-50 ${showModalConfirm ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
              <div className="flex items-center justify-between">
                <h5 className="text-white font-bold text-lg">{confirmModalTitle}</h5>
                <button onClick={() => this.setState({ showModalConfirm: false })} className="text-white/80 hover:text-white transition-colors">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 text-slate-600" dangerouslySetInnerHTML={{ __html: confirmModalBody }}></div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button onClick={this.confirmSubmit} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">OK</button>
              <button onClick={() => this.setState({ showModalConfirm: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>

        {/* Choose Match Modal - Grouped by Content Type */}
        <div className={`fixed inset-0 z-50 ${showModalChooseMatch ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
              <div className="flex items-center justify-between">
                <h5 className="text-white font-bold text-lg flex items-center gap-2">
                  <i className="fa-solid fa-list"></i>Chọn trận theo nội dung
                </h5>
                <button onClick={() => this.setState({ showModalChooseMatch: false })} className="text-white/80 hover:text-white transition-colors">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[65vh] overflow-y-auto">
              {Object.keys(matchGroups).length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(matchGroups).map(([contentName, matches], gi) => (
                    <div key={gi} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Content/Match Type Header */}
                      <div className="bg-blue-600 px-4 py-3 font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-trophy"></i>
                        <span>{contentName}</span>
                        <span className="ml-auto bg-white/20 px-2 py-0.5 rounded text-sm">{matches.length} lượt</span>
                      </div>
                      {/* Rounds grid - compact */}
                      <div className="p-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 bg-slate-50">
                        {matches.map((m, idx) => {
                          const isCurrentMatch = (m.matchIndex + 1) === this.matchMartialNoCurrent && (m.teamIndex + 1) === this.teamMartialNoCurrent;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                // matchIndex and teamIndex are 0-based, but NoCurrent are 1-based
                                this.matchMartialNoCurrent = m.matchIndex + 1;
                                this.teamMartialNoCurrent = m.teamIndex + 1;
                                // Use restoreMatch to save to Firebase and reload
                                this.restoreMatch();
                                this.setState({ showModalChooseMatch: false });
                              }}
                              className={`text-center px-2 py-3 rounded-lg transition-colors border hover:shadow-md ${
                                isCurrentMatch 
                                  ? 'bg-amber-400 border-amber-500 ring-2 ring-amber-300' 
                                  : 'bg-white hover:bg-slate-100 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <div className={`text-lg font-bold ${isCurrentMatch ? 'text-white' : 'text-slate-700'}`}>{m.no}</div>
                              <div className={`text-xs font-medium truncate ${isCurrentMatch ? 'text-white/80' : 'text-slate-600'}`}>{m.code}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">Chưa có dữ liệu trận đấu</div>
              )}
            </div>
            <div className="flex justify-end px-6 py-3 border-t bg-slate-50">
              <button onClick={() => this.setState({ showModalChooseMatch: false })} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors">Đóng</button>
            </div>
          </div>
        </div>

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
                    <span className="font-semibold text-slate-700">Phím tắt thường dùng</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="w-10 h-8 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">Space</span>
                      <span className="text-blue-700 text-sm">Đồng hồ</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold">C</span>
                      <span className="text-blue-700 text-sm">Chọn trận</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">S</span>
                      <span className="text-slate-700 text-sm">Chấm điểm</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">R</span>
                      <span className="text-slate-700 text-sm">Reset timer</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">←</span>
                      <span className="text-slate-700 text-sm">Lùi trận</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">→</span>
                      <span className="text-slate-700 text-sm">Tiến trận</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">Phím <strong>Esc</strong> để đóng cửa sổ | <strong>Enter</strong> để xác nhận</p>
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

        <div style={{ display: 'none' }}>
          <audio ref={this.soundRef}>
            <source src={sound} type="audio/ogg" />
          </audio>
        </div>
        <ToastContainer position="top-center" autoClose={800} hideProgressBar />
      </div>
    );
  }
}

export default GiamSatThiQuyenContainer;
