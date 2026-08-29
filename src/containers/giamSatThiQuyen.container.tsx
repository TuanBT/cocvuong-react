import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, child, onValue, Database, DatabaseReference, off } from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/Reg.mp3';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FitText from '../components/common/FitText';

// Import utils
import { getReadableTextColor } from '../utils/contrast';

import { AppUser } from '../services/authService';
import { SupervisorAccess } from '../components/tournament/RequestAccessPanel';
import CodeBoardModal from '../components/tournament/CodeBoardModal';
import { displayTournamentName, resetDemoTournament } from '../services/demoService';
import { AccountIdentityRow, AccountSignOutItem } from '../components/auth';

// Import Offline Service
import {
  isOnline,
  onNetworkChange,
  smartSet,
  smartUpdate,
  syncPendingWrites,
  getPendingWritesCount
} from '../services/offlineService';

// Import Martial Write Service (logic ghi thi quyền — dùng chung với bộ test e2e)
import {
  overrideMartialFinalScore,
  setLastMatchMartial,
  rankTeams,
  nextMartialPosition,
  prevMartialPosition,
  martialTeamPath,
  type MartialWriteContext,
  type RankedTeam as RankedTeamSvc,
} from '../services/martialWriteService';
// Import martial cache service
import {
  cacheMartialArena,
  getCachedMartialArena
} from '../services/offlineService';

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

// Mot dong trong bang xep hang
interface RankedTeam {
  no: number;
  finalScore: number;
  code: string;
  fighters: string[];
  rank: number;
}

// Props and State interfaces
interface GiamSatThiQuyenProps {
  user: AppUser;
  access: SupervisorAccess;
}

interface GiamSatThiQuyenState {
  data: any;
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
  showCodeBoard: boolean;
  showChooseArenaNoModal: boolean;
  showTakeMainScoreModal: boolean;
  showModalConfirm: boolean;
  showModalShortcut: boolean;
  showModalChooseMatch: boolean;
  showQuickMenu: boolean;
  matchChooseValue: string;
  isShowFiveReferee: boolean;
  isShowCountryFlag: boolean;
  specScoreWidth: string;
  // Connection status tracking
  showHelpModal: boolean;
  showRankingModal: boolean;
  // Offline mode
  isOffline: boolean;
  pendingWritesCount: number;
}

class GiamSatThiQuyenContainer extends Component<GiamSatThiQuyenProps, GiamSatThiQuyenState> {
  // Firebase related
  db: Database;
  firebaseListeners: DatabaseReference[];
  pathMartial: string;
  
  // Offline network listener cleanup
  networkCleanup: (() => void) | null = null;

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
  arenaNo: string;

  // Refs

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
    this.greenColor = "#15803d";
    this.yellowColor = "#f1c40f";
    this.redColor = "#e74c3c";
    this.grayColor = "#95a5a6";
    this.whiteColor = "#ffffff";
    this.blackColor = "#000000";
    this.orangeColor = "#e67e22";
    this.bodyBgColor = "#ecf0f1";
    this.silverColor = "#94a3b8";
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
    this.arenaNo = 'A';


    this.tournamentConst = { "lastMatch": { "no": 1 }, "referee": [{ "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }], "tournament": [] };
    this.matchObj = { "match": { "no": 1, "type": "", "category": "", "win": "" }, "fighters": { "redFighter": { "name": "Đỏ", "code": "", "score": 0 }, "blueFighter": { "name": "Xanh", "code": "", "score": 0 } } };
    this.martialConst = { "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 }, "martial": [] };
    this.matchMartialObj = { "match": { "name": "" }, "team": [] };
    this.fightersMartialObj = { "fighters": [], "no": 0, "finalScore": 0, "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }] };

    this.state = {
      data: null,
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
      showCodeBoard: false,
      showChooseArenaNoModal: false,
      showTakeMainScoreModal: false,
      showModalConfirm: false,
      showModalShortcut: false,
      showModalChooseMatch: false,
      showQuickMenu: false,
      matchChooseValue: '',
      isShowFiveReferee: false,
      isShowCountryFlag: false,
      specScoreWidth: '',
      // Connection status
      showHelpModal: false,
      showRankingModal: false,
      // Offline mode
      isOffline: !isOnline(),
      pendingWritesCount: getPendingWritesCount()
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

  componentDidMount(): void {
    document.addEventListener("keydown", this._handleKeyDown);
    
    // Subscribe to network status changes for offline mode
    this.networkCleanup = onNetworkChange((online) => {
      this.setState({ 
        isOffline: !online,
        pendingWritesCount: getPendingWritesCount()
      });
      
      if (online) {
        // Khi có mạng lại, sync pending writes
        const pendingCount = getPendingWritesCount();
        if (pendingCount > 0) {
          console.log(`[Offline] Online lại, syncing ${pendingCount} pending writes...`);
          syncPendingWrites(this.db).then(({ success, failed }) => {
            if (success > 0) {
              console.log(`[Offline] Đã đồng bộ ${success} thay đổi`);
            }
            if (failed > 0) {
              console.warn(`[Offline] ${failed} thay đổi không đồng bộ được`);
            }
            this.setState({ pendingWritesCount: getPendingWritesCount() });
          });
        }
      }
    });
    
    // Giai va san da duoc cong RequestAccessPanel quyet dinh xong — vao thang,
    // khong hoi mat khau, khong hien modal chon san lan nao nua.
    const { access } = this.props;
    this.tournamentNoIndex = access.tournament.index;
    this.martialArenaNoIndex = access.arenaIndex;
    this.arenaNo = access.arenaIndex === 0 ? 'A' : 'B';
    this.main();
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
    // Cleanup network listener
    if (this.networkCleanup) {
      this.networkCleanup();
    }
  }

  main(): void {
    // San da co san tu phan cong — chi con doc thiet dat roi vao thang luot thi
    this.showMartialInfo();
  }

  showMartialInfo = (): void => {
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/martialArenaName')).then((snapshot) => {
      this.setState({ arenaName: snapshot.val() });
    });
    
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (this.settingObj) {
        this.setState({ tournamentName: displayTournamentName(this.settingObj, 'martial') });
      }
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
        
        // Cache data for offline mode
        if (this.martialObj) {
          cacheMartialArena(this.tournamentNoIndex, this.martialArenaNoIndex, {
            martial: this.martialObj,
            settings: this.settingObj,
            arenaName: this.state.arenaName,
            lastMatchMartial: {
              matchMartialNo: this.matchMartialNoCurrent,
              teamMartialNo: this.teamMartialNoCurrent
            }
          });
        }
        
        this.showValue();
      }, (error) => {
        // Firebase error - có thể do mất mạng
        console.warn('[Offline] Firebase error, trying cache:', error);
        this.tryLoadFromCache();
      });

      // Kiểm tra kết nối internet
      const connectedRef = ref(this.db, '.info/connected');
      this.firebaseListeners.push(connectedRef);
      onValue(connectedRef, (snapshot) => {
        this.setState({ isInternetConnected: snapshot.val() === true });
      });
    });
  }

  /**
   * Load data từ cache khi offline
   */
  tryLoadFromCache = (): void => {
    const cached = getCachedMartialArena(this.tournamentNoIndex, this.martialArenaNoIndex);
    if (cached) {
      console.log('[Offline] Loading martial from cache...');
      
      this.martialObj = cached.martial;
      this.settingObj = cached.settings;
      this.matchMartialNoCurrent = cached.lastMatchMartial?.matchMartialNo || 1;
      this.teamMartialNoCurrent = cached.lastMatchMartial?.teamMartialNo || 1;
      
      // Simulate snapshot for initVariable
      const fakeSnapshot = { val: () => this.martialObj };
      this.initVariable(fakeSnapshot);
      this.showValue();
      
      console.log('[Offline] Loaded martial from cache');
    } else {
      console.warn('[Offline] No martial cache available');
    }
  }

  _handleKeyDown = (e: KeyboardEvent): void => {
    // ESC - Đóng modal đang mở
    if (e.which === 27) {
      const { showCodeBoard, showModalChooseMatch, showModalConfirm, showTakeMainScoreModal, showHelpModal, showRankingModal } = this.state;
      if (showRankingModal) {
        this.setState({ showRankingModal: false });
      } else if (showCodeBoard) {
        this.setState({ showCodeBoard: false });
      } else if (showModalChooseMatch) {
        this.setState({ showModalChooseMatch: false });
      } else if (showModalConfirm) {
        this.setState({ showModalConfirm: false });
      } else if (showTakeMainScoreModal) {
        this.setState({ showTakeMainScoreModal: false });
      } else if (showHelpModal) {
        this.setState({ showHelpModal: false });
      }
      return;
    }
    // Dang xem bang xep hang thi khong nhan phim dieu khien (tranh lo bam Space chay dong ho)
    if (this.state.showRankingModal) return;
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

    const next = nextMartialPosition(this.martialObj as any, {
      matchMartialNo: this.matchMartialNoCurrent,
      teamMartialNo: this.teamMartialNoCurrent,
    });
    if (next.matchMartialNo === this.matchMartialNoCurrent && next.teamMartialNo === this.teamMartialNoCurrent) {
      return;
    }
    this.matchMartialNoCurrent = next.matchMartialNo;
    this.teamMartialNoCurrent = next.teamMartialNo;
    this.restoreMatch();
  }

  prevMatchMartial = (): void => {
    if (!this.martialObj) return;

    const prev = prevMartialPosition(this.martialObj as any, {
      matchMartialNo: this.matchMartialNoCurrent,
      teamMartialNo: this.teamMartialNoCurrent,
    });
    if (prev.matchMartialNo === this.matchMartialNoCurrent && prev.teamMartialNo === this.teamMartialNoCurrent) {
      return;
    }
    this.matchMartialNoCurrent = prev.matchMartialNo;
    this.teamMartialNoCurrent = prev.teamMartialNo;
    this.restoreMatch();
  }

  restoreMatch(): void {

    smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/martialArena/' + this.martialArenaNoIndex + '/lastMatchMartial', {
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

  /** Context dùng cho martialWriteService — giải + sân hiện tại */
  private get martialWriteCtx(): MartialWriteContext {
    return {
      db: this.db,
      tournamentIndex: Number(this.tournamentNoIndex),
      arenaIndex: Number(this.martialArenaNoIndex),
    };
  }

  confirmSubmit = (): void => {
    if (parseInt(this.refereeMartialScore) > 999) {
      this.refereeMartialScore = "";
    }
    this.pathMartial = martialTeamPath(Number(this.tournamentNoIndex), this.matchNoCurrentIndex, this.teamNoCurrentIndex);
    overrideMartialFinalScore(
      this.martialWriteCtx,
      this.matchNoCurrentIndex,
      this.teamNoCurrentIndex,
      parseInt(this.refereeMartialScore) || 0
    );
    this.refereeMartialScore = "";
    this.setState({ 
      refereeResultBox: '000',
      showTakeMainScoreModal: false,
      showModalConfirm: false
    });
    toast.success("Chấm điểm thành công!");
  }

  // Xep hang cac doi trong cung noi dung thi hien tai
  // Xep hang cac doi trong cung noi dung thi hien tai
  computeRanking(): { ranked: RankedTeam[]; pending: RankedTeam[]; currentTeamNo: number | undefined; matchName: string } {
    const currentMatchContent = this.martialObj && this.matchMartialNoCurrent > 0
      ? this.martialObj[this.matchMartialNoCurrent - 1]
      : null;

    const { ranked, pending } = rankTeams(currentMatchContent as any);

    return {
      ranked,
      pending,
      currentTeamNo: currentMatchContent?.team?.[this.teamMartialNoCurrent - 1]?.no,
      matchName: currentMatchContent?.match?.name || ''
    };
  }

  // Mau huy hieu theo hang
  rankColor(rank: number): string {
    switch (rank) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-slate-300 text-slate-700';
      case 3: return 'bg-amber-800 text-white';
      default: return 'bg-slate-200 text-slate-600';
    }
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

  /**
   * Cham lai giai thu. Giai thu co dung 1 luot nen "cham lai giai" =
   * "cham lai luot" — khong phai viet logic reset moi.
   */
  resetDemo = async (): Promise<void> => {
    try {
      await resetDemoTournament(this.props.access.tournament.index);
      toast.success('Đã xoá điểm — chấm cặp mới được rồi.');
      window.location.reload();
    } catch {
      toast.error('Không xoá được điểm cũ.');
    }
  }

  render(): React.ReactNode {
    const { user, access } = this.props;
    const {
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
      isOffline,
      pendingWritesCount,
      showCodeBoard,
      showTakeMainScoreModal,
      showModalConfirm,
      showModalShortcut,
      showModalChooseMatch,
      showQuickMenu,
      matchChooseValue,
      isShowFiveReferee,
      isShowCountryFlag,
      specScoreWidth,
      showHelpModal,
      showRankingModal
    } = this.state;

    // Get country flag for first fighter
    let countryFlag = '';
    if (matchMartialTeam.length > 0 && matchMartialTeam[0].fighter.country && isShowCountryFlag) {
      try {
        countryFlag = require('../assets/flag/' + matchMartialTeam[0].fighter.country + '.jpg');
      } catch (e) {
        countryFlag = '';
      }
    }

    const fighterCount = matchMartialTeam.length;
    // It nguoi thi chu to hon, dong nguoi thi FitText tu thu lai cho vua mot dong
    const fighterNameMaxVh = fighterCount <= 1 ? 12 : fighterCount <= 2 ? 10 : 8;

    // Ten giai: <br> tro thanh xuong dong, giu nguyen \n tu textarea
    const processedTournamentName = tournamentName
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/br>/gi, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim();

    // Danh sach giam dinh hien thi theo cau hinh 3 hay 5 nguoi
    const refereeList = isShowFiveReferee ? [1, 2, 3, 4, 5] : [1, 2, 3];

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
      <div className="h-screen w-screen bg-slate-200 flex flex-col overflow-hidden relative">
        {/* Loading Skeleton when no match data - covers entire screen */}
        {(!matchMartialNo || matchMartialNo === '') && (
          <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-slate-200">
            {/* Skeleton Header */}
            <div className="bg-white border-b border-slate-200 px-4 flex items-center justify-between" style={{ height: '6%' }}>
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 bg-slate-300 rounded"></div>
              </div>
              <div className="h-5 w-64 bg-slate-200 rounded"></div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="h-7 w-20 bg-slate-200 rounded"></div>
              </div>
            </div>
            {/* Skeleton Body */}
            <div className="p-3 flex flex-col gap-2" style={{ height: '94%' }}>
              {/* Skeleton Row 1: Noi dung (12%) */}
              <div className="bg-slate-300 rounded-xl" style={{ height: '12%' }}></div>
              {/* Skeleton Row 2: Ten VDV (15%) */}
              <div className="bg-slate-400 rounded-xl" style={{ height: '15%' }}></div>
              {/* Skeleton Row 3: Don vi (11%) */}
              <div className="bg-slate-300 rounded-xl" style={{ height: '11%' }}></div>
              {/* Skeleton Row 4: Dong ho | Diem tong | Giam dinh (55%) */}
              <div className="flex items-stretch gap-2" style={{ height: '55%' }}>
                <div className="bg-slate-300 rounded-xl" style={{ width: '18%' }}></div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-full bg-slate-400 rounded-[4vh]" style={{ width: '88%' }}></div>
                </div>
                <div className="bg-slate-300 rounded-xl" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Header - Tournament Info */}
        <div className="bg-white border-b border-slate-200 text-slate-800 px-4 flex items-center justify-between relative" style={{ minHeight: '7%' }}>
          <div className="flex items-center gap-3 flex-shrink-0 z-10">
            {/* Connection Status Dot */}
            <span 
              className={`status-dot w-3 h-3 rounded-full block flex-shrink-0 ${
                isInternetConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
              data-tooltip={
                isOffline ? 'Offline Mode (using cache)' :
                isInternetConnected ? 'Đã kết nối Internet' :
                'Mất kết nối'
              }
            ></span>
            {/* Offline indicator */}
            {isOffline && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-300 flex-shrink-0">
                📴 Offline
              </span>
            )}
            {/* Pending writes indicator */}
            {pendingWritesCount > 0 && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-300 flex-shrink-0">
                ⏳ {pendingWritesCount} pending
              </span>
            )}
            <a 
              href="/" 
              className="flex-shrink-0 flex items-center p-1.5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg shadow-sm hover:shadow hover:border-slate-300 transition-all"
            >
              <img src={logo} alt="logo" className="h-6" />
            </a>
          </div>
          {/* Tournament Name - canh giua man hinh bang absolute */}
          <div className="absolute inset-0 flex items-center justify-center px-[15%] pointer-events-none" id="tournamentName">
            <FitText
              maxVh={4.5}
              minVh={1.6}
              maxHeightVh={6.5}
              className="text-center"
              innerClassName="font-black uppercase tracking-wide text-coc-red leading-tight whitespace-pre-line"
            >
              {processedTournamentName}
            </FitText>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 z-10">
            <span className="bg-slate-200 px-4 py-1.5 rounded font-bold text-base">{arenaName}</span>

            {/* Giai dang mo toang / giai thu phai nhin thay duoc,
                khong de ai quen minh dang cham vao dau */}
            {access.tournament.demo && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">CHẤM NHANH</span>
            )}
            {access.tournament.openAccess && !access.tournament.demo && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded"
                title="Ai đăng nhập cũng chấm được trên giải này">MỞ TỰ DO</span>
            )}

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
                  <div className="absolute right-0 top-10 bg-white rounded-lg shadow-xl border border-slate-200 py-2 min-w-[220px] z-50">
                    {/* Trang nay con dung de trinh chieu: ten nguoi dang truc
                        nam trong day, khong bay tren man hinh ca giai cung nhin */}
                    <AccountIdentityRow user={user} subtitle={`${arenaName || 'Sân'} · Thi quyền`} />
                    {access.tournament.demo && (
                      <button
                        onClick={() => { this.setState({ showQuickMenu: false }); this.resetDemo(); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <i className="fa fa-rotate-left"></i>
                        Chấm cặp mới
                      </button>
                    )}
                    <button
                      onClick={() => { this.setState({ showQuickMenu: false, showCodeBoard: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-key text-amber-500"></i>
                      Mã giám định sân này
                    </button>
                    {access.availableArenas.length > 1 && (
                      <button
                        onClick={() => { this.setState({ showQuickMenu: false }); access.onChangeArena(); }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <i className="fa fa-arrows-left-right text-slate-400"></i>
                        Đổi sân
                      </button>
                    )}
                    <div className="border-t border-slate-200 my-1"></div>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false, showModalChooseMatch: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-list text-slate-400"></i>
                      Chọn trận
                    </button>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false, showModalShortcut: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-keyboard text-slate-400"></i>
                      Phím tắt
                    </button>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false, showHelpModal: true }); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-circle-question text-slate-400"></i>
                      Giúp đỡ
                    </button>
                    <button 
                      onClick={() => { this.setState({ showQuickMenu: false }); window.open('/thiet-dat', '_blank'); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <i className="fa fa-sliders text-slate-400"></i>
                      Cài đặt
                      <i className="fa fa-external-link text-slate-300 text-xs ml-auto"></i>
                    </button>
                    <div className="border-t border-slate-200 my-1"></div>
                    <AccountSignOutItem user={user} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-3 gap-2 relative" style={{ height: '94%' }}>

          {/* Row 1: Noi dung thi - mot dong, tu co cho vua */}
          <div className="bg-white rounded-xl shadow px-3 flex items-center gap-3" style={{ height: '12%' }}>
            <button onClick={this.prevMatchMartial} className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-lg transition-colors flex-shrink-0">
              <i className="fa fa-caret-left"></i>
            </button>
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <FitText maxVh={5.5} minVh={2} className="text-center" innerClassName="font-bold text-slate-800 leading-[1.15]">
                {matchMartialName}
                <span className="text-slate-500 font-medium"> · Lượt {matchMartialNo}</span>
              </FitText>
            </div>
            <button onClick={this.nextMatchMartial} className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-lg transition-colors flex-shrink-0">
              <i className="fa fa-caret-right"></i>
            </button>
          </div>

          {/* Row 2: Ten VDV - tat ca tren mot dong, tu co cho vua */}
          <div className="bg-slate-800 rounded-xl shadow-lg px-[3vh] flex items-center justify-center" style={{ height: '15%' }}>
            <FitText maxVh={fighterNameMaxVh} minVh={2} className="text-center" innerClassName="font-bold text-white leading-[1.15]">
              {matchMartialTeam.map((fighterData, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-slate-500 mx-[0.35em]">•</span>}
                  {fighterCount > 2 && <span className="text-slate-400 font-medium">{i + 1}. </span>}
                  {fighterData.fighter.name}
                </React.Fragment>
              ))}
            </FitText>
          </div>

          {/* Row 3: Don vi - mot dong, tu co cho vua */}
          <div
            className={`relative bg-white rounded-xl shadow flex items-center justify-center ${countryFlag ? 'px-[11vh]' : 'px-[3vh]'}`}
            style={{ height: '11%' }}
          >
            {countryFlag && (
              <img className="absolute left-[2vh] top-1/2 -translate-y-1/2 h-[55%] rounded shadow border-2 border-slate-200" src={countryFlag} alt="flag" />
            )}
            <FitText maxVh={6} minVh={2.5} className="text-center" innerClassName="font-bold text-slate-600 tracking-wide leading-[1.15]">
              {matchMartialCode}
            </FitText>
          </div>

          {/* Row 4: Dong ho + BXH | Diem tong | Diem giam dinh */}
          <div className="flex items-stretch gap-2" style={{ height: '55%' }}>

            {/* Cot trai: dong ho (tren) + bang xep hang (duoi) */}
            {(() => {
              const { ranked, pending, currentTeamNo } = this.computeRanking();
              const hiddenCount = Math.max(0, ranked.length - 4) + pending.length;

              return (
                <div className="flex flex-col gap-2" style={{ width: '18%' }}>
                  {/* Dong ho - phan tren */}
                  <div
                    onClick={this.startTimer}
                    className="rounded-xl shadow-lg flex items-center justify-center px-[1.5vh] cursor-pointer select-none transition-transform hover:scale-[1.02]"
                    style={{ height: '25%', backgroundColor: timerBgColor || '#334155' }}
                  >
                    <FitText
                      maxVh={8}
                      minVh={3}
                      className="text-center"
                      innerClassName="leading-none clock-face"
                      innerStyle={{ color: getReadableTextColor(timerBgColor || '#334155') }}
                    >
                      {matchTime}
                    </FitText>
                  </div>

                  {/* Bang xep hang - phan duoi, bam de xem day du */}
                  <div
                    onClick={() => this.setState({ showRankingModal: true })}
                    className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
                  >
                    {/* Header */}
                    <div className="bg-slate-700 px-2 py-[0.5vh] flex items-center justify-center gap-[0.8vh] flex-shrink-0">
                      <span className="text-white font-bold text-[1.8vh] uppercase tracking-wider">Xếp hạng</span>
                      <i className="fa fa-expand text-white/60 text-[1.3vh]"></i>
                    </div>
                    {/* Rankings - show all teams */}
                    <div className="flex-1 flex flex-col divide-y divide-slate-100 overflow-y-auto">
                      {ranked.length > 0 ? ranked.slice(0, 4).map((team, idx) => {
                        const isCurrentTeam = team.no === currentTeamNo;
                        const fighterNames = team.fighters.join(', ');
                        return (
                          <div 
                            key={idx} 
                            className={`flex-1 min-h-0 flex items-center gap-[0.6vh] px-[0.8vh] border-l-[0.6vh] ${isCurrentTeam ? 'bg-amber-50 border-amber-500' : 'border-transparent'}`}
                          >
                            {/* Rank number badge */}
                            <span className={`flex-shrink-0 w-[3.4vh] h-[3.4vh] rounded-full flex items-center justify-center text-[2vh] font-bold ${this.rankColor(team.rank)}`}>
                              {team.rank}
                            </span>
                            {/* Name (VDV) on top, Code (don vi) below */}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className={`text-[2.2vh] leading-tight font-semibold line-clamp-2 ${isCurrentTeam ? 'text-amber-700' : 'text-slate-800'}`}>
                                {fighterNames || `Lượt ${team.no}`}
                              </div>
                              {team.code && (
                                <div className={`text-[1.8vh] leading-tight truncate ${isCurrentTeam ? 'text-amber-600' : 'text-slate-500'}`}>
                                  {team.code}
                                </div>
                              )}
                            </div>
                            {/* Score */}
                            <span className={`ml-auto flex-shrink-0 text-[2.4vh] font-bold tabular-nums ${team.finalScore > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                              {team.finalScore > 0 ? String(team.finalScore).padStart(3, '0') : '—'}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="flex-1 flex items-center justify-center text-[1.8vh] text-slate-500">
                          —
                        </div>
                      )}
                    </div>
                    {hiddenCount > 0 && (
                      <div className="bg-slate-100 border-t border-slate-200 px-2 py-[0.3vh] text-center text-[1.4vh] font-medium text-slate-500 flex-shrink-0">
                        +{hiddenCount} đội · bấm để xem
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Cot giua: diem tong - khoi mau cam om sat con so */}
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <div
                onClick={this.takeMainScore}
                className="h-full max-w-full bg-amber-600 rounded-[4vh] shadow-lg px-[6vh] inline-flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-[1.02]"
              >
                <div className="text-[min(40vh,24vw)] font-black text-white leading-none tabular-nums">
                  {averageScore}
                </div>
              </div>
            </div>

            {/* Cot phai: diem giam dinh */}
            <div className="bg-white rounded-xl shadow flex flex-col divide-y divide-slate-100 overflow-hidden" style={{ width: '20%' }}>
              {refereeList.map(i => (
                <div key={i} className="flex-1 min-h-0 flex items-center justify-between px-[1.5vh]">
                  <span className="text-[2vh] font-bold text-slate-600 leading-[1.15] whitespace-nowrap">Giám định {i}</span>
                  <span className={`${isShowFiveReferee ? 'text-[7vh]' : 'text-[10vh]'} font-bold text-slate-800 leading-none tabular-nums`}>
                    {refereeScores[i - 1] || '00'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CodeBoardModal
          isOpen={showCodeBoard}
          onClose={() => this.setState({ showCodeBoard: false })}
          tournamentIndex={access.tournament.index}
          tournamentName={access.tournament.name}
          arenaKeys={[access.arenaKey]}
        />

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

        {/* Ranking Modal - xem day du bang xep hang, khong phai mo man hinh khac */}
        {showRankingModal && (() => {
          const { ranked, pending, currentTeamNo, matchName } = this.computeRanking();
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => this.setState({ showRankingModal: false })}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-slate-700 px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="min-w-0">
                    <h5 className="text-white font-bold text-xl">Bảng xếp hạng</h5>
                    {matchName && <p className="text-slate-300 text-sm truncate">{matchName}</p>}
                  </div>
                  <button onClick={() => this.setState({ showRankingModal: false })} className="text-white/80 hover:text-white transition-colors flex-shrink-0 ml-3">
                    <i className="fa-solid fa-xmark text-2xl"></i>
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  {ranked.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {ranked.map((team, idx) => {
                        const isCurrentTeam = team.no === currentTeamNo;
                        return (
                          <div key={idx} className={`flex items-center gap-3 px-4 py-3 border-l-4 ${isCurrentTeam ? 'bg-amber-50 border-amber-500' : 'border-transparent'}`}>
                            <span className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold ${this.rankColor(team.rank)}`}>
                              {team.rank}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className={`text-lg font-semibold leading-snug ${isCurrentTeam ? 'text-amber-800' : 'text-slate-800'}`}>
                                {team.fighters.length > 0 ? team.fighters.join(', ') : `Lượt ${team.no}`}
                              </div>
                              <div className="text-base text-slate-500 leading-snug">
                                {team.code || '—'} · Lượt {team.no}
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-3xl font-bold tabular-nums text-slate-800">
                              {String(team.finalScore).padStart(3, '0')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-10 text-center text-slate-400">Chưa có đội nào được chấm điểm</div>
                  )}

                  {pending.length > 0 && (
                    <div className="border-t border-slate-200">
                      <div className="px-4 py-2 bg-slate-50 text-sm font-semibold text-slate-500 uppercase tracking-wide sticky top-0">
                        Chưa thi ({pending.length})
                      </div>
                      <div className="divide-y divide-slate-100">
                        {pending.map((team, idx) => {
                          const isCurrentTeam = team.no === currentTeamNo;
                          return (
                            <div key={idx} className={`flex items-center gap-3 px-4 py-3 border-l-4 ${isCurrentTeam ? 'bg-amber-50 border-amber-500' : 'border-transparent'}`}>
                              <span className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-base font-bold bg-slate-100 text-slate-400">
                                —
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className={`text-lg font-semibold leading-snug ${isCurrentTeam ? 'text-amber-800' : 'text-slate-600'}`}>
                                  {team.fighters.length > 0 ? team.fighters.join(', ') : `Lượt ${team.no}`}
                                </div>
                                <div className="text-base text-slate-400 leading-snug">
                                  {team.code || '—'} · Lượt {team.no}
                                </div>
                              </div>
                              <span className="flex-shrink-0 text-2xl font-bold tabular-nums text-slate-300">—</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t flex-shrink-0">
                  <button onClick={() => this.setState({ showRankingModal: false })}
                    className="w-full py-2.5 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-800 transition-colors">Đóng</button>
                </div>
              </div>
            </div>
          );
        })()}

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
                {/* Timer Control */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-clock text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Đồng hồ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="min-w-12 h-8 px-2 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">Space</span>
                      <span className="text-blue-700 text-sm">Bấm giờ</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">R</span>
                      <span className="text-slate-700 text-sm">Reset giờ</span>
                    </div>
                  </div>
                </div>
                
                {/* Navigation */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-shuffle text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Di chuyển</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">←</span>
                      <span className="text-slate-700 text-sm">Lùi trận</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="w-8 h-8 bg-slate-500 text-white rounded flex items-center justify-center font-bold">→</span>
                      <span className="text-slate-700 text-sm">Tiến trận</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold">C</span>
                      <span className="text-blue-700 text-sm">Chọn trận</span>
                    </div>
                  </div>
                </div>
                
                {/* Scoring */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-star text-slate-400"></i>
                    <span className="font-semibold text-slate-700">Chấm điểm</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="w-8 h-8 bg-amber-500 text-white rounded flex items-center justify-center font-bold">S</span>
                      <span className="text-amber-700 text-sm">Nhập điểm</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                      <span className="min-w-12 h-8 px-2 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold">Enter</span>
                      <span className="text-green-700 text-sm">Xác nhận</span>
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
