import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, child, onValue, off, Database, DatabaseReference } from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/School_Bell.mp3';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import constants
import { COLORS } from '../constants/colors';
import { ROUNDS, REFEREE_COUNT, TIME_SCORE } from '../constants/rounds';
import { DEFAULT_COMBAT_CONST, DEFAULT_MATCH_OBJ } from '../constants/settings';

// Import utils
import { convertWinLoseFormat, getModes, resizeTextToFit } from '../utils/helpers';

// Import Score Sync utilities
import { subscribeScoreForGiamSat } from '../utils/scoreSync';

// Import Offline Service
import {
    isOnline,
    onNetworkChange,
    cacheCombatArena,
    getCachedCombatArena,
    smartSet,
    smartUpdate,
    syncPendingWrites,
    getPendingWritesCount
} from '../services/offlineService';

// Import components
import FighterInfoModal from '../components/combat/FighterInfoModal';

// Import types
import {
    Tournament,
    TournamentSetting,
    CombatMatch,
    CombatArena,
    RefereeScore,
    Fighter
} from '../types';

// Props interface
interface GiamSatDoiKhangProps {
    // Add any props if needed
}

// State interface
interface GiamSatDoiKhangState {
    data: any[];
    isShowFiveReferee: boolean;
    isPrioritizeUnitName: boolean;
    // Password modal
    showPasswordModal: boolean;
    password: string;
    // Arena selection modal
    showChooseArenaNoModal: boolean;
    // Match choose modal
    showModalChooseMatch: boolean;
    matchChooseValue: string;
    // Confirm modal
    showModalConfirm: boolean;
    confirmTitle: string;
    confirmBody: string;
    confirmWinnerColor: 'red' | 'blue' | null;
    // Shortcut modal
    showModalShortcut: boolean;
    // Quick menu dropdown
    showQuickMenu: boolean;
    // Fighter info modal
    showModalFighterInfo: boolean;
    // Display values
    tournamentName: string;
    arenaName: string;
    matchNo: number;
    matchType: string;
    matchCategory: string;
    matchTime: string;
    matchRound: string | number;
    redFighterName: string;
    redCode: string;
    redScore: number;
    blueFighterName: string;
    blueCode: string;
    blueScore: number;
    showMatchPrev: boolean;
    showMatchNext: boolean;
    iconWinRed: boolean;
    iconWinBlue: boolean;
    // Timer background color
    timerBgColor: string;
    // Score background colors
    redScoreBgColor: string;
    redScoreColor: string;
    blueScoreBgColor: string;
    blueScoreColor: string;
    // Referee scores
    refereeScores: Array<{ redScore: number; blueScore: number; redBg: string; redColor: string; blueBg: string; blueColor: string }>;
    // Caution values
    remindRed: number;
    warningRed: number;
    medicalRed: number;
    fallRed: number;
    boundRed: number;
    remindBlue: number;
    warningBlue: number;
    medicalBlue: number;
    fallBlue: number;
    boundBlue: number;
    // Leg strike images
    redLegStrikeSrc: string;
    blueLegStrikeSrc: string;
    redLegStrikeActive: boolean;
    blueLegStrikeActive: boolean;
    // Visibility
    showRedFlag: boolean;
    showBlueFlag: boolean;
    showRedCaution: boolean;
    showBlueCaution: boolean;
    showInternetStatus: boolean;
    showHelpModal: boolean;
    // Offline mode
    isOffline: boolean;
    pendingWritesCount: number;
}

// Tournament info tuple type
type TournamentInfo = [number, string];

// Combat const type
interface CombatConstType {
    lastMatch: { no: number };
    referee: RefereeScore[];
    combat: CombatMatch[];
}

// Match object type
interface MatchObjType {
    match: { no: number; type: string; category: string; win: string };
    fighters: {
        redFighter: Fighter;
        blueFighter: Fighter;
    };
}

class GiamSatDoiKhangContainer extends Component<GiamSatDoiKhangProps, GiamSatDoiKhangState> {
    // Firebase listener references for cleanup
    firebaseListeners: DatabaseReference[] = [];

    // Score listener cleanup function
    scoreCleanup: (() => void) | null = null;
    
    // Offline network listener cleanup
    networkCleanup: (() => void) | null = null;

    // Firebase database reference
    db: Database;

    // Round constants
    fistRound: number | string;
    breakRound: number | string;
    secondRound: number | string;
    breakExtraRound: number | string;
    extraRound: number | string;

    // Color constants
    greenColor: string;
    yellowColor: string;
    redColor: string;
    grayColor: string;
    whiteColor: string;
    blackColor: string;
    orangeColor: string;
    bodyBgColor: string;
    silverColor: string;

    // Timer related
    timeScore: number;
    numReferee: number;
    timerCoundown: number | undefined;
    timer: ReturnType<typeof setInterval> | false | undefined;
    effectTimer: ReturnType<typeof setInterval> | undefined;
    scoreTimer: ReturnType<typeof setInterval> | undefined;
    isTimerRunning: boolean;
    scoreTimerCount: number;
    isHumanPauseTimer: boolean;

    // Time settings
    timeBreak: number = 0;
    timeExtra: number = 0;
    timeExtraBreak: number = 0;

    // Match related
    round: number | string;
    matchNoCurrent: number | undefined;
    matchNoCurrentIndex: number | undefined;
    combatObj: CombatMatch[] | null;
    settingObj: TournamentSetting | null;
    refereeObj: RefereeScore[] | null;
    lastMatchObj: { no: number } | null;
    match: CombatMatch | null;
    temporaryWin: string | null;

    // Tournament related
    tournamentObj: Tournament[] | null = null;
    tournaments: TournamentInfo[] = [];
    combatArenaNoIndex: number;
    tournamentNoIndex: number;
    arenaNo: string = 'A';

    // Fighter country
    countryRed: string;
    countryBlue: string;

    // Display time
    minutes: string = "00";
    seconds: string = "00";

    // Referee display
    isFirstRefereeScore: boolean;

    // Default objects
    combatConst: CombatConstType;
    matchObj: MatchObjType;

    // Confirm callback
    confirmCallback: (() => void) | null = null;

    // Leg strike images
    legStrikeWhite: string;
    legStrikeBlack: string;

    constructor(props: GiamSatDoiKhangProps) {
        super(props);
        document.title = 'Giám Sát Đối Kháng';

        this.db = database;

        // Load leg strike images
        this.legStrikeWhite = require('../assets/img/donchan_white.png');
        this.legStrikeBlack = require('../assets/img/donchan_black.png');

        // Initialize state
        this.state = {
            data: [],
            isShowFiveReferee: false,
            isPrioritizeUnitName: false,
            showPasswordModal: true,
            password: '',
            showChooseArenaNoModal: false,
            showModalChooseMatch: false,
            matchChooseValue: '',
            showModalConfirm: false,
            confirmTitle: '',
            confirmBody: '',
            confirmWinnerColor: null,
            showModalShortcut: false,
            showQuickMenu: false,
            showModalFighterInfo: false,
            tournamentName: '',
            arenaName: '',
            matchNo: 0,
            matchType: '',
            matchCategory: '',
            matchTime: '00:00',
            matchRound: '',
            redFighterName: '',
            redCode: '',
            redScore: 0,
            blueFighterName: '',
            blueCode: '',
            blueScore: 0,
            showMatchPrev: true,
            showMatchNext: true,
            iconWinRed: false,
            iconWinBlue: false,
            timerBgColor: this.silverColor,
            redScoreBgColor: 'red',
            redScoreColor: 'white',
            blueScoreBgColor: 'blue',
            blueScoreColor: 'white',
            refereeScores: Array(5).fill({ redScore: 0, blueScore: 0, redBg: '', redColor: 'red', blueBg: '', blueColor: 'blue' }),
            remindRed: 0,
            warningRed: 0,
            medicalRed: 0,
            fallRed: 0,
            boundRed: 0,
            remindBlue: 0,
            warningBlue: 0,
            medicalBlue: 0,
            fallBlue: 0,
            boundBlue: 0,
            redLegStrikeSrc: this.legStrikeBlack,
            blueLegStrikeSrc: this.legStrikeBlack,
            redLegStrikeActive: false,
            blueLegStrikeActive: false,
            showRedFlag: false,
            showBlueFlag: false,
            showRedCaution: false,
            showBlueCaution: false,
            showInternetStatus: false,
            showHelpModal: false,
            // Offline mode
            isOffline: !isOnline(),
            pendingWritesCount: getPendingWritesCount(),
        };

        // Use constants instead of hardcoded values
        this.fistRound = ROUNDS.FIRST;
        this.breakRound = ROUNDS.BREAK;
        this.secondRound = ROUNDS.SECOND;
        this.breakExtraRound = ROUNDS.BREAK_EXTRA;
        this.extraRound = ROUNDS.EXTRA;

        // Colors from constants
        this.greenColor = COLORS.GREEN;
        this.yellowColor = COLORS.YELLOW;
        this.redColor = COLORS.RED;
        this.grayColor = COLORS.GRAY;
        this.whiteColor = COLORS.WHITE;
        this.blackColor = COLORS.BLACK;
        this.orangeColor = COLORS.ORANGE;
        this.bodyBgColor = COLORS.BODY_BG;
        this.silverColor = COLORS.SILVER;

        this.timeScore = TIME_SCORE;
        this.numReferee = REFEREE_COUNT.DEFAULT;

        this.timerCoundown = undefined;
        this.round = this.fistRound;
        this.matchNoCurrent = undefined;
        this.matchNoCurrentIndex = undefined;
        this.combatObj = null;
        this.settingObj = null;
        this.refereeObj = null;
        this.lastMatchObj = null;
        this.match = null;
        this.timer = undefined;
        this.effectTimer = undefined;
        this.scoreTimer = undefined;
        this.isFirstRefereeScore = false;
        this.isTimerRunning = false;
        this.scoreTimerCount = this.timeScore;
        this.temporaryWin = null;
        this.countryRed = "red";
        this.countryBlue = "blue";
        this.combatArenaNoIndex = 0;
        this.tournamentNoIndex = 0;
        this.isHumanPauseTimer = false;

        // Use constants for default objects
        this.combatConst = JSON.parse(JSON.stringify(DEFAULT_COMBAT_CONST));
        this.matchObj = JSON.parse(JSON.stringify(DEFAULT_MATCH_OBJ));
    }

    componentDidMount(): void {
        document.addEventListener("keydown", this._handleKeyDown);
        window.onresize = () => resizeTextToFit('referee-score-area-top', 'tournamentName');
        
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
        this.setState({ showPasswordModal: true });
    }

    componentWillUnmount(): void {
        // Cleanup event listeners
        document.removeEventListener("keydown", this._handleKeyDown);
        window.onresize = null;

        // Cleanup timers
        if (this.timer) {
            clearInterval(this.timer);
        }
        if (this.effectTimer) {
            clearInterval(this.effectTimer);
        }
        if (this.scoreTimer) {
            clearInterval(this.scoreTimer);
        }

        // Cleanup Firebase listeners
        this.firebaseListeners.forEach(listenerRef => {
            off(listenerRef);
        });
        this.firebaseListeners = [];

        // Cleanup score listener
        if (this.scoreCleanup) {
            this.scoreCleanup();
        }
        
        // Cleanup network listener
        if (this.networkCleanup) {
            this.networkCleanup();
        }
    }

    autoVerifyPassword = (savedPassword: string): void => {
        const passwordRef = ref(this.db, 'commonSetting/passwordGiamSat');
        onValue(passwordRef, (snapshot) => {
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
        const password = this.state.password;

        if (password != null && password !== "") {
            const passwordRef = ref(this.db, 'commonSetting/passwordGiamSat');
            onValue(passwordRef, (snapshot) => {
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
            if (this.settingObj && this.settingObj.combat.isShowArenaB === true) {
                this.setState({ showChooseArenaNoModal: true });
            } else {
                this.showTournamentInfo();
            }
        });
    }

    chooseArenaNo = (): void => {
        const arenaRadio = document.querySelector("input[name='optionsArena']:checked") as HTMLInputElement;
        const combatArenaNo = arenaRadio?.value;
        if (combatArenaNo != null && combatArenaNo !== "") {
            this.setState({ showChooseArenaNoModal: false });
            this.combatArenaNoIndex = parseInt(combatArenaNo, 10);
            this.arenaNo = this.combatArenaNoIndex === 0 ? 'A' : 'B';
            
            this.showTournamentInfo();
        }
    }

    /**
     * Load data từ cache khi offline
     */
    tryLoadFromCache = (): void => {
        const cached = getCachedCombatArena(this.tournamentNoIndex, this.combatArenaNoIndex);
        if (cached) {
            console.log('[Offline] Loading from cache...');
            
            this.combatObj = cached.combat;
            this.settingObj = cached.settings;
            this.matchNoCurrent = cached.lastMatch || 1;
            this.matchNoCurrentIndex = this.matchNoCurrent - 1;
            
            if (this.combatObj) {
                this.match = this.combatObj[this.matchNoCurrentIndex];
            }
            if (this.refereeObj == null) {
                this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
            }
            
            this.showValue();
            console.log('[Offline] Loaded match', this.matchNoCurrent, 'from cache');
        } else {
            console.warn('[Offline] No cache available');
        }
    }

    showTournamentInfo = (): void => {
        get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/combatArenaName')).then((snapshot) => {
            this.setState({ arenaName: snapshot.val() || '' });
        });
        get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
            this.settingObj = snapshot.val();
            if (!this.settingObj) return;

            this.setState({ tournamentName: this.settingObj.tournamentName });
            resizeTextToFit('referee-score-area-top', 'tournamentName');
            this.timerCoundown = this.settingObj.combat.timeRound;
            this.timeBreak = this.settingObj.combat.timeBreak;
            this.timeExtra = this.settingObj.combat.timeExtra;
            this.timeExtraBreak = this.settingObj.combat.timeExtraBreak;
            
            if (this.settingObj.combat.isShowCountryFlag === true) {
                this.setState({ showRedFlag: true, showBlueFlag: true });
            }
            if (this.settingObj.combat.isShowCautionBox === true) {
                this.setState({ showRedCaution: true, showBlueCaution: true });
            }
            this.numReferee = this.settingObj.combat.isShowFiveReferee === true ? REFEREE_COUNT.FIVE : REFEREE_COUNT.DEFAULT;
            this.setState({ 
                isShowFiveReferee: this.settingObj.combat.isShowFiveReferee || false,
                isPrioritizeUnitName: this.settingObj.combat.isPrioritizeUnitName || false
            });

            this.startEffectTimer();

            // Store Firebase listener references for cleanup
            const combatRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat');
            this.firebaseListeners.push(combatRef);
            onValue(combatRef, (snapshot) => {
                this.combatObj = snapshot.val();
                
                // Cache data for offline mode
                if (this.combatObj) {
                    cacheCombatArena(this.tournamentNoIndex, this.combatArenaNoIndex, {
                        combat: this.combatObj,
                        settings: this.settingObj,
                        arenaName: this.state.arenaName
                    });
                }
                
                if (this.lastMatchObj == null) {
                    this.matchNoCurrent = this.combatConst.lastMatch.no;
                    this.matchNoCurrentIndex = this.matchNoCurrent - 1;
                }
                
                // Luôn update this.match từ combatObj để nhận realtime updates
                if (this.combatObj && this.matchNoCurrentIndex !== undefined) {
                    this.match = this.combatObj[this.matchNoCurrentIndex];
                }
                
                if (this.refereeObj == null) {
                    // Deep copy để tránh reference mutation
                    this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
                }
                this.showValue();
            }, (error) => {
                // Firebase error - có thể do mất mạng
                console.warn('[Offline] Firebase error, trying cache:', error);
                this.tryLoadFromCache();
            });

            const lastMatchRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch');
            this.firebaseListeners.push(lastMatchRef);
            onValue(lastMatchRef, (snapshot) => {
                this.lastMatchObj = snapshot.val();
                if (this.lastMatchObj) {
                    this.matchNoCurrent = this.lastMatchObj.no;
                    this.matchNoCurrentIndex = this.matchNoCurrent - 1;
                    if (this.combatObj) {
                        this.match = this.combatObj[this.matchNoCurrentIndex];
                    }
                    
                    // Update cache with lastMatch
                    cacheCombatArena(this.tournamentNoIndex, this.combatArenaNoIndex, {
                        lastMatch: this.matchNoCurrent
                    });
                }
                this.showValue();
            });

            // Subscribe to score updates from Firebase
            this.scoreCleanup = subscribeScoreForGiamSat(
                {
                    db: this.db,
                    tournamentNoIndex: this.tournamentNoIndex,
                    combatArenaNoIndex: this.combatArenaNoIndex,
                    arena: this.combatArenaNoIndex === 0 ? 'A' : 'B'
                },
                this.numReferee,
                (refereeIndex: number, redScore: number, blueScore: number) => {
                    // Initialize refereeObj if not exists
                    if (!this.refereeObj) {
                        this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
                    }
                    // Update referee object when receiving score
                    if (this.refereeObj[refereeIndex]) {
                        // Firebase gửi cả 2 giá trị (bao gồm reset về 0)
                        this.refereeObj[refereeIndex].redScore = redScore;
                        this.refereeObj[refereeIndex].blueScore = blueScore;
                        this.showValue();
                    }
                }
            );

            //Kiểm tra kết nối internet
            const connectedRef = ref(this.db, '.info/connected');
            this.firebaseListeners.push(connectedRef);
            onValue(connectedRef, (snapshot) => {
                this.setState({ showInternetStatus: !snapshot.val() });
            });
        });
    }


    chooseTournament = (tournamentNoIndex: number): void => {
        this.tournamentNoIndex = tournamentNoIndex;
    }

    _handleKeyDown = (e: KeyboardEvent): void => {
        // ESC - Đóng modal đang mở
        if (e.which === 27) {
            const { showPasswordModal, showChooseArenaNoModal, showModalChooseMatch, showModalConfirm, showHelpModal, showModalFighterInfo } = this.state;
            if (showPasswordModal) {
                this.setState({ showPasswordModal: false });
            } else if (showChooseArenaNoModal) {
                this.setState({ showChooseArenaNoModal: false });
            } else if (showModalChooseMatch) {
                this.setState({ showModalChooseMatch: false });
            } else if (showModalConfirm) {
                this.setState({ showModalConfirm: false, confirmWinnerColor: null });
            } else if (showModalFighterInfo) {
                this.setState({ showModalFighterInfo: false });
            } else if (showHelpModal) {
                this.setState({ showHelpModal: false });
            }
            return;
        }
        //Space
        if (e.which === 32) {
            this.startTimer();
        }
        //Left arrow
        if (e.which === 37) {
            this.redSubtraction();
        }
        //Up arrow
        if (e.which === 38) {
            this.redAddition();
        }
        //Right arrow
        if (e.which === 39) {
            this.blueAddition();
        }
        //Down arrow
        if (e.which === 40) {
            this.blueSubtraction();
        }
        //D
        if (e.which === 68) {
            this.redWin();
        }
        //X
        if (e.which === 88) {
            this.blueWin();
        }
        //C
        if (e.which === 67) {
            this.chooseMatch();
        }
        //T
        if (e.which === 84) {
            this.prevMatch();
        }
        //R - Reset timer
        if (e.which === 82) {
            this.resetTimer();
        }
        //I - Mở modal thông tin VĐV
        if (e.which === 73) {
            this.setState({ showModalFighterInfo: true });
        }
    }

    formatRoundDisplay = (round: string | number): string => {
        if (round === 1) return 'Hiệp 1';
        if (round === 2) return 'Hiệp 2';
        if (round === 'break') return 'Nghỉ';
        if (round === 'break_extra') return 'Nghỉ';
        if (round === 'extra') return 'Hiệp phụ';
        return String(round);
    }

    showValue(): void {
        // Early return if match data not loaded
        if (!this.match) {
            return;
        }


        //Khung thông tin về trận đấu
        const newState: Partial<GiamSatDoiKhangState> = {};

        newState.matchNo = this.match.match.no;
        newState.matchType = this.match.match.type;
        newState.matchCategory = this.match.match.category;

        //Khung thời gian
        if (this.timerCoundown === undefined || this.timerCoundown < 0) {
            this.minutes = "00";
            this.seconds = "00";
            newState.timerBgColor = this.redColor;
        } else {
            const minutes = Math.floor(this.timerCoundown / 60);
            const seconds = Math.floor(this.timerCoundown - (minutes * 60));
            this.minutes = minutes < 10 ? "0" + minutes : "" + minutes;
            this.seconds = seconds < 10 ? "0" + seconds : "" + seconds;
        }
        newState.matchTime = this.minutes + ":" + this.seconds;

        if (this.timerCoundown !== undefined && this.timerCoundown > 0) {
            const isMainRound = this.round === this.fistRound || this.round === this.secondRound || this.round === this.extraRound;
            const isBreakRound = this.round === this.breakRound || this.round === this.breakExtraRound;

            if (this.isTimerRunning) {
                //Đổi màu trạng thái running cho đồng hồ đang chạy
                if (isMainRound) {
                    newState.timerBgColor = this.greenColor;
                } else if (isBreakRound) {
                    newState.timerBgColor = this.orangeColor;
                }
            } else {
                //Đổi màu trạng thái dừng cho đồng hồ
                if (isMainRound) {
                    if (this.round === this.fistRound && this.settingObj && this.timerCoundown === this.settingObj.combat.timeRound) {
                        newState.timerBgColor = this.silverColor;
                    } else {
                        newState.timerBgColor = this.yellowColor;
                    }
                } else if (isBreakRound) {
                    newState.timerBgColor = this.yellowColor;
                }
            }
        }
        newState.matchRound = this.formatRoundDisplay(this.round);
        //Khung cúp cho người chiến thắng
        if (this.match.match.win === "red") {
            newState.iconWinRed = true;
            newState.iconWinBlue = false;
        } else if (this.match.match.win === "blue") {
            newState.iconWinBlue = true;
            newState.iconWinRed = false;
        } else {
            newState.iconWinRed = false;
            newState.iconWinBlue = false;
        }

        //Khung thông tin vận động viên
        const redFighter = this.match.fighters.redFighter;
        const blueFighter = this.match.fighters.blueFighter;

        newState.redFighterName = convertWinLoseFormat(redFighter.name);
        newState.redCode = redFighter.code;
        this.countryRed = redFighter.country !== "" ? redFighter.country : "red";
        newState.redScore = redFighter.score;

        newState.blueFighterName = convertWinLoseFormat(blueFighter.name);
        newState.blueCode = blueFighter.code;
        newState.blueScore = blueFighter.score;
        this.countryBlue = blueFighter.country !== "" ? blueFighter.country : "blue";

        //Khung chuyển trận đấu
        //Xóa nút next và Prev nếu gặp biên
        if (this.matchNoCurrent === 1) {
            newState.showMatchPrev = false;
            newState.showMatchNext = true;
        } else if (this.combatObj && this.matchNoCurrent === this.combatObj.length) {
            newState.showMatchPrev = true;
            newState.showMatchNext = false;
        } else {
            newState.showMatchPrev = true;
            newState.showMatchNext = true;
        }

        //Khung các giám định - Hiện điểm các giám định
        if (this.refereeObj && this.combatObj && this.matchNoCurrentIndex !== undefined) {
            // Use smartSet for offline support
            smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex, this.combatObj[this.matchNoCurrentIndex]);

            const refereeScores = [];
            for (let i = 0; i < this.numReferee; i++) {
                const refereeData = this.refereeObj[i];
                if (refereeData) {
                    refereeScores.push({
                        redScore: refereeData.redScore,
                        blueScore: refereeData.blueScore,
                        redBg: refereeData.redScore !== 0 ? 'red' : '',
                        redColor: refereeData.redScore !== 0 ? 'white' : 'red',
                        blueBg: refereeData.blueScore !== 0 ? 'blue' : '',
                        blueColor: refereeData.blueScore !== 0 ? 'white' : 'blue',
                    });
                }
            }
            newState.refereeScores = refereeScores;
        }

        //caution area
        const redCaution = redFighter.caution;
        const blueCaution = blueFighter.caution;

        newState.remindRed = redCaution.remind;
        newState.warningRed = redCaution.warning;
        newState.medicalRed = redCaution.medical;
        newState.fallRed = redCaution.fall;
        newState.boundRed = redCaution.bound;

        newState.remindBlue = blueCaution.remind;
        newState.warningBlue = blueCaution.warning;
        newState.medicalBlue = blueCaution.medical;
        newState.fallBlue = blueCaution.fall;
        newState.boundBlue = blueCaution.bound;

        // Leg strike icons
        newState.redLegStrikeSrc = redFighter.legStrike ? this.legStrikeWhite : this.legStrikeBlack;
        newState.blueLegStrikeSrc = blueFighter.legStrike ? this.legStrikeWhite : this.legStrikeBlack;
        newState.redLegStrikeActive = redFighter.legStrike || false;
        newState.blueLegStrikeActive = blueFighter.legStrike || false;

        this.setState(newState as GiamSatDoiKhangState);

    }

    saveMatch(): void {
        if (this.match && this.matchNoCurrentIndex !== undefined) {
            // Use smartUpdate for offline support (merge data, không ghi đè)
            smartUpdate(
                this.db,
                'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex,
                this.match
            );
        }
    }

    //Gõ số để đi đến trận đấu
    chooseMatch = (): void => {

        const matchChooseStr = this.state.matchChooseValue;
        const matchChoose = parseInt(matchChooseStr, 10);

        if (matchChooseStr != null && matchChooseStr !== "") {
            if (this.combatObj && (matchChoose < 1 || matchChoose > this.combatObj.length)) {
                toast.error("Vui lòng nhập số thứ tự trận đấu lớn hơn 1!");
                return;
            }
            this.setState({ showModalChooseMatch: false, matchChooseValue: '' });
            this.matchNoCurrent = matchChoose;
            this.restoreMatch();
        }
    }

    nextMatch = (): void => {
        if (this.timer === undefined || this.timer === false) {
            if (this.matchNoCurrent !== undefined) {
                this.matchNoCurrent++;
                this.restoreMatch();
            }
        } else {
            this.confirmCallback = () => {
                if (this.matchNoCurrent !== undefined) {
                    this.matchNoCurrent++;
                    this.restoreMatch();
                    this.setState({ showModalConfirm: false });
                }
            };
            this.setState({
                showModalConfirm: true,
                confirmTitle: "Xác nhận",
                confirmBody: "Bạn muốn dừng trận đấu và đến trận đấu kế tiếp?"
            });
        }
    }

    prevMatch = (): void => {
        if (this.timer === undefined || this.timer === false) {
            if (this.matchNoCurrent !== undefined) {
                this.matchNoCurrent--;
                this.restoreMatch();
            }
        } else {
            this.confirmCallback = () => {
                if (this.matchNoCurrent !== undefined) {
                    this.matchNoCurrent--;
                    this.restoreMatch();
                    this.setState({ showModalConfirm: false });
                }
            };
            this.setState({
                showModalConfirm: true,
                confirmTitle: "Xác nhận",
                confirmBody: "Bạn muốn dừng trận đấu và về trận đấu trước đó?"
            });
        }
    }

    restoreMatch(): void {
        this.setState({
            redScoreBgColor: 'red',
            redScoreColor: this.whiteColor,
            blueScoreBgColor: 'blue',
            blueScoreColor: this.whiteColor,
        });
        this.stopTimer();
        this.round = this.fistRound;
        if (this.settingObj) {
            this.timerCoundown = this.settingObj.combat.timeRound;
        }
        this.isTimerRunning = false;
        this.setState({ timerBgColor: this.silverColor });
        if (this.timerCoundown !== undefined) {
            const minutes = Math.floor(this.timerCoundown / 60);
            const seconds = Math.floor(this.timerCoundown - (minutes * 60));
            this.minutes = minutes < 10 ? "0" + minutes : String(minutes);
            this.seconds = seconds < 10 ? "0" + seconds : String(seconds);
        }
        
        this.setState({
            matchTime: this.minutes + ":" + this.seconds,
            matchRound: this.formatRoundDisplay(this.round)
        });
        
        // Update lastMatch - use smartSet for offline support
        if (this.matchNoCurrent !== undefined) {
            const lastMatchPath = 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch/no';
            smartSet(this.db, lastMatchPath, this.matchNoCurrent);
            
            // Update local cache immediately
            cacheCombatArena(this.tournamentNoIndex, this.combatArenaNoIndex, {
                lastMatch: this.matchNoCurrent
            });
            
            // Update local match data from cache if offline
            if (this.state.isOffline && this.combatObj) {
                this.matchNoCurrentIndex = this.matchNoCurrent - 1;
                this.match = this.combatObj[this.matchNoCurrentIndex];
                this.showValue();
            }
        }
        
        const referees: RefereeScore[] = [];
        if (this.refereeObj) {
            for (let i = 0; i < this.numReferee; i++) {
                this.refereeObj[i] = { blueScore: 0, redScore: 0 };
                referees.push(this.refereeObj[i]);
            }
        }
        smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee', referees);
    }


    redWin = (): void => {
        if (!this.match || !this.combatObj || this.matchNoCurrent === undefined) return;

        const winMatch = "W." + this.matchNoCurrent;
        for (let i = this.matchNoCurrent; i < this.combatObj.length; i++) {
            const fightersTemp = this.combatObj[i].fighters;
            if (fightersTemp.redFighter.result === winMatch) {
                for (let j = i; j < this.combatObj.length; j++) {
                    const fightersTemp2 = this.combatObj[j].fighters;
                    const winMatch2 = "W." + j;
                    if (fightersTemp2.redFighter.result === winMatch2)
                        if (fightersTemp2.redFighter.name !== winMatch2) {
                            toast.error("Bạn không thể chấm lại trận đấu này!");
                            return;
                        }
                    if (fightersTemp2.blueFighter.result === winMatch2) {
                        if (fightersTemp2.blueFighter.name !== winMatch2) {
                            toast.error("Bạn không thể chấm lại trận đấu này!");
                            return;
                        }
                    }
                }
            }
        }

        this.temporaryWin = "red";

        this.confirmCallback = () => {
            if (this.temporaryWin === "red" && this.match && this.matchNoCurrentIndex !== undefined) {
                this.stopTimer();
                this.replaceFighter("red");
                setTimeout(() => {
                    if (this.match && this.matchNoCurrentIndex !== undefined) {
                        this.match.match.win = "red";
                        smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/match/win', "red");
                        this.setState({
                            iconWinRed: true,
                            iconWinBlue: false,
                            redScoreBgColor: 'red',
                            redScoreColor: this.whiteColor,
                            blueScoreBgColor: 'blue',
                            blueScoreColor: this.whiteColor,
                        });
                    }
                }, 1000);
                this.setState({ showModalConfirm: false, confirmWinnerColor: null });
            }
        };

        this.setState({
            showModalConfirm: true,
            confirmTitle: "<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>",
            confirmBody: "<h3 style='color: red'><i class='fa-solid fa-hand-back-fist'></i> " + convertWinLoseFormat(this.match.fighters.redFighter.name) + "</h3><h3 style='color: red'>" + this.match.fighters.redFighter.code + "</h3>",
            confirmWinnerColor: 'red'
        });
    }

    blueWin = (): void => {
        if (!this.match || !this.combatObj || this.matchNoCurrent === undefined) return;

        const winMatch = "W." + this.matchNoCurrent;
        for (let i = this.matchNoCurrent; i < this.combatObj.length; i++) {
            const fightersTemp = this.combatObj[i].fighters;
            if (fightersTemp.redFighter.result === winMatch) {
                for (let j = i; j < this.combatObj.length; j++) {
                    const fightersTemp2 = this.combatObj[j].fighters;
                    const winMatch2 = "W." + j;
                    if (fightersTemp2.redFighter.result === winMatch2)
                        if (fightersTemp2.redFighter.name !== winMatch2) {
                            toast.error("Bạn không thể chấm lại trận đấu này!");
                            return;
                        }
                    if (fightersTemp2.blueFighter.result === winMatch2) {
                        if (fightersTemp2.blueFighter.name !== winMatch2) {
                            toast.error("Bạn không thể chấm lại trận đấu này!");
                            return;
                        }
                    }
                }
            }
        }

        this.temporaryWin = "blue";

        this.confirmCallback = () => {
            if (this.temporaryWin === "blue" && this.match && this.matchNoCurrentIndex !== undefined) {
                this.stopTimer();
                this.replaceFighter("blue");
                setTimeout(() => {
                    if (this.match && this.matchNoCurrentIndex !== undefined) {
                        this.match.match.win = "blue";
                        smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/match/win', "blue");
                        this.setState({
                            iconWinBlue: true,
                            iconWinRed: false,
                            redScoreBgColor: 'red',
                            redScoreColor: this.whiteColor,
                            blueScoreBgColor: 'blue',
                            blueScoreColor: this.whiteColor,
                        });
                    }
                }, 1000);
                this.setState({ showModalConfirm: false, confirmWinnerColor: null });
            }
        };

        this.setState({
            showModalConfirm: true,
            confirmTitle: "<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>",
            confirmBody: "<h3 style='color: blue'><i class='fa-solid fa-hand-back-fist'></i> " + convertWinLoseFormat(this.match.fighters.blueFighter.name) + "</h3><h3 style='color: blue'>" + this.match.fighters.blueFighter.code + "</h3>",
            confirmWinnerColor: 'blue'
        });
    }

    redAddition = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.score++;
            this.saveMatch();
        }
    }

    blueAddition = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.score++;
            this.saveMatch();
        }
    }

    redSubtraction = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.score--;
            this.saveMatch();
        }
    }

    blueSubtraction = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.score--;
            this.saveMatch();
        }
    }

    remindRedDecrease = (): void => {
        if (this.match && this.match.fighters.redFighter.caution.remind > 0) {
            this.match.fighters.redFighter.caution.remind--;
        }
        this.saveMatch();
    }
    remindRedIncrease = (): void => {
        if (this.match && this.match.fighters.redFighter.caution.remind < 3) {
            this.match.fighters.redFighter.caution.remind++;
        }
        this.saveMatch();
    }
    warningRedDecrease = (): void => {
        if (this.match && this.match.fighters.redFighter.caution.warning > 0) {
            this.match.fighters.redFighter.caution.warning--;
            this.match.fighters.redFighter.score = this.match.fighters.redFighter.score + 2;
        }
        this.saveMatch();
    }
    warningRedIncrease = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.caution.warning++;
            this.match.fighters.redFighter.caution.remind = 0;
            this.match.fighters.redFighter.score = this.match.fighters.redFighter.score - 2;
        }
        this.saveMatch();
    }
    medicalRedDecrease = (): void => {
        if (this.match && this.match.fighters.redFighter.caution.medical > 0) {
            this.match.fighters.redFighter.caution.medical--;
        }
        this.saveMatch();
    }
    medicalRedIncrease = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.caution.medical++;
        }
        this.saveMatch();
    }
    fallRedDecrease = (): void => {
        if (this.match && this.match.fighters.redFighter.caution.fall > 0) {
            this.match.fighters.redFighter.caution.fall--;
            this.match.fighters.blueFighter.score--;
        }
        this.saveMatch();
    }
    fallRedIncrease = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.caution.fall++;
            this.match.fighters.blueFighter.score++;
        }
        this.saveMatch();
    }
    boundRedDecrease = (): void => {
        if (this.match && this.match.fighters.redFighter.caution.bound > 0) {
            this.match.fighters.redFighter.caution.bound--;
            this.match.fighters.redFighter.score++;
        }
        this.saveMatch();
    }
    boundRedIncrease = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.caution.bound++;
            this.match.fighters.redFighter.score--;
        }
        this.saveMatch();
    }

    remindBlueDecrease = (): void => {
        if (this.match && this.match.fighters.blueFighter.caution.remind > 0) {
            this.match.fighters.blueFighter.caution.remind--;
        }
        this.saveMatch();
    }
    remindBlueIncrease = (): void => {
        if (this.match && this.match.fighters.blueFighter.caution.remind < 3) {
            this.match.fighters.blueFighter.caution.remind++;
        }
        this.saveMatch();
    }
    warningBlueDecrease = (): void => {
        if (this.match && this.match.fighters.blueFighter.caution.warning > 0) {
            this.match.fighters.blueFighter.caution.warning--;
            this.match.fighters.blueFighter.score = this.match.fighters.blueFighter.score + 2;
        }
        this.saveMatch();
    }
    warningBlueIncrease = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.caution.warning++;
            this.match.fighters.blueFighter.caution.remind = 0;
            this.match.fighters.blueFighter.score = this.match.fighters.blueFighter.score - 2;
        }
        this.saveMatch();
    }
    medicalBlueDecrease = (): void => {
        if (this.match && this.match.fighters.blueFighter.caution.medical > 0) {
            this.match.fighters.blueFighter.caution.medical--;
        }
        this.saveMatch();
    }
    medicalBlueIncrease = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.caution.medical++;
        }
        this.saveMatch();
    }
    fallBlueDecrease = (): void => {
        if (this.match && this.match.fighters.blueFighter.caution.fall > 0) {
            this.match.fighters.blueFighter.caution.fall--;
            this.match.fighters.redFighter.score--;
        }
        this.saveMatch();
    }
    fallBlueIncrease = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.caution.fall++;
            this.match.fighters.redFighter.score++;
        }
        this.saveMatch();
    }
    boundBlueDecrease = (): void => {
        if (this.match && this.match.fighters.blueFighter.caution.bound > 0) {
            this.match.fighters.blueFighter.caution.bound--;
            this.match.fighters.blueFighter.score++;
        }
        this.saveMatch();
    }
    boundBlueIncrease = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.caution.bound++;
            this.match.fighters.blueFighter.score--;
        }
        this.saveMatch();
    }
    legStirkeRed = (): void => {
        if (this.match) {
            this.match.fighters.redFighter.legStrike = !this.match.fighters.redFighter.legStrike;
            this.saveMatch();
        }
    }
    legStirkeBlue = (): void => {
        if (this.match) {
            this.match.fighters.blueFighter.legStrike = !this.match.fighters.blueFighter.legStrike;
            this.saveMatch();
        }
    }

    //Hàm dùng để thay thế những trận đấu có ký hiệu W. và L. trong giải đấu
    replaceFighter(winColor: string): void {
        if (!this.match || !this.combatObj || this.matchNoCurrent === undefined) return;

        const matchWin = "W." + this.matchNoCurrent;
        const matchLose = "L." + this.matchNoCurrent;
        let winFighter: Fighter;
        let loseFighter: Fighter;

        if (winColor === "red") {
            winFighter = this.match.fighters.redFighter;
            loseFighter = this.match.fighters.blueFighter;
        } else {
            winFighter = this.match.fighters.blueFighter;
            loseFighter = this.match.fighters.redFighter;
        }

        for (let i = this.matchNoCurrent; i < this.combatObj.length; i++) {
            const fightersTemp = this.combatObj[i].fighters;
            if (fightersTemp.redFighter.result === matchWin) {
                fightersTemp.redFighter = JSON.parse(JSON.stringify(winFighter));
                fightersTemp.redFighter.result = matchWin;
                fightersTemp.redFighter.score = 0;
                smartUpdate(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters', fightersTemp);
                break;
            }

            if (fightersTemp.redFighter.result === matchLose) {
                fightersTemp.redFighter = JSON.parse(JSON.stringify(loseFighter));
                fightersTemp.redFighter.result = matchLose;
                fightersTemp.redFighter.score = 0;
                smartUpdate(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters', fightersTemp);
                break;
            }

            if (fightersTemp.blueFighter.result === matchWin) {
                fightersTemp.blueFighter = JSON.parse(JSON.stringify(winFighter));
                fightersTemp.blueFighter.result = matchWin;
                fightersTemp.blueFighter.score = 0;
                smartUpdate(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters', fightersTemp);
                break;
            }

            if (fightersTemp.blueFighter.result === matchLose) {
                fightersTemp.blueFighter = JSON.parse(JSON.stringify(loseFighter));
                fightersTemp.blueFighter.result = matchLose;
                fightersTemp.blueFighter.score = 0;
                smartUpdate(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters', fightersTemp);
                break;
            }
        }
    }

    makeScoreTimer(): void {
        if (!this.refereeObj || !this.match || this.matchNoCurrentIndex === undefined) return;

        for (let i = 0; i < this.numReferee; i++) {
            const referee = this.refereeObj[i];
            if (!referee) continue;
            
            if (referee.redScore !== 0 || referee.blueScore !== 0) {
                if (!this.isFirstRefereeScore) {
                    this.isFirstRefereeScore = true;
                }
                this.scoreTimerCount--;
                //Kết thúc nếu có >50% trọng tài chấm điểm
                let redScoreCounter = 0;
                let blueScoreCounter = 0;
                for (let j = 0; j < this.numReferee; j++) {
                    const refereeJ = this.refereeObj[j];
                    if (!refereeJ) continue;
                    if (refereeJ.redScore !== 0) {
                        redScoreCounter++;
                    }
                    if (refereeJ.blueScore !== 0) {
                        blueScoreCounter++;
                    }
                }
                if (this.scoreTimerCount === 0 || redScoreCounter > this.numReferee / 2 || blueScoreCounter > this.numReferee / 2) {
                    //Tổng kết và tính điểm
                    const redScoreArray: number[] = [];
                    const blueScoreArray: number[] = [];
                    for (let k = 0; k < this.numReferee; k++) {
                        redScoreArray.push(this.refereeObj[k].redScore);
                        blueScoreArray.push(this.refereeObj[k].blueScore);
                    }
                    this.match.fighters.redFighter.score += getModes(redScoreArray);
                    this.match.fighters.blueFighter.score += getModes(blueScoreArray);
                    smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/fighters', this.match.fighters);
                    //Reset Giám định
                    smartSet(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee', this.combatConst.referee);
                    // QUAN TRỌNG: Deep copy để tránh reference mutation
                    this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
                    this.scoreTimerCount = this.timeScore;
                    this.isFirstRefereeScore = false;
                    // Force UI update
                    this.showValue();
                    break;
                }
            }
        }
    }

    makeTimer(): void {
        if (this.timerCoundown === undefined) return;

        if (this.timerCoundown < 0) {
            //Hiệp 1 kết thúc
            if (this.round === this.fistRound) {
                this.round = this.breakRound;
                this.timerCoundown = this.timeBreak;
                this.setState({ timerBgColor: this.orangeColor });
            }
            //Nghỉ giữa hiệp kết thúc
            else if (this.round === this.breakRound) {
                this.round = this.secondRound;
                if (this.settingObj) {
                    this.timerCoundown = this.settingObj.combat.timeRound;
                }
                this.stopTimer();
                this.setState({ timerBgColor: this.yellowColor });
            }
            //Hiệp 2 kết thúc
            else if (this.round === this.secondRound) {
                //Hết trận
                if (this.match && this.match.fighters.redFighter.score !== this.match.fighters.blueFighter.score) {
                    this.stopTimer();
                    this.setState({ timerBgColor: this.redColor });
                    if (this.match.fighters.redFighter.score > this.match.fighters.blueFighter.score) {
                        this.redWin();
                    } else {
                        this.blueWin();
                    }
                    return;
                } else {
                    //Hiệp phụ khi kết quả hòa
                    this.round = this.breakExtraRound;
                    this.timerCoundown = this.timeExtraBreak;
                    this.setState({ timerBgColor: this.orangeColor });
                }
            }
            //Hết nghỉ hiệp phụ
            else if (this.round === this.breakExtraRound) {
                this.round = this.extraRound;
                this.timerCoundown = this.timeExtra;
                this.stopTimer();
                this.setState({ timerBgColor: this.yellowColor });
            }
            //Hiệp phụ kết thúc - Hết trận
            else if (this.round === this.extraRound) {
                this.stopTimer();
                this.setState({ timerBgColor: this.redColor });
                if (this.match && this.match.fighters.redFighter.score > this.match.fighters.blueFighter.score) {
                    this.redWin();
                } else if (this.match && this.match.fighters.redFighter.score < this.match.fighters.blueFighter.score) {
                    this.blueWin();
                }
                return;
            }
        }

        if (this.timerCoundown === 0) {
            this.setState({ timerBgColor: this.redColor });
            this.minutes = "00";
            this.seconds = "00";
            this.playSound();
        } else if (this.timerCoundown < 0) {
            this.minutes = "00";
            this.seconds = "00";
        } else {
            const minutes = Math.floor(this.timerCoundown / 60);
            const seconds = Math.floor(this.timerCoundown - (minutes * 60));
            this.minutes = minutes < 10 ? "0" + minutes : "" + minutes;
            this.seconds = seconds < 10 ? "0" + seconds : "" + seconds;
        }

        this.setState({
            matchTime: this.minutes + ":" + this.seconds,
            matchRound: this.formatRoundDisplay(this.round)
        });

        this.timerCoundown--;
    }

    startTimer = (): void => {
        if (this.timer) {
            this.stopTimer();
            this.setState({ timerBgColor: this.yellowColor });
            this.isHumanPauseTimer = true; //Trận đấu đang được dừng bằng tay
        } else {
            // Nếu trận đấu đang dừng bằng tay thì không phát tiếng
            if (this.isHumanPauseTimer) {
                this.isHumanPauseTimer = false;
            } else {
                this.playSound();
            }
            setTimeout(() => {
                this.timer = setInterval(() => {
                    this.makeTimer();
                }, 1000);
                this.isTimerRunning = true;
                this.setState({ timerBgColor: this.greenColor });
            }, 0);
        }
    }

    makeEffectTimer(): void {
        if (!this.match) return;

        if (this.match.match.win === "red") {
            this.setState(prevState => ({
                redScoreBgColor: prevState.redScoreBgColor === 'red' ? this.bodyBgColor : 'red',
                redScoreColor: prevState.redScoreBgColor === 'red' ? 'red' : this.whiteColor,
            }));
        } else if (this.match.match.win === "blue") {
            this.setState(prevState => ({
                blueScoreBgColor: prevState.blueScoreBgColor === 'blue' ? this.bodyBgColor : 'blue',
                blueScoreColor: prevState.blueScoreBgColor === 'blue' ? 'blue' : this.whiteColor,
            }));
        }
    }

    startEffectTimer(): void {
        if (!this.effectTimer) {
            this.effectTimer = setInterval(() => {
                this.makeEffectTimer();
            }, 500);
        }
        if (!this.scoreTimer) {
            this.scoreTimer = setInterval(() => {
                this.makeScoreTimer();
            }, 1000);
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
        // Reset về thời gian hiệp đầu
        if (this.settingObj) {
            this.timerCoundown = this.settingObj.combat.timeRound;
            this.round = this.fistRound;
            this.setState({ 
                timerBgColor: this.silverColor,
                matchRound: this.formatRoundDisplay(this.fistRound)
            });
            this.showValue();
        }
    }

    playSound(): void {
        const soundElement = document.getElementById("sound") as HTMLAudioElement;
        if (!soundElement || !soundElement.paused) {
            return;
        }
        soundElement.currentTime = 0;
        soundElement.play().catch(() => {
            // Silent fail for sound play
        });
    }

    inputPw = (value: string): void => {
        if (value === "-1") {
            this.setState({ password: '' });
        } else {
            this.setState(prevState => ({ password: prevState.password + value }));
        }
    }

    handleConfirmOK = (): void => {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
    }

    render(): React.ReactNode {
        const {
            showPasswordModal, password,
            showChooseArenaNoModal,
            showModalChooseMatch, matchChooseValue,
            showModalConfirm, confirmTitle, confirmBody, confirmWinnerColor,
            showModalShortcut,
            tournamentName, arenaName,
            matchNo, matchType, matchCategory, matchTime, matchRound,
            redFighterName, redCode, redScore,
            blueFighterName, blueCode, blueScore,
            showMatchPrev, showMatchNext,
            iconWinRed, iconWinBlue,
            timerBgColor,
            redScoreBgColor, redScoreColor,
            blueScoreBgColor, blueScoreColor,
            refereeScores,
            remindRed, warningRed, medicalRed, fallRed, boundRed,
            remindBlue, warningBlue, medicalBlue, fallBlue, boundBlue,
            redLegStrikeSrc, blueLegStrikeSrc,
            redLegStrikeActive, blueLegStrikeActive,
            showRedFlag, showBlueFlag,
            showRedCaution, showBlueCaution,
            showInternetStatus,
            isShowFiveReferee,
            isPrioritizeUnitName,
            showQuickMenu,
            showModalFighterInfo,
            showHelpModal
        } = this.state;

        // Calculate referee count for grid
        const refCount = isShowFiveReferee ? 5 : 3;

        // Process tournament name - replace <br>, </br>, <br/> with actual line breaks
        const processedTournamentName = tournamentName
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/br>/gi, '\n');

        // Build match list for dropdown
        const matchList: { no: number; type: string; category: string }[] = [];
        if (this.combatObj) {
            this.combatObj.forEach((match: any, idx: number) => {
                matchList.push({
                    no: idx + 1,
                    type: match.match?.type || '',
                    category: match.match?.category || ''
                });
            });
        }

        // Group matches by type+category
        const matchGroups: { [key: string]: { no: number; type: string; category: string }[] } = {};
        matchList.forEach(m => {
            const key = `${m.type} - ${m.category}` || 'Không xác định';
            if (!matchGroups[key]) matchGroups[key] = [];
            matchGroups[key].push(m);
        });

        return (
            <div className="h-screen w-screen bg-slate-100 flex flex-col overflow-hidden relative">
                {/* Loading Skeleton when no match data - covers entire screen */}
                {(!matchNo || matchNo === 0) && (
                    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-slate-100">
                        {/* Skeleton Header */}
                        <div className="bg-white border-b border-slate-200 py-2 px-4 flex items-center justify-between" style={{ minHeight: '5%' }}>
                            <div className="flex items-center gap-4 flex-1">
                                <div className="h-8 w-8 bg-slate-300 rounded"></div>
                                <div className="h-5 w-48 bg-slate-200 rounded"></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-20 bg-slate-200 rounded"></div>
                                <div className="h-8 w-28 bg-slate-200 rounded"></div>
                                <div className="h-8 w-24 bg-slate-200 rounded"></div>
                                <div className="h-8 w-8 bg-slate-300 rounded-full"></div>
                            </div>
                        </div>
                        {/* Skeleton Top Section */}
                        <div className="flex items-stretch" style={{ height: '35%' }}>
                            {/* Left Fighter Skeleton */}
                            <div className="bg-slate-400 flex flex-col justify-center items-center relative" style={{ width: '35%' }}>
                                <div className="absolute top-2 left-2 h-10 w-14 bg-slate-500 rounded"></div>
                                <div className="absolute top-2 right-2 h-10 w-10 bg-slate-500 rounded"></div>
                                <div className="text-center">
                                    <div className="h-10 w-48 bg-slate-500 rounded mb-3 mx-auto"></div>
                                    <div className="h-6 w-32 bg-slate-500 rounded mx-auto"></div>
                                </div>
                                <div className="absolute bottom-2 w-full px-2 flex justify-center gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex-1 max-w-[80px] h-16 bg-slate-500 rounded-lg"></div>
                                    ))}
                                </div>
                            </div>
                            {/* Timer Section Skeleton */}
                            <div className="flex flex-col justify-between items-center py-3 px-2 bg-slate-200" style={{ width: '30%' }}>
                                <div className="flex items-center gap-1">
                                    <div className="h-6 w-6 bg-slate-300 rounded-full"></div>
                                    <div className="h-5 w-20 bg-slate-300 rounded"></div>
                                    <div className="h-6 w-6 bg-slate-300 rounded-full"></div>
                                </div>
                                <div className="h-[16vh] w-[80%] bg-slate-400 rounded-2xl"></div>
                                <div className="h-6 w-24 bg-slate-300 rounded"></div>
                            </div>
                            {/* Right Fighter Skeleton */}
                            <div className="bg-slate-400 flex flex-col justify-center items-center relative" style={{ width: '35%' }}>
                                <div className="absolute top-2 left-2 h-10 w-14 bg-slate-500 rounded"></div>
                                <div className="absolute top-2 right-2 h-10 w-10 bg-slate-500 rounded"></div>
                                <div className="text-center">
                                    <div className="h-10 w-48 bg-slate-500 rounded mb-3 mx-auto"></div>
                                    <div className="h-6 w-32 bg-slate-500 rounded mx-auto"></div>
                                </div>
                                <div className="absolute bottom-2 w-full px-2 flex justify-center gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex-1 max-w-[80px] h-16 bg-slate-500 rounded-lg"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Skeleton Bottom Section */}
                        <div className="flex-1 flex items-stretch">
                            {/* Left Score Skeleton */}
                            <div className="flex-1 bg-slate-500 flex items-center justify-center">
                                <div className="h-[40vh] w-[30vh] bg-slate-600 rounded-xl"></div>
                            </div>
                            {/* Referee Score Skeleton */}
                            <div className="flex flex-col justify-center gap-2 px-4 py-4 bg-slate-200" style={{ width: '12%' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-slate-300 rounded-xl h-16 w-full"></div>
                                ))}
                            </div>
                            {/* Right Score Skeleton */}
                            <div className="flex-1 bg-slate-500 flex items-center justify-center">
                                <div className="h-[40vh] w-[30vh] bg-slate-600 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header - Tournament Info */}
                <div className="bg-white border-b border-slate-200 text-slate-800 py-2 px-4 flex items-center justify-between" style={{ minHeight: '5%' }}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Connection Status Dot */}
                        <span 
                            className={`status-dot w-3 h-3 rounded-full block flex-shrink-0 ${
                                !showInternetStatus ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            data-tooltip={!showInternetStatus ? 'Đã kết nối Internet' : 'Mất kết nối'}
                        ></span>
                        <a 
                            href="/" 
                            className="flex-shrink-0 flex items-center p-1.5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg shadow-sm hover:shadow hover:border-slate-300 transition-all"
                        >
                            <img src={logo} alt="logo" className="h-6" />
                        </a>
                    </div>
                    {/* Tournament Name - canh giua man hinh, ngay tren dong ho */}
                    <div className="text-center px-4 max-w-[50vw]" id="tournamentName">
                        <span className="text-[3.2vh] font-black uppercase tracking-wide text-coc-red leading-tight whitespace-pre-line">{processedTournamentName}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 flex-1 justify-end">
                        <span className="bg-slate-200 px-4 py-1.5 rounded font-bold text-base" id="arena-name">{arenaName}</span>
                        <span className={`font-bold text-base px-3 py-1.5 rounded ${matchType?.toLowerCase().includes('chung kết') ? 'bg-yellow-400 text-yellow-900' : matchType?.toLowerCase().includes('bán kết') ? 'bg-orange-400 text-orange-900' : ''}`} id="match-type">{matchType}</span>
                        <span className="font-semibold text-base" id="match-category">{matchCategory}</span>
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
                                    <button 
                                        onClick={() => { this.setState({ showQuickMenu: false, showModalFighterInfo: true }); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                    >
                                        <i className="fa fa-user text-slate-400"></i>
                                        Thông tin
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
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col relative" style={{ height: '95%' }}>
                    {/* Top Section - Fighter Info & Timer */}
                    <div className="flex items-stretch" style={{ height: '35%' }}>
                        {/* Red Fighter */}
                        <div className="bg-gradient-to-br from-red-500 to-red-600 flex flex-col justify-start items-center relative cursor-pointer pt-4" style={{ width: '35%' }} onClick={this.redWin}>
                            {showRedFlag && (
                                <div className="absolute top-2 left-2">
                                    <img className="h-12 rounded shadow-lg" src={require('../assets/flag/' + this.countryRed + '.jpg')} alt="red flag" />
                                </div>
                            )}
                            <div 
                                className={`absolute top-2 right-2 cursor-pointer p-2 rounded-xl transition-all duration-300 border-2 ${
                                    redLegStrikeActive 
                                        ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-110' 
                                        : 'bg-slate-700/60 border-slate-500/50 opacity-60 hover:opacity-100'
                                }`}
                                onClick={(e) => { e.stopPropagation(); this.legStirkeRed(); }}
                                title="Đòn chân"
                            >
                                <img className="h-8" id="red-leg-strike" src={redLegStrikeSrc} alt="leg strike" />
                            </div>
                            {iconWinRed && (
                                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                    <i className="fa-solid fa-trophy text-yellow-300 text-4xl drop-shadow-lg animate-pulse"></i>
                                </div>
                            )}
                            <div className="text-white text-center flex-1 flex flex-col justify-center">
                                <div className={`font-bold drop-shadow-lg leading-tight ${isPrioritizeUnitName ? 'text-[3.5vh]' : 'text-[5vh]'}`} id="red-fighter">{redFighterName}</div>
                                <div className={`font-semibold opacity-95 ${isPrioritizeUnitName ? 'text-[5vh]' : 'text-[3.5vh]'}`} id="red-code">{redCode}</div>
                            </div>
                            {/* Cautions */}
                            {showRedCaution && (
                                <div className="w-full px-2 pb-2 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.remindRedIncrease}>
                                        <div className="text-xs truncate mb-0.5">Nhắc nhở</div>
                                        <div className="text-2xl font-bold leading-tight" id="remind-red">{remindRed}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.remindRedDecrease(); }}></div>
                                    </div>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.warningRedIncrease}>
                                        <div className="text-xs truncate mb-0.5">Cảnh cáo</div>
                                        <div className="text-2xl font-bold leading-tight" id="warning-red">{warningRed}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.warningRedDecrease(); }}></div>
                                    </div>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.fallRedIncrease}>
                                        <div className="text-xs truncate mb-0.5">Ngã</div>
                                        <div className="text-2xl font-bold leading-tight" id="fall-red">{fallRed}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.fallRedDecrease(); }}></div>
                                    </div>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.boundRedIncrease}>
                                        <div className="text-xs truncate mb-0.5">Biên</div>
                                        <div className="text-2xl font-bold leading-tight" id="bound-red">{boundRed}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.boundRedDecrease(); }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Timer & Match Info */}
                        <div className="flex flex-col justify-between items-center py-3 px-2" style={{ width: '30%', background: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)' }}>
                            {/* Match Navigation - Top */}
                            <div className="flex items-center gap-1">
                                {showMatchPrev && (
                                    <button onClick={this.prevMatch} className="w-6 h-6 rounded-full bg-slate-300 hover:bg-slate-400 text-slate-600 flex items-center justify-center text-lg transition-colors">
                                        <i className="fa fa-caret-left"></i>
                                    </button>
                                )}
                                <div className="text-[2vh] font-semibold text-slate-600 px-1" id="match-no">Trận {matchNo}</div>
                                {showMatchNext && (
                                    <button onClick={this.nextMatch} className="w-6 h-6 rounded-full bg-slate-300 hover:bg-slate-400 text-slate-600 flex items-center justify-center text-lg transition-colors">
                                        <i className="fa fa-caret-right"></i>
                                    </button>
                                )}
                            </div>
                            {/* Timer - Center and largest */}
                            <div 
                                onClick={this.startTimer} 
                                className="rounded-2xl shadow-xl cursor-pointer transition-transform hover:scale-105 hover:z-10 px-4 py-1 relative"
                                style={{ backgroundColor: timerBgColor || '#1e293b' }}
                            >
                                <div className="text-[16vh] font-bold text-white font-mono leading-none" id="match-time" style={{ fontFamily: 'clockicons, monospace' }}>
                                    {matchTime}
                                </div>
                            </div>
                            {/* Round - Bottom */}
                            <div className="text-[3.5vh] font-bold text-slate-700" id="match-round">{matchRound}</div>
                        </div>

                        {/* Blue Fighter */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col justify-start items-center relative cursor-pointer pt-4" style={{ width: '35%' }} onClick={this.blueWin}>
                            {showBlueFlag && (
                                <div className="absolute top-2 right-2">
                                    <img className="h-12 rounded shadow-lg" src={require('../assets/flag/' + this.countryBlue + '.jpg')} alt="blue flag" />
                                </div>
                            )}
                            <div 
                                className={`absolute top-2 left-2 cursor-pointer p-2 rounded-xl transition-all duration-300 border-2 ${
                                    blueLegStrikeActive 
                                        ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-110' 
                                        : 'bg-slate-700/60 border-slate-500/50 opacity-60 hover:opacity-100'
                                }`}
                                onClick={(e) => { e.stopPropagation(); this.legStirkeBlue(); }}
                                title="Đòn chân"
                            >
                                <img className="h-8" id="blue-leg-strike" src={blueLegStrikeSrc} alt="leg strike" />
                            </div>
                            {iconWinBlue && (
                                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                    <i className="fa-solid fa-trophy text-yellow-300 text-4xl drop-shadow-lg animate-pulse"></i>
                                </div>
                            )}
                            <div className="text-white text-center flex-1 flex flex-col justify-center">
                                <div className={`font-bold drop-shadow-lg leading-tight ${isPrioritizeUnitName ? 'text-[3.5vh]' : 'text-[5vh]'}`} id="blue-fighter">{blueFighterName}</div>
                                <div className={`font-semibold opacity-95 ${isPrioritizeUnitName ? 'text-[5vh]' : 'text-[3.5vh]'}`} id="blue-code">{blueCode}</div>
                            </div>
                            {/* Cautions */}
                            {showBlueCaution && (
                                <div className="w-full px-2 pb-2 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.remindBlueIncrease}>
                                        <div className="text-xs truncate mb-0.5">Nhắc nhở</div>
                                        <div className="text-2xl font-bold leading-tight" id="remind-blue">{remindBlue}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.remindBlueDecrease(); }}></div>
                                    </div>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.warningBlueIncrease}>
                                        <div className="text-xs truncate mb-0.5">Cảnh cáo</div>
                                        <div className="text-2xl font-bold leading-tight" id="warning-blue">{warningBlue}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.warningBlueDecrease(); }}></div>
                                    </div>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.fallBlueIncrease}>
                                        <div className="text-xs truncate mb-0.5">Ngã</div>
                                        <div className="text-2xl font-bold leading-tight" id="fall-blue">{fallBlue}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.fallBlueDecrease(); }}></div>
                                    </div>
                                    <div className="flex-1 max-w-[80px] bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 text-white text-center cursor-pointer hover:bg-white/40 transition-colors overflow-hidden relative" onClick={this.boundBlueIncrease}>
                                        <div className="text-xs truncate mb-0.5">Biên</div>
                                        <div className="text-2xl font-bold leading-tight" id="bound-blue">{boundBlue}</div>
                                        <div className="subtract-btn absolute bottom-0 left-1 right-1 h-2.5 bg-white/40 hover:bg-white/60 rounded-t-lg transition-colors" onClick={(e) => { e.stopPropagation(); this.boundBlueDecrease(); }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Section - Scores */}
                    <div className="flex-1 flex items-stretch" style={{ height: '65%' }}>
                        {/* Red Score */}
                        <div 
                            className="flex-1 flex flex-col justify-center items-center relative cursor-pointer transition-all"
                            style={{ backgroundColor: redScoreBgColor || '#dc2626', color: redScoreColor || 'white' }}
                            onClick={this.redAddition}
                        >
                            <div className="text-[45vh] font-bold leading-none drop-shadow-2xl" id="red-score">{redScore}</div>
                            <div className="subtract-btn absolute inset-x-0 bottom-0 h-[15%] cursor-pointer bg-black/30" onClick={(e) => { e.stopPropagation(); this.redSubtraction(); }}></div>
                        </div>

                        {/* Referee Scores */}
                        <div className="flex flex-col justify-center gap-2 px-4 py-4" style={{ width: '12%', background: 'linear-gradient(to bottom, #f1f5f9, #e2e8f0)' }}>
                            {[1, 2, 3].map(i => {
                                return (
                                <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col relative">
                                    <div className="bg-slate-600 text-white text-center py-1 text-[1.5vh] font-semibold">
                                        Giám định {i}
                                    </div>
                                    <div className="flex-1 flex">
                                        <div 
                                            className="flex-1 flex items-center justify-center text-[4vh] font-bold border-r border-slate-200"
                                            style={{ backgroundColor: refereeScores[i-1]?.redBg || 'white', color: refereeScores[i-1]?.redColor || '#dc2626' }}
                                        >
                                            <span id={`red-score-${i}`}>{refereeScores[i-1]?.redScore || 0}</span>
                                        </div>
                                        <div 
                                            className="flex-1 flex items-center justify-center text-[4vh] font-bold"
                                            style={{ backgroundColor: refereeScores[i-1]?.blueBg || 'white', color: refereeScores[i-1]?.blueColor || '#2563eb' }}
                                        >
                                            <span id={`blue-score-${i}`}>{refereeScores[i-1]?.blueScore || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )})}
                            {isShowFiveReferee && [4, 5].map(i => {
                                return (
                                <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col relative">
                                    <div className="bg-slate-600 text-white text-center py-1 text-[1.5vh] font-semibold">
                                        Giám định {i}
                                    </div>
                                    <div className="flex-1 flex">
                                        <div 
                                            className="flex-1 flex items-center justify-center text-[4vh] font-bold border-r border-slate-200"
                                            style={{ backgroundColor: refereeScores[i-1]?.redBg || 'white', color: refereeScores[i-1]?.redColor || '#dc2626' }}
                                        >
                                            <span id={`red-score-${i}`}>{refereeScores[i-1]?.redScore || 0}</span>
                                        </div>
                                        <div 
                                            className="flex-1 flex items-center justify-center text-[4vh] font-bold"
                                            style={{ backgroundColor: refereeScores[i-1]?.blueBg || 'white', color: refereeScores[i-1]?.blueColor || '#2563eb' }}
                                        >
                                            <span id={`blue-score-${i}`}>{refereeScores[i-1]?.blueScore || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>

                        {/* Blue Score */}
                        <div 
                            className="flex-1 flex flex-col justify-center items-center relative cursor-pointer transition-all"
                            style={{ backgroundColor: blueScoreBgColor || '#2563eb', color: blueScoreColor || 'white' }}
                            onClick={this.blueAddition}
                        >
                            <div className="text-[45vh] font-bold leading-none drop-shadow-2xl" id="blue-score">{blueScore}</div>
                            <div className="subtract-btn absolute inset-x-0 bottom-0 h-[15%] cursor-pointer bg-black/30" onClick={(e) => { e.stopPropagation(); this.blueSubtraction(); }}></div>
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
                                        <input type="radio" name="optionsArena" id="optionsArena0" value="0" defaultChecked className="peer sr-only" />
                                        <div className="p-3 border-2 border-slate-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 flex flex-col items-center justify-center min-h-[60px]">
                                            <i className="fa-solid fa-chess-board text-xl text-blue-500"></i>
                                            <span className="font-bold text-sm text-slate-700 mt-1">Sân A</span>
                                        </div>
                                    </label>
                                    <label className="relative">
                                        <input type="radio" name="optionsArena" id="optionsArena1" value="1" className="peer sr-only" />
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

                {/* Choose Match Modal - Grouped by Type/Category */}
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
                                    {Object.entries(matchGroups).map(([typeCat, matches], gi) => (
                                        <div key={gi} className="border border-slate-200 rounded-xl overflow-hidden">
                                            {/* Type/Category Header */}
                                            <div className="bg-blue-600 px-4 py-3 font-bold text-white flex items-center gap-2">
                                                <i className="fa-solid fa-trophy"></i>
                                                <span>{typeCat}</span>
                                                <span className="ml-auto bg-white/20 px-2 py-0.5 rounded text-sm">{matches.length} trận</span>
                                            </div>
                                            {/* Matches grid */}
                                            <div className="p-3 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 bg-slate-50">
                                                {matches.map((m, idx) => {
                                                    const isCurrentMatch = m.no === matchNo;
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                this.matchNoCurrent = m.no;
                                                                this.restoreMatch();
                                                                this.setState({ showModalChooseMatch: false });
                                                            }}
                                                            className={`text-center px-2 py-3 rounded-lg transition-colors border hover:shadow-md ${
                                                                isCurrentMatch 
                                                                    ? 'bg-amber-400 border-amber-500 ring-2 ring-amber-300' 
                                                                    : 'bg-white hover:bg-blue-100 border-slate-200 hover:border-blue-500'
                                                            }`}
                                                        >
                                                            <div className={`text-lg font-bold ${isCurrentMatch ? 'text-white' : 'text-blue-600'}`}>{m.no}</div>
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

                {/* Confirm Modal */}
                <div className={`fixed inset-0 z-50 ${showModalConfirm ? 'flex' : 'hidden'} items-center justify-center bg-black/60 backdrop-blur-sm`}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className={`px-6 py-4 ${
                            confirmWinnerColor === 'red' 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : confirmWinnerColor === 'blue' 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <i className={`fa-solid ${confirmWinnerColor ? 'fa-trophy' : 'fa-question'} text-white text-lg`}></i>
                                </div>
                                <h5 className="text-lg font-bold text-white" dangerouslySetInnerHTML={{ __html: confirmTitle }}></h5>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: confirmBody }}></p>
                        </div>
                        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t">
                            <button onClick={() => this.setState({ showModalConfirm: false, confirmWinnerColor: null })} className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors">
                                <i className="fa-solid fa-xmark mr-2"></i>Hủy
                            </button>
                            <button onClick={this.handleConfirmOK} id="buttonConfirmOK" className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl ${
                                confirmWinnerColor === 'red'
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                    : confirmWinnerColor === 'blue'
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                            }`}>
                                <i className="fa-solid fa-check mr-2"></i>Xác nhận
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fighter Info Modal - Using Component */}
                <FighterInfoModal
                    isOpen={showModalFighterInfo}
                    onClose={() => this.setState({ showModalFighterInfo: false })}
                    combatObj={this.combatObj}
                    currentMatchNo={matchNo}
                    currentCategory={matchCategory}
                    tournamentName={tournamentName}
                    arenaName={arenaName}
                />

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
                            
                            <div className="p-5">
                                {/* Chấm điểm */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <i className="fa-solid fa-star text-slate-400"></i>
                                        <span className="font-semibold text-slate-700">Chấm điểm</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <span className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold">↑</span>
                                            <span className="text-red-700 text-sm">+1 Đỏ</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <span className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold">←</span>
                                            <span className="text-red-700 text-sm">-1 Đỏ</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <span className="w-8 h-8 bg-blue-500 text-white rounded flex items-center justify-center font-bold">→</span>
                                            <span className="text-blue-700 text-sm">+1 Xanh</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <span className="w-8 h-8 bg-blue-500 text-white rounded flex items-center justify-center font-bold">↓</span>
                                            <span className="text-blue-700 text-sm">-1 Xanh</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Divider */}
                                <div className="border-t border-slate-200 my-4"></div>

                                {/* Điều khiển */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <i className="fa-solid fa-gamepad text-slate-400"></i>
                                        <span className="font-semibold text-slate-700">Điều khiển</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                            <span className="w-12 h-8 bg-slate-600 text-white rounded flex items-center justify-center text-xs font-bold">Space</span>
                                            <span className="text-slate-700 text-sm">Đồng hồ</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                            <span className="w-8 h-8 bg-slate-600 text-white rounded flex items-center justify-center font-bold">R</span>
                                            <span className="text-slate-700 text-sm">Reset timer</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                            <span className="w-8 h-8 bg-slate-600 text-white rounded flex items-center justify-center font-bold">C</span>
                                            <span className="text-slate-700 text-sm">Chọn trận</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                            <span className="w-8 h-8 bg-slate-600 text-white rounded flex items-center justify-center font-bold">T</span>
                                            <span className="text-slate-700 text-sm">Trận trước</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-200 my-4"></div>

                                {/* Kết thúc trận */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <i className="fa-solid fa-trophy text-slate-400"></i>
                                        <span className="font-semibold text-slate-700">Kết thúc trận</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <span className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold">D</span>
                                            <span className="text-red-700 text-sm">Đỏ thắng</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <span className="w-8 h-8 bg-blue-500 text-white rounded flex items-center justify-center font-bold">X</span>
                                            <span className="text-blue-700 text-sm">Xanh thắng</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                            <span className="w-8 h-8 bg-slate-600 text-white rounded flex items-center justify-center font-bold">I</span>
                                            <span className="text-slate-700 text-sm">Thông tin VĐV</span>
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
                    <audio id="sound">
                        <source src={sound} type="audio/mpeg" />
                    </audio>
                </div>
                <ToastContainer position="top-center" autoClose={800} hideProgressBar />

            </div>
        );
    }
}

export default GiamSatDoiKhangContainer;
