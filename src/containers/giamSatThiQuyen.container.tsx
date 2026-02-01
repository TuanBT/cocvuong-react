import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, child, onValue, Database, DatabaseReference, off } from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/Reg.mp3';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  matchChooseValue: string;
  isShowFiveReferee: boolean;
  isShowCountryFlag: boolean;
  selectedTournament: number;
  selectedArena: number;
  specScoreWidth: string;
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
      matchChooseValue: '',
      isShowFiveReferee: false,
      isShowCountryFlag: false,
      selectedTournament: 0,
      selectedArena: 0,
      specScoreWidth: ''
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
        this.showMartialInfo();
      }
    });
  }

  chooseArenaNo = (): void => {
    const { selectedArena } = this.state;
    this.setState({ showChooseArenaNoModal: false });
    this.martialArenaNoIndex = selectedArena;
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
        console.log("on value Start");
        this.initVariable(snapshot);
        this.showValue();
        console.log("on value End");
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
    if (e.which === 32) {
      this.startTimer();
    }
    // Left arrow
    if (e.which === 37) {
      this.prevMatchMartial();
    }
    // Right arrow
    if (e.which === 39) {
      this.nextMatchMartial();
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
    console.log("showValue() Start");
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
    console.log("nextMatchMartial() Start");
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
    console.log("nextMatchMartial() End");
  }

  prevMatchMartial = (): void => {
    console.log("prevMatchMartial() Start");
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
    console.log("prevMatchMartial() End");
  }

  restoreMatch(): void {
    console.log("restoreMatch() Start");

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

    console.log("restoreMatch() End");
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
    console.log("startTimer() Start");
    if (this.timer) {
      this.stopTimer();
      this.setState({ timerBgColor: this.yellowColor });
    } else {
      this.timer = setInterval(() => { this.makeTimer(); }, 1000);
      this.isTimerRunning = true;
      this.setState({ timerBgColor: this.greenColor });
      this.playSound();
    }
    console.log("startTimer() End");
  }

  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = false;
    this.isTimerRunning = false;
  }

  makeTimer(): void {
    console.log("makeTimer() Start");

    this.timerCoundown++;

    const minutes = Math.floor(this.timerCoundown / 60);
    const seconds = Math.floor(this.timerCoundown - (minutes * 60));
    this.minutes = minutes < 10 ? "0" + minutes : String(minutes);
    this.seconds = seconds < 10 ? "0" + seconds : String(seconds);

    this.setState({ matchTime: this.minutes + ":" + this.seconds });
    console.log("makeTimer() End");
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
      matchChooseValue,
      isShowFiveReferee,
      isShowCountryFlag,
      selectedTournament,
      selectedArena,
      specScoreWidth
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
            <a href="#" onClick={this.showShortcut} className="flex-shrink-0">
              <img src={logo} alt="logo" className="h-8" />
            </a>
            <span className="text-[2vh] font-bold whitespace-pre-line leading-tight" ref={this.tournamentNameRef}>{processedTournamentName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="bg-slate-200 px-3 py-1 rounded text-sm font-semibold">{arenaName}</span>
            {!isInternetConnected && (
              <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                <i className="fa-solid fa-wifi mr-1"></i>Mất kết nối
              </span>
            )}
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
                <div className="text-[1.5vh] font-medium text-emerald-600">Lượt {matchMartialNo}</div>
              </div>
              {/* Jump to match button */}
              <button onClick={() => this.setState({ showModalChooseMatch: true })} className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-sm transition-colors flex-shrink-0 mr-2">
                <i className="fa fa-list"></i>
              </button>
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
          <div className="bg-emerald-600 rounded-xl shadow p-3 flex items-center justify-center gap-6" style={{ height: '10%' }}>
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
                  {fighterCount > 2 && <span className="text-emerald-600 font-medium">{i + 1}.</span>}
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
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                <div className="bg-emerald-600 text-white text-center py-1 text-[1.5vh] font-medium">
                  Giám định {i}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-[4vh] font-bold text-emerald-600">
                    {refereeScores[i-1] || '0.00'}
                  </div>
                </div>
              </div>
            ))}
            {isShowFiveReferee && [4, 5].map(i => (
              <div key={i} className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                <div className="bg-emerald-600 text-white text-center py-1 text-[1.5vh] font-medium">
                  Giám định {i}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-[4vh] font-bold text-emerald-600">
                    {refereeScores[i-1] || '0.00'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Choose Arena Modal */}
        <div className={`fixed inset-0 z-50 ${showChooseArenaNoModal ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h5 className="text-lg font-semibold text-slate-800">
                <i className="fa-solid fa-id-badge mr-2 text-slate-500"></i>Chọn thông tin
              </h5>
              <button onClick={() => this.setState({ showChooseArenaNoModal: false })} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-2 mb-6">
                {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="tournamentRadio" 
                      checked={selectedTournament === i}
                      onChange={() => this.chooseTournament(i)} 
                      className="w-5 h-5 text-slate-500" 
                    />
                    <span className="font-medium text-slate-700">{tournament[1]}</span>
                  </label>
                )) : null}
              </div>
              <hr className="my-4" />
              <div className="flex justify-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="optionsArena" 
                    value="0" 
                    checked={selectedArena === 0}
                    onChange={() => this.handleArenaChange(0)}
                    className="peer sr-only" 
                  />
                  <div className="p-4 text-center border-2 border-slate-200 rounded-xl peer-checked:border-slate-500 peer-checked:bg-slate-50 hover:bg-slate-50 transition-all">
                    <i className="fa-solid fa-chess-board text-3xl text-slate-600 mb-2"></i>
                    <div className="font-semibold text-slate-700">Sân A</div>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="optionsArena" 
                    value="1" 
                    checked={selectedArena === 1}
                    onChange={() => this.handleArenaChange(1)}
                    className="peer sr-only" 
                  />
                  <div className="p-4 text-center border-2 border-slate-200 rounded-xl peer-checked:border-slate-500 peer-checked:bg-slate-50 hover:bg-slate-50 transition-all">
                    <i className="fa-solid fa-chess-board text-3xl text-slate-600 mb-2"></i>
                    <div className="font-semibold text-slate-700">Sân B</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button onClick={this.chooseArenaNo} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors">OK</button>
              <button onClick={() => this.setState({ showChooseArenaNoModal: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Cancel</button>
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
                <button onClick={this.submitInput} className="py-4 text-2xl font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors">
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
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h5 className="text-lg font-semibold text-slate-800">
                <i className="fa-solid fa-lock mr-2 text-slate-500"></i>Vui lòng nhập mật khẩu
              </h5>
              <button onClick={() => this.setState({ showPasswordModal: false })} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
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
              <button onClick={this.verifyPassword} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors">OK</button>
              <button onClick={() => this.setState({ showPasswordModal: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        <div className={`fixed inset-0 z-50 ${showModalConfirm ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h5 className="text-lg font-semibold text-slate-800">{confirmModalTitle}</h5>
              <button onClick={() => this.setState({ showModalConfirm: false })} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <div className="p-6 text-slate-600" dangerouslySetInnerHTML={{ __html: confirmModalBody }}></div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button onClick={this.confirmSubmit} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors">OK</button>
              <button onClick={() => this.setState({ showModalConfirm: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>

        {/* Shortcut Modal */}
        <div className={`fixed inset-0 z-50 ${showModalShortcut ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h5 className="text-lg font-semibold text-slate-800">
                <i className="fa-solid fa-keyboard mr-2 text-slate-500"></i>Các phím tắt
              </h5>
              <button onClick={() => this.setState({ showModalShortcut: false })} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-slate-600">Biểu Tượng</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-slate-600">Tên phím</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-slate-600">Chức năng</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-slate-600">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-100"><td className="py-2 px-4 font-mono">←</td><td className="py-2 px-4">Trái</td><td className="py-2 px-4">Lùi trận trước</td><td className="py-2 px-4"></td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 px-4 font-mono">→</td><td className="py-2 px-4">Phải</td><td className="py-2 px-4">Đến trận tiếp theo</td><td className="py-2 px-4"></td></tr>
                  <tr><td className="py-2 px-4 font-mono">—</td><td className="py-2 px-4">Cách</td><td className="py-2 px-4">Điều khiển đồng hồ</td><td className="py-2 px-4 text-slate-500">Space</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-6 py-4 border-t bg-slate-50">
              <button onClick={() => this.setState({ showModalShortcut: false })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">Đóng</button>
            </div>
          </div>
        </div>

        {/* Choose Match Modal - Grouped by Content Type */}
        <div className={`fixed inset-0 z-50 ${showModalChooseMatch ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-600">
              <h5 className="text-lg font-semibold text-white">
                <i className="fa-solid fa-list mr-2"></i>Chọn trận theo nội dung
              </h5>
              <button onClick={() => this.setState({ showModalChooseMatch: false })} className="text-white/80 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-4 max-h-[65vh] overflow-y-auto">
              {Object.keys(matchGroups).length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(matchGroups).map(([contentName, matches], gi) => (
                    <div key={gi} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Content/Match Type Header */}
                      <div className="bg-emerald-600 px-4 py-3 font-bold text-white flex items-center gap-2">
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
                                  : 'bg-white hover:bg-emerald-100 border-slate-200 hover:border-emerald-500'
                              }`}
                            >
                              <div className={`text-lg font-bold ${isCurrentMatch ? 'text-white' : 'text-emerald-600'}`}>{m.no}</div>
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

        <div style={{ display: 'none' }}>
          <audio ref={this.soundRef}>
            <source src={sound} type="audio/ogg" />
          </audio>
        </div>
        <ToastContainer />
      </div>
    );
  }
}

export default GiamSatThiQuyenContainer;
