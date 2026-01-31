import React, {Component} from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import {ref, set, get, update, child, onValue, off} from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/School_Bell.mp3';
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import constants
import { COLORS } from '../constants/colors';
import { ROUNDS, REFEREE_COUNT, TIME_SCORE } from '../constants/rounds';
import { DEFAULT_COMBAT_CONST, DEFAULT_MATCH_OBJ } from '../constants/settings';

// Import utils
import { convertWinLoseFormat, getModes, resizeTextToFit } from '../utils/helpers';

class GiamSatDoiKhangContainer extends Component {
    // Firebase listener references for cleanup
    firebaseListeners = [];

    constructor(props) {
        super(props);
        document.title = 'Giám Sát Đối Kháng';
        
        this.db = Firebase();
        this.state = {
            data: []
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
        this.timer = null;
        this.effectTimer = null;
        this.scoreTimer = null;
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

    componentDidMount() {
        document.addEventListener("keydown", this._handleKeyDown);
        this.showPasswordModal();
        window.onresize = () => resizeTextToFit('referee-score-area-top', 'tournamentName');
    }

    componentWillUnmount() {
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
    }

    verifyPassword = () => {
        const password = $('#txtPassword').val();

        if (password != null && password !== "") {
            const passwordRef = ref(this.db, 'commonSetting/passwordGiamSat');
            onValue(passwordRef, (snapshot) => {
                if (password === snapshot.val()) {
                    this.hidePasswordModal();
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

            for (let i = 0; i < this.tournamentObj.length; i++) {
                this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
            }
            this.setState({data: this.tournaments});
        })

        get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
            this.settingObj = snapshot.val();
            if (this.settingObj.combat.isShowArenaB === true) {
                this.showChooseArenaNoModal();
            } else {
                this.showTournamentInfo();
            }
        });
    }

    chooseArenaNo = () => {
        let combatArenaNo = $("input:radio[name ='optionsArena']:checked").val();
        if (combatArenaNo != null && combatArenaNo != "") {
            this.hideChooseArenaNoModal();
            this.combatArenaNoIndex = combatArenaNo;
            this.showTournamentInfo();
        }
    }

    showTournamentInfo = () => {
        get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/combatArenaName')).then((snapshot) => {
            $('#arena-name').html(snapshot.val());
        })
        get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
            this.settingObj = snapshot.val();
            $('#tournamentName').html(this.settingObj.tournamentName);
            resizeTextToFit('referee-score-area-top', 'tournamentName');
            this.settingObj = snapshot.val();
            this.timerCoundown = this.settingObj.combat.timeRound;
            this.timeBreak = this.settingObj.combat.timeBreak;
            this.timeExtra = this.settingObj.combat.timeExtra;
            this.timeExtraBreak = this.settingObj.combat.timeExtraBreak;
            if (this.settingObj.combat.isShowCountryFlag === true) {
                $(".redFlag").show();
                $(".blueFlag").show();
            }
            if (this.settingObj.combat.isShowCautionBox === true) {
                $(".red-caution").show();
                $(".blue-caution").show();
            }
            this.numReferee = this.settingObj.combat.isShowFiveReferee === true ? REFEREE_COUNT.FIVE : REFEREE_COUNT.DEFAULT;
            this.isShowFiveReferee = this.settingObj.combat.isShowFiveReferee;
            this.setState({data: this.isShowFiveReferee});

            this.startEffectTimer();

            // Store Firebase listener references for cleanup
            const combatRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat');
            this.firebaseListeners.push(combatRef);
            onValue(combatRef, (snapshot) => {
                this.combatObj = snapshot.val();
                if (this.lastMatchObj == null) {
                    this.matchNoCurrent = this.combatConst.lastMatch.no;
                    this.matchNoCurrentIndex = this.matchNoCurrent - 1;
                    this.match = this.combatObj[this.matchNoCurrentIndex];
                }
                if (this.refereeObj == null) {
                    this.refereeObj = this.combatConst.referee;
                }
                this.showValue();
            });

            const lastMatchRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch');
            this.firebaseListeners.push(lastMatchRef);
            onValue(lastMatchRef, (snapshot) => {
                this.lastMatchObj = snapshot.val();
                this.matchNoCurrent = this.lastMatchObj.no;
                this.matchNoCurrentIndex = this.matchNoCurrent - 1;
                this.match = this.combatObj[this.matchNoCurrentIndex];

                this.showValue();
            })

            const refereeRef = ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee');
            this.firebaseListeners.push(refereeRef);
            onValue(refereeRef, (snapshot) => {
                this.refereeObj = snapshot.val();
                this.showValue();
            })

            //Kiểm tra kết nối internet
            const connectedRef = ref(this.db, '.info/connected');
            this.firebaseListeners.push(connectedRef);
            onValue(connectedRef, (snapshot) => {
                if (!snapshot.val() === true) {
                    $('#internet-status').show();
                } else {
                    $('#internet-status').hide();
                }
            })
        })
    }

    chooseTournament = (tournamentNoIndex) => {
        this.tournamentNoIndex = tournamentNoIndex;
    }

    _handleKeyDown = (e) => {
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
    }

    showValue() {
        // Early return if match data not loaded
        if (!this.match) {
            console.log("showValue() - No match data");
            return;
        }
        
        console.log("showValue() Start");
        
        // Cache DOM elements for better performance
        const $timerText = $(".timer-text");
        
        //Khung thông tin về trận đấu
        $("#match-no").html(this.match.match.no);
        $("#match-type").html(this.match.match.type);
        $("#match-category").html(this.match.match.category);

        //Khung thời gian
        if (this.timerCoundown < 0) {
            this.minutes = "00";
            this.seconds = "00";
            $timerText.css("background-color", this.redColor);
        } else {
            const minutes = Math.floor(this.timerCoundown / 60);
            const seconds = Math.floor(this.timerCoundown - (minutes * 60));
            this.minutes = minutes < 10 ? "0" + minutes : "" + minutes;
            this.seconds = seconds < 10 ? "0" + seconds : "" + seconds;
        }
        $("#match-time").html(this.minutes + ":" + this.seconds);
        
        if (this.timerCoundown > 0) {
            const isMainRound = this.round === this.fistRound || this.round === this.secondRound || this.round === this.extraRound;
            const isBreakRound = this.round === this.breakRound || this.round === this.breakExtraRound;
            
            if (this.isTimerRunning) {
                //Đổi màu trạng thái running cho đồng hồ đang chạy
                if (isMainRound) {
                    $timerText.css("background-color", this.greenColor);
                } else if (isBreakRound) {
                    $timerText.css("background-color", this.orangeColor);
                }
            } else {
                //Đổi màu trạng thái dừng cho đồng hồ
                if (isMainRound) {
                    if (this.round === this.fistRound && this.timerCoundown === this.settingObj.combat.timeRound) {
                        $timerText.css("background-color", this.silverColor);
                    } else {
                        $timerText.css("background-color", this.yellowColor);
                    }
                } else if (isBreakRound) {
                    $timerText.css("background-color", this.yellowColor);
                }
            }
        }
        $("#match-round").html(this.round);

        //Khung cúp cho người chiến thắng
        const $iconWinRed = $(".icon-win-red");
        const $iconWinBlue = $(".icon-win-blue");
        
        if (this.match.match.win === "red") {
            $iconWinRed.css("opacity", 1);
            $iconWinBlue.css("opacity", "");
        } else if (this.match.match.win === "blue") {
            $iconWinBlue.css("opacity", 1);
            $iconWinRed.css("opacity", "");
        } else {
            $iconWinRed.css("opacity", "");
            $iconWinBlue.css("opacity", "");
        }

        //Khung thông tin vận động viên
        const redFighter = this.match.fighters.redFighter;
        const blueFighter = this.match.fighters.blueFighter;
        
        $("#red-fighter").html(convertWinLoseFormat(redFighter.name));
        $("#red-code").html(redFighter.code);
        this.countryRed = redFighter.country !== "" ? redFighter.country : "red";
        $("#red-score").html(redFighter.score);
        
        $("#blue-fighter").html(convertWinLoseFormat(blueFighter.name));
        $("#blue-code").html(blueFighter.code);
        $("#blue-score").html(blueFighter.score);
        this.countryBlue = blueFighter.country !== "" ? blueFighter.country : "blue";
        this.setState({data: []});

        //Khung chuyển trận đấu
        //Xóa nút next và Prev nếu gặp biên
        const $matchPrev = $(".match-prev");
        const $matchNext = $(".match-next");
        
        if (this.matchNoCurrent === 1) {
            $matchPrev.hide();
            $matchNext.show();
        } else if (this.matchNoCurrent === this.combatObj.length) {
            $matchPrev.show();
            $matchNext.hide();
        } else {
            $matchPrev.show();
            $matchNext.show();
        }

        //Khung các giám định - Hiện điểm các giám định
        for (let i = 1; i <= this.numReferee; i++) {
            set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex), this.combatObj[this.matchNoCurrentIndex])
            
            const refereeData = this.refereeObj[i - 1];
            $("#red-score-" + i).html(refereeData.redScore);
            $("#blue-score-" + i).html(refereeData.blueScore);
            
            const $redScoreRef = $(".red-score-referee-giamsat.gd" + i);
            const $blueScoreRef = $(".blue-score-referee-giamsat.gd" + i);
            
            if (refereeData.redScore !== 0) {
                $redScoreRef.css({"background-color": "red", "color": "white"});
            } else {
                $redScoreRef.css({"background-color": "", "color": "red"});
            }
            
            if (refereeData.blueScore !== 0) {
                $blueScoreRef.css({"background-color": "blue", "color": "white"});
            } else {
                $blueScoreRef.css({"background-color": "", "color": "blue"});
            }
        }

        //caution area
        const redCaution = redFighter.caution;
        const blueCaution = blueFighter.caution;
        
        $("#remind-red").text(redCaution.remind);
        $("#warning-red").text(redCaution.warning);
        $("#medical-red").text(redCaution.medical);
        $("#fall-red").text(redCaution.fall);
        $("#bound-red").text(redCaution.bound);
        
        $("#remind-blue").text(blueCaution.remind);
        $("#warning-blue").text(blueCaution.warning);
        $("#medical-blue").text(blueCaution.medical);
        $("#fall-blue").text(blueCaution.fall);
        $("#bound-blue").text(blueCaution.bound);

        // Leg strike icons
        const legStrikeWhite = require('../assets/img/donchan_white.png');
        const legStrikeBlack = require('../assets/img/donchan_black.png');
        
        $("#red-leg-strike").attr("src", redFighter.legStrike ? legStrikeWhite : legStrikeBlack);
        $("#blue-leg-strike").attr("src", blueFighter.legStrike ? legStrikeWhite : legStrikeBlack);

        console.log("showValue() End");
    }

    saveMatch() {
        console.log("saveMatch() Start");
        update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex), this.match);
        console.log("saveMatch() End");
    }

    //Gõ số để đi đến trận đấu
    chooseMatch = () => {
        console.log("chooseMatch() Start");

        let matchChoose = $('#txtMatchChoose').val();

        if (matchChoose != null && matchChoose != "") {
            if (matchChoose < 1 || matchChoose > this.combatObj.length) {
                toast.error("Vui lòng nhập số thứ tự trận đấu lớn hơn 1!");
                return;
            }
            this.hideModalChooseMatch();
            this.matchNoCurrent = matchChoose;
            this.restoreMatch();
        }
        console.log("chooseMatch() End");
    }

    nextMatch = () => {
        console.log("nextMatch() Start");
        if (this.timer == undefined || this.timer == false) {
            this.matchNoCurrent++;
            this.restoreMatch();
        } else {
            $('#modalConfirm .modal-title').html("Xác nhận");
            $('#modalConfirm .modal-body').html("Bạn muốn dừng trận đấu và đến trận đấu kế tiếp?");
            this.showModalConfirm();

            $("#buttonConfirmOK").click(() => {
                this.matchNoCurrent++;
                this.restoreMatch();
                this.hideModalConfirm();
            })
        }
        console.log("nextMatch() End");
    }

    prevMatch = () => {
        console.log("prevMatch() Start");
        if (this.timer == undefined || this.timer == false) {
            this.matchNoCurrent--;
            this.restoreMatch();
        } else {
            $('#modalConfirm .modal-title').html("Xác nhận");
            $('#modalConfirm .modal-body').html("Bạn muốn dừng trận đấu và về trận đấu trước đó?");
            this.showModalConfirm()

            $("#buttonConfirmOK").click(() => {
                this.matchNoCurrent--;
                this.restoreMatch();
                this.hideModalConfirm();
            })
        }
        console.log("prevMatch() End");
    }

    restoreMatch() {
        console.log("restoreMatch() Start");
        $(".red-score").css("background-color", "red");
        $(".red-score").css("color", this.whiteColor);
        $(".blue-score").css("background-color", "blue");
        $(".blue-score").css("color", this.whiteColor);
        this.stopTimer();
        this.round = this.fistRound;
        this.timerCoundown = this.settingObj.combat.timeRound;
        this.isTimerRunning = false;
        $(".timer-text").css("background-color", this.silverColor);
        let minutes = Math.floor(this.timerCoundown / 60);
        let seconds = Math.floor(this.timerCoundown - (this.minutes * 60));
        minutes < "10" ? this.minutes = "0" + minutes : this.minutes = minutes;
        seconds < "10" ? this.seconds = "0" + seconds : this.seconds = seconds;
        $("#match-time").html(this.minutes + ":" + this.seconds);
        $("#match-round").html(this.round);
        set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch/no'), this.matchNoCurrent)
        let referees = [];
        for (let i = 0; i < this.numReferee; i++) {
            this.refereeObj[i] = {blueScore: 0, redScore: 0};
            referees.push(this.refereeObj[i]);
        }
        set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee'), referees)
        console.log("restoreMatch() End");
    }


    redWin = () => {
        console.log("redWin() Start");
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

        $('#modalConfirm .modal-title').html("<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>");
        $('#modalConfirm .modal-body').html("<h3 style='color: red'><i class='fa-solid fa-hand-back-fist'></i> " + convertWinLoseFormat(this.match.fighters.redFighter.name) + "</h3><h3 style='color: red'>" + this.match.fighters.redFighter.code + "</h3>");
        this.showModalConfirm();

        $("#buttonConfirmOK").click(() => {
            if (this.temporaryWin === "red") {
                this.stopTimer();
                this.replaceFighter("red");
                setTimeout(() => {
                    this.match.match.win = "red";
                    set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/match/win'), "red")
                    $(".icon-win-red").css({opacity: 1});
                    $(".icon-win-blue").css("opacity", "");
                    $(".red-score").css({"background-color": "red", "color": this.whiteColor});
                    $(".blue-score").css({"background-color": "blue", "color": this.whiteColor});
                }, 1000);
                this.hideModalConfirm();
            }
        })
        console.log("redWin() End");
    }

    blueWin = () => {
        console.log("blueWin() Start");
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

        $('#modalConfirm .modal-title').html("<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>");
        $('#modalConfirm .modal-body').html("<h3 style='color: blue'><i class='fa-solid fa-hand-back-fist'></i> " + convertWinLoseFormat(this.match.fighters.blueFighter.name) + "</h3><h3 style='color: blue'>" + this.match.fighters.blueFighter.code + "</h3>");
        this.showModalConfirm();

        $("#buttonConfirmOK").click(() => {
            if (this.temporaryWin === "blue") {
                this.stopTimer();
                this.replaceFighter("blue");
                setTimeout(() => {
                    this.match.match.win = "blue";
                    set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/match/win'), "blue")
                    $(".icon-win-blue").css({opacity: 1});
                    $(".icon-win-red").css("opacity", "");
                    $(".red-score").css({"background-color": "red", "color": this.whiteColor});
                    $(".blue-score").css({"background-color": "blue", "color": this.whiteColor});
                }, 1000);
                this.hideModalConfirm();
            }
        })
        console.log("blueWin() End");
    }

    redAddition = () => {
        this.match.fighters.redFighter.score++;
        this.saveMatch();
    }

    blueAddition = () => {
        this.match.fighters.blueFighter.score++;
        this.saveMatch();
    }

    redSubtraction = () => {
        this.match.fighters.redFighter.score--;
        this.saveMatch();
    }

    blueSubtraction = () => {
        this.match.fighters.blueFighter.score--;
        this.saveMatch();
    }

    remindRedDecrease = () => {
        if (this.match.fighters.redFighter.caution.remind > 0) {
            this.match.fighters.redFighter.caution.remind--;
        }
        this.saveMatch();
    }
    remindRedIncrease = () => {
        if (this.match.fighters.redFighter.caution.remind < 3) {
            this.match.fighters.redFighter.caution.remind++;
        }
        this.saveMatch();
    }
    warningRedDecrease = () => {
        if (this.match.fighters.redFighter.caution.warning > 0) {
            this.match.fighters.redFighter.caution.warning--;
            this.match.fighters.redFighter.score = this.match.fighters.redFighter.score + 2;
        }
        this.saveMatch();
    }
    warningRedIncrease = () => {
        this.match.fighters.redFighter.caution.warning++;
        this.match.fighters.redFighter.caution.remind = 0;
        this.match.fighters.redFighter.score = this.match.fighters.redFighter.score - 2;
        this.saveMatch();
    }
    medicalRedDecrease = () => {
        if (this.match.fighters.redFighter.caution.medical > 0) {
            this.match.fighters.redFighter.caution.medical--;
        }
        this.saveMatch();
    }
    medicalRedIncrease = () => {
        this.match.fighters.redFighter.caution.medical++;
        this.saveMatch();
    }
    fallRedDecrease = () => {
        if (this.match.fighters.redFighter.caution.fall > 0) {
            this.match.fighters.redFighter.caution.fall--;
            this.match.fighters.blueFighter.score--;
        }
        this.saveMatch();
    }
    fallRedIncrease = () => {
        this.match.fighters.redFighter.caution.fall++;
        this.match.fighters.blueFighter.score++;
        this.saveMatch();
    }
    boundRedDecrease = () => {
        if (this.match.fighters.redFighter.caution.bound > 0) {
            this.match.fighters.redFighter.caution.bound--;
            this.match.fighters.redFighter.score++;
        }
        this.saveMatch();
    }
    boundRedIncrease = () => {
        this.match.fighters.redFighter.caution.bound++;
        this.match.fighters.redFighter.score--;
        this.saveMatch();
    }

    remindBlueDecrease = () => {
        if (this.match.fighters.blueFighter.caution.remind > 0) {
            this.match.fighters.blueFighter.caution.remind--;
        }
        this.saveMatch();
    }
    remindBlueIncrease = () => {
        if (this.match.fighters.blueFighter.caution.remind < 3) {
            this.match.fighters.blueFighter.caution.remind++;
        }
        this.saveMatch();
    }
    warningBlueDecrease = () => {
        if (this.match.fighters.blueFighter.caution.warning > 0) {
            this.match.fighters.blueFighter.caution.warning--;
            this.match.fighters.blueFighter.score = this.match.fighters.blueFighter.score + 2;
        }
        this.saveMatch();
    }
    warningBlueIncrease = () => {
        this.match.fighters.blueFighter.caution.warning++;
        this.match.fighters.blueFighter.caution.remind = 0;
        this.match.fighters.blueFighter.score = this.match.fighters.blueFighter.score - 2;
        this.saveMatch();
    }
    medicalBlueDecrease = () => {
        if (this.match.fighters.blueFighter.caution.medical > 0) {
            this.match.fighters.blueFighter.caution.medical--;
        }
        this.saveMatch();
    }
    medicalBlueIncrease = () => {
        this.match.fighters.blueFighter.caution.medical++;
        this.saveMatch();
    }
    fallBlueDecrease = () => {
        if (this.match.fighters.blueFighter.caution.fall > 0) {
            this.match.fighters.blueFighter.caution.fall--;
            this.match.fighters.redFighter.score--;
        }
        this.saveMatch();
    }
    fallBlueIncrease = () => {
        this.match.fighters.blueFighter.caution.fall++;
        this.match.fighters.redFighter.score++;
        this.saveMatch();
    }
    boundBlueDecrease = () => {
        if (this.match.fighters.blueFighter.caution.bound > 0) {
            this.match.fighters.blueFighter.caution.bound--;
            this.match.fighters.blueFighter.score++;
        }
        this.saveMatch();
    }
    boundBlueIncrease = () => {
        this.match.fighters.blueFighter.caution.bound++;
        this.match.fighters.blueFighter.score--;
        this.saveMatch();
    }
    legStirkeRed = () => {
        this.match.fighters.redFighter.legStrike = !this.match.fighters.redFighter.legStrike;
        this.saveMatch();
    }
    legStirkeBlue = () => {
        this.match.fighters.blueFighter.legStrike = !this.match.fighters.blueFighter.legStrike;
        this.saveMatch();
    }

    //Hàm dùng để thay thế những trận đấu có ký hiệu W. và L. trong giải đấu
    replaceFighter(winColor) {
        console.log("replaceFighter() Start");
        let matchWin = "W." + this.matchNoCurrent;
        let matchLose = "L." + this.matchNoCurrent;
        let winFighter;
        let loseFighter

        if (winColor == "red") {
            winFighter = this.match.fighters.redFighter;
            loseFighter = this.match.fighters.blueFighter;
        } else {
            winFighter = this.match.fighters.blueFighter;
            loseFighter = this.match.fighters.redFighter;
        }

        for (let i = this.matchNoCurrent; i < this.combatObj.length; i++) {
            let fightersTemp = this.combatObj[i].fighters;
            if (fightersTemp.redFighter.result == matchWin) {
                fightersTemp.redFighter = JSON.parse(JSON.stringify(winFighter));
                fightersTemp.redFighter.result = matchWin;
                fightersTemp.redFighter.score = 0;
                update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters'), fightersTemp);
                break;
            }

            if (fightersTemp.redFighter.result == matchLose) {
                fightersTemp.redFighter = JSON.parse(JSON.stringify(loseFighter));
                fightersTemp.redFighter.result = matchLose;
                fightersTemp.redFighter.score = 0;
                update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters'), fightersTemp);
                break;
            }

            if (fightersTemp.blueFighter.result == matchWin) {
                fightersTemp.blueFighter = JSON.parse(JSON.stringify(winFighter));
                fightersTemp.blueFighter.result = matchWin;
                fightersTemp.blueFighter.score = 0;
                update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters'), fightersTemp);
                break;
            }

            if (fightersTemp.blueFighter.result == matchLose) {
                fightersTemp.blueFighter = JSON.parse(JSON.stringify(loseFighter));
                fightersTemp.blueFighter.result = matchLose;
                fightersTemp.blueFighter.score = 0;
                update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + i + '/fighters'), fightersTemp);
                break;
            }
        }
        console.log("replaceFighter() End");
    }

    makeScoreTimer() {
        for (let i = 0; i < this.numReferee; i++) {
            if (this.refereeObj[i].redScore !== 0 || this.refereeObj[i].blueScore !== 0) {
                if (!this.isFirstRefereeScore) {
                    this.isFirstRefereeScore = true;
                }
                this.scoreTimerCount--;
                console.log(this.scoreTimerCount);
                //Kết thúc nếu có >50% trọng tài chấm điểm
                let redScoreCounter = 0;
                let blueScoreCounter = 0;
                for (let j = 0; j < this.numReferee; j++) {
                    if (this.refereeObj[j].redScore !== 0) {
                        redScoreCounter++;
                    }
                    if (this.refereeObj[j].blueScore !== 0) {
                        blueScoreCounter++;
                    }
                }
                if (this.scoreTimerCount === 0 || redScoreCounter > this.numReferee / 2 || blueScoreCounter > this.numReferee / 2) {
                    console.log("makeScoreTimer() Start");
                    //Tổng kết và tính điểm
                    const redScoreArray = [];
                    const blueScoreArray = [];
                    for (let k = 0; k < this.numReferee; k++) {
                        redScoreArray.push(this.refereeObj[k].redScore);
                        blueScoreArray.push(this.refereeObj[k].blueScore);
                    }
                    this.match.fighters.redFighter.score += getModes(redScoreArray);
                    this.match.fighters.blueFighter.score += getModes(blueScoreArray);
                    set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/fighters'), this.match.fighters)
                    //Reset Giám định
                    set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee'), this.combatConst.referee)
                    this.refereeObj = this.combatConst.referee;
                    this.scoreTimerCount = this.timeScore;
                    this.isFirstRefereeScore = false;
                    console.log("makeScoreTimer() End");
                    break;
                }
            }
        }
    }

    makeTimer() {
        // console.log("makeTimer() Start");
        const $timerText = $(".timer-text");
        
        if (this.timerCoundown < 0) {
            //Hiệp 1 kết thúc
            if (this.round === this.fistRound) {
                this.round = this.breakRound;
                this.timerCoundown = this.timeBreak;
                $timerText.css("background-color", this.orangeColor);
            }
            //Nghỉ giữa hiệp kết thúc
            else if (this.round === this.breakRound) {
                this.round = this.secondRound;
                this.timerCoundown = this.settingObj.combat.timeRound;
                this.stopTimer();
                $timerText.css("background-color", this.yellowColor);
            }
            //Hiệp 2 kết thúc
            else if (this.round === this.secondRound) {
                //Hết trận
                if (this.match.fighters.redFighter.score !== this.match.fighters.blueFighter.score) {
                    this.stopTimer();
                    $timerText.css("background-color", this.redColor);
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
                    $timerText.css("background-color", this.orangeColor);
                }
            }
            //Hết nghỉ hiệp phụ
            else if (this.round === this.breakExtraRound) {
                this.round = this.extraRound;
                this.timerCoundown = this.timeExtra;
                this.stopTimer();
                $timerText.css("background-color", this.yellowColor);
            }
            //Hiệp phụ kết thúc - Hết trận
            else if (this.round === this.extraRound) {
                this.stopTimer();
                $timerText.css("background-color", this.redColor);
                if (this.match.fighters.redFighter.score > this.match.fighters.blueFighter.score) {
                    this.redWin();
                } else if (this.match.fighters.redFighter.score < this.match.fighters.blueFighter.score) {
                    this.blueWin();
                }
                return;
            }
        }

        if (this.timerCoundown === 0) {
            $timerText.css("background-color", this.redColor);
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

        $("#match-time").html(this.minutes + ":" + this.seconds);
        $("#match-round").html(this.round);

        this.timerCoundown--;

        // console.log("makeTimer() End");
    }

    showShortcut = () => {
        this.showModalShortcut();
    }

    startTimer = () => {
        console.log("startTimer() Start");
        if (this.timer) {
            this.stopTimer();
            $(".timer-text").css("background-color", this.yellowColor);
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
                $(".timer-text").css("background-color", this.greenColor);
            }, 0);
        }
        console.log("startTimer() End");
    }

    makeEffectTimer() {
        if (this.match.match.win == "red") {
            if ($(".red-score").css("background-color") == "rgb(255, 0, 0)") {
                $(".red-score").css("background-color", this.bodyBgColor);
                $(".red-score").css("color", "red");
            } else {
                $(".red-score").css("background-color", "red");
                $(".red-score").css("color", this.whiteColor);
            }
        } else if (this.match.match.win == "blue") {
            if ($(".blue-score").css("background-color") == "rgb(0, 0, 255)") {
                $(".blue-score").css("background-color", this.bodyBgColor);
                $(".blue-score").css("color", "blue");
            } else {
                $(".blue-score").css("background-color", "blue");
                $(".blue-score").css("color", this.whiteColor);
            }
        }
    }

    startEffectTimer() {
        console.log("startEffectTimer() Start");
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
        console.log("startEffectTimer() End");
    }

    stopTimer() {
        clearInterval(this.timer);
        this.timer = false;
        this.isTimerRunning = false;
    }

    // Note: getModes and convertWL are now imported from utils/helpers.js
    // as getModes and convertWinLoseFormat

    playSound() {
        let sound = document.getElementById("sound");
        if (!sound.paused) {
            return;
        }
        sound.currentTime = 0;
        sound.play();
    }

    inputPw = (value) => {
        const $password = $("#txtPassword");
        if (value === "-1") {
            $password.val("");
        } else {
            $password.val($password.val() + value);
        }
    }

    // Note: resizeTextToFit is now imported from utils/helpers.js

    showPasswordModal = () => {
        $('#passwordModal').removeClass('modal display-none').addClass('modal display-block');
    };
    hidePasswordModal = () => {
        $('#passwordModal').removeClass('modal display-block').addClass('modal display-none');
        ;
    };
    showChooseArenaNoModal = () => {
        $('#chooseArenaNoModal').removeClass('modal display-none').addClass('modal display-block');
    };
    hideChooseArenaNoModal = () => {
        $('#chooseArenaNoModal').removeClass('modal display-block').addClass('modal display-none');
        ;
    };
    showModalChooseMatch = () => {
        $('#modalChooseMatch').removeClass('modal display-none').addClass('modal display-block');
    };
    hideModalChooseMatch = () => {
        $('#modalChooseMatch').removeClass('modal display-block').addClass('modal display-none');
        ;
    };
    showModalConfirm = () => {
        $('#modalConfirm').removeClass('modal display-none').addClass('modal display-block');
    };
    hideModalConfirm = () => {
        $('#modalConfirm').removeClass('modal display-block').addClass('modal display-none');
        ;
    };
    showModalShortcut = () => {
        $('#modalShortcut').removeClass('modal display-none').addClass('modal display-block');
    };
    hideModalShortcut = () => {
        $('#modalShortcut').removeClass('modal display-block').addClass('modal display-none');
        ;
    };


    render() {
        return (
            <div>
                <div className="body" style={{height: '100vh'}}>
                    <div className="info-area">
                        <div className="info-match-left-area">
                            <div className="referee-score-area-top">
                                <span className="info-text">
                                    <span id="tournamentName">
                                    </span>
                                    <span id="internet-status">
                                        <i className="fa-solid fa-wifi"></i> Mất kết nối Internet
                                    </span>
                                </span>
                            </div>

                            <div className="red-fighter">
                                <div className="red-win">
                                    <span className="info-text">

                                    </span>
                                </div>
                                <div className="fighter-name red">
                                    <span className="info-text-fighter-name-red" onClick={this.redWin}>
                                        <span className="icon-win-red">
                                            <i className="fa-solid fa-hand-back-fist"></i>&nbsp;
                                        </span>
                                        <span id="red-fighter">
                                        </span>
                                    </span>
                                </div>
                                <div className="fighter-code red">
                                    <span className="info-text-fighter-code-red">
                                        <span className='info-text' id="red-code"></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="timer-area">
                            <div className="timer-text" onClick={this.startTimer}>
                                <span className="info-text">
                                    <span id="match-time">
                                    </span>
                                </span>
                            </div>
                            <div className="round-text">
                                <span className="info-text">
                                    <span id="match-round">
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="info-match-right-area">
                            <div className="match-no">
                                <div className="match-prev" onClick={this.prevMatch}>
                                    <span className=" info-text">
                                        <i className="fa fa-caret-left"></i>
                                    </span>
                                </div>
                                <div className="match-choose" onClick={this.showModalChooseMatch}>
                                    <span className="info-text">
                                        <i className="fa fa-code"></i>
                                    </span>
                                </div>
                                <div className="match-next" onClick={this.nextMatch}>
                                    <span className="info-text">
                                        <i className="fa fa-caret-right"></i>
                                    </span>
                                </div>
                                <span className="info-text">
                                    <span id="match-no"></span>
                                </span>
                            </div>
                            <div className="logo">
                                <span className="info-text">
                                    <a href="#" onClick={this.showShortcut}><img src={logo} height="100%"
                                                                                 style={{width: '20vh'}}/></a>
                                </span>
                            </div>
                            <div className="arena">
                                <span className="info-text">
                                    <span id="arena-name"></span>
                                </span>
                            </div>
                            <div className="match-type">
                                <span className="info-text">
                                    <span id="match-type"></span>
                                </span>
                            </div>
                            <div className="match-category">
                                <span className="info-text">
                                    <span id="match-category"></span>
                                </span>
                            </div>
                            <div className="blue-fighter">
                                <div className="blue-win">
                                    <span className="info-text">

                                    </span>
                                </div>
                                <div className="fighter-name blue">
                                    <span className="info-text-fighter-name-blue" onClick={this.blueWin}>
                                        <span id="blue-fighter"></span>
                                        <span className="icon-win-blue">
                                            &nbsp;<i className="fa-solid fa-hand-back-fist"></i>
                                        </span>
                                    </span>
                                </div>
                                <div className="fighter-code blue">
                                    <span className="info-text-fighter-code-blue">
                                        <span className='info-text' id="blue-code"></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="score-area">
                        <div className="red-score">
                            <div className="addition" onClick={this.redAddition}></div>
                            <div className="redFlag countryFlag" style={{display: 'none'}}><img className="flagImage"
                                                                                                src={require('../assets/flag/' + this.countryRed + '.jpg')}/>
                            </div>
                            <div className="leg-strike" onClick={this.legStirkeRed}><img
                                className="red-leg-strike-image" id="red-leg-strike"
                                src=""/></div>
                            <div className="subtraction subtraction-red" onClick={this.redSubtraction}></div>
                            <div className="line-break-score"></div>
                            <div className="red-caution cautions-information" style={{display: 'none'}}>
                                {/*<div className="line-break-caution"></div>*/}
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-red"><span className="info-text">Nhắc
                                        nhở</span></div>
                                    <div className="btn-decrement btn-decrement-red" onClick={this.remindRedDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-red"><span
                                        className="info-text"><span id="remind-red">0</span></span></div>
                                    <div className="btn-increment btn-increment-red" onClick={this.remindRedIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution"></div>
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-red"><span className="info-text">Cảnh
                                        cáo</span></div>
                                    <div className="btn-decrement btn-decrement-red" onClick={this.warningRedDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-red"><span
                                        className="info-text"><span id="warning-red">0</span></span></div>
                                    <div className="btn-increment btn-increment-red" onClick={this.warningRedIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution hidden"></div>
                                <div className="cautions-box hidden">
                                    <div className="cautions-label cautions-label-red"><span className="info-text">Y
                                        Tế</span></div>
                                    <div className="btn-decrement btn-decrement-red" onClick={this.medicalRedDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-red"><span
                                        className="info-text"><span id="medical-red">0</span></span></div>
                                    <div className="btn-increment btn-increment-red" onClick={this.medicalRedIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution"></div>
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-red"><span
                                        className="info-text">Ngã</span></div>
                                    <div className="btn-decrement btn-decrement-red" onClick={this.fallRedDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-red"><span
                                        className="info-text"><span id="fall-red">0</span></span></div>
                                    <div className="btn-increment btn-increment-red" onClick={this.fallRedIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution"></div>
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-red"><span
                                        className="info-text">Biên</span></div>
                                    <div className="btn-decrement btn-decrement-red" onClick={this.boundRedDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-red"><span
                                        className="info-text"><span id="bound-red">0</span></span></div>
                                    <div className="btn-increment btn-increment-red" onClick={this.boundRedIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                {/*<div className="line-break-caution"></div>*/}
                            </div>
                            <div className="line-break-score-bot"></div>
                            <span className="info-text">
                                <span id="red-score"></span>
                            </span>
                        </div>
                        <div className="referee-score-area">
                            <div className="line-break"></div>
                            <div className="referee">
                                <div className="referee-title gd1">
                                    <span className="info-text">
                                        Giám định 1
                                    </span>
                                </div>
                                <div className="referee-score">
                                    <div className="red-score-referee-giamsat gd1">
                                        <span className="info-text">
                                            <span id="red-score-1"></span>
                                        </span>
                                    </div>
                                    <div className="blue-score-referee-giamsat gd1">
                                        <span className="info-text">
                                            <span id="blue-score-1"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="line-break"></div>
                            <div className="referee">
                                <div className="referee-title gd2">
                                    <span className="info-text">
                                        Giám định 2
                                    </span>
                                </div>
                                <div className="referee-score">
                                    <div className="red-score-referee-giamsat gd2">
                                        <span className="info-text">
                                            <span id="red-score-2"></span>
                                        </span>
                                    </div>
                                    <div className="blue-score-referee-giamsat gd2">
                                        <span className="info-text">
                                            <span id="blue-score-2"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="line-break"></div>
                            <div className="referee">
                                <div className="referee-title gd3">
                                    <span className="info-text">
                                        Giám định 3
                                    </span>
                                </div>
                                <div className="referee-score">
                                    <div className="red-score-referee-giamsat gd3">
                                        <span className="info-text">
                                            <span id="red-score-3"></span>
                                        </span>
                                    </div>
                                    <div className="blue-score-referee-giamsat gd3">
                                        <span className="info-text">
                                            <span id="blue-score-3"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="line-break"></div>
                            {this.isShowFiveReferee === true ?
                                (
                                    <React.Fragment>
                                        <div className="referee">
                                            <div className="referee-title gd4">
                                                <span className="info-text">
                                                    Giám định 4
                                                </span>
                                            </div>
                                            <div className="referee-score">
                                                <div className="red-score-referee-giamsat gd4">
                                                    <span className="info-text">
                                                        <span id="red-score-4"></span>
                                                    </span>
                                                </div>
                                                <div className="blue-score-referee-giamsat gd4">
                                                    <span className="info-text">
                                                        <span id="blue-score-4"></span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="line-break"></div>
                                        <div className="referee">
                                            <div className="referee-title gd5">
                                                <span className="info-text">
                                                    Giám định 5
                                                </span>
                                            </div>
                                            <div className="referee-score">
                                                <div className="red-score-referee-giamsat gd5">
                                                    <span className="info-text">
                                                        <span id="red-score-5"></span>
                                                    </span>
                                                </div>
                                                <div className="blue-score-referee-giamsat gd5">
                                                    <span className="info-text">
                                                        <span id="blue-score-5"></span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="line-break"></div>
                                    </React.Fragment>
                                )
                                :
                                <React.Fragment></React.Fragment>
                            }

                        </div>
                        <div className="blue-score">
                            <div className="addition" onClick={this.blueAddition}></div>
                            <div className="blueFlag countryFlag" style={{display: 'none'}}><img className="flagImage"
                                                                                                 src={require('../assets/flag/' + this.countryBlue + '.jpg')}/>
                            </div>
                            <div className="leg-strike" onClick={this.legStirkeBlue}><img
                                className="blue-leg-strike-image" id="blue-leg-strike"
                                src=""/></div>
                            <div className="subtraction subtraction-blue" onClick={this.blueSubtraction}></div>
                            <div className="line-break-score"></div>
                            <div className="blue-caution cautions-information" style={{display: 'none'}}>
                                {/*<div className="line-break-caution"></div>*/}
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-blue"><span className="info-text">Nhắc
                                        nhở</span></div>
                                    <div className="btn-decrement btn-decrement-blue" onClick={this.remindBlueDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-blue"><span
                                        className="info-text"><span id="remind-blue">0</span></span></div>
                                    <div className="btn-increment btn-increment-blue" onClick={this.remindBlueIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution"></div>
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-blue"><span className="info-text">Cảnh
                                        cáo</span></div>
                                    <div className="btn-decrement btn-decrement-blue"
                                         onClick={this.warningBlueDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-blue"><span
                                        className="info-text"><span id="warning-blue">0</span></span></div>
                                    <div className="btn-increment btn-increment-blue"
                                         onClick={this.warningBlueIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution hidden"></div>
                                <div className="cautions-box hidden">
                                    <div className="cautions-label cautions-label-blue"><span className="info-text">Y
                                        Tế</span></div>
                                    <div className="btn-decrement btn-decrement-blue"
                                         onClick={this.medicalBlueDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-blue"><span
                                        className="info-text"><span id="medical-blue">0</span></span></div>
                                    <div className="btn-increment btn-increment-blue"
                                         onClick={this.medicalBlueIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution"></div>
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-blue"><span
                                        className="info-text">Ngã</span></div>
                                    <div className="btn-decrement btn-decrement-blue" onClick={this.fallBlueDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-blue"><span
                                        className="info-text"><span id="fall-blue">0</span></span></div>
                                    <div className="btn-increment btn-increment-blue" onClick={this.fallBlueIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                <div className="line-break-caution"></div>
                                <div className="cautions-box">
                                    <div className="cautions-label cautions-label-blue"><span
                                        className="info-text">Biên</span></div>
                                    <div className="btn-decrement btn-decrement-blue" onClick={this.boundBlueDecrease}>
                                        {/* <span className="info-text"><span>-</span></span> */}
                                    </div>
                                    <div className="text-cautions-number text-cautions-number-blue"><span
                                        className="info-text"><span id="bound-blue">0</span></span></div>
                                    <div className="btn-increment btn-increment-blue" onClick={this.boundBlueIncrease}>
                                        {/* <span className="info-text"><span>+</span></span> */}
                                    </div>
                                </div>
                                {/*<div className="line-break-caution"></div>*/}
                            </div>
                            <div className="line-break-score-bot"></div>
                            <span className="info-text">
                                <span id="blue-score"></span>
                            </span>
                        </div>
                    </div>

                    <div className="modal display-none" id="passwordModal" tabIndex="-1">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title"><i className="fa-solid fa-lock"></i> Vui lòng nhập mật
                                        khẩu</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"
                                            onClick={this.hidePasswordModal}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="input-group mb-3">
                                        <span className="input-group-text"><i className="fa fa-key"
                                                                              aria-hidden="true"></i></span>
                                        <input type="password" className="form-control" placeholder="Mật khẩu"
                                               id="txtPassword" disabled/>
                                        <button type="button" className="btn btn-outline-danger btn-lg"
                                                onClick={() => this.inputPw('-1')}><i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                    <div className="numPadPassword">
                                        <div className="input-group mb-3">
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('1')}><i className="fa-solid fa-1"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('2')}><i className="fa-solid fa-2"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('3')}><i className="fa-solid fa-3"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('4')}><i className="fa-solid fa-4"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('5')}><i className="fa-solid fa-5"></i>
                                            </button>
                                        </div>
                                        <div className="input-group mb-3">
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('6')}><i className="fa-solid fa-6"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('7')}><i className="fa-solid fa-7"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('8')}><i className="fa-solid fa-8"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('9')}><i className="fa-solid fa-9"></i>
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => this.inputPw('0')}><i className="fa-solid fa-0"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary ok-button"
                                            onClick={this.verifyPassword}>OK
                                    </button>
                                    <button type="button" className="btn btn-secondary" data-dismiss="modal"
                                            onClick={this.hidePasswordModal}>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal display-none" id="chooseArenaNoModal" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="modalLabel"><i
                                        className="fa-solid fa-id-badge"></i> Chọn giải và sân thi đấu
                                    </h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"
                                            onClick={this.hideChooseArenaNoModal}></button>
                                </div>
                                <div className="modal-body">

                                    <form className="form-style-7 mt-3">
                                        <div className="row">
                                            <div className="col mb-3">
                                                {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                                                    <div className='mb-2' key={i}
                                                         onClick={() => this.chooseTournament(i)}>
                                                        <input type="radio" className="btn-check" name="tournamentRadio"
                                                               onClick={() => this.chooseTournament(i)}
                                                               id={`tournamentRadio-${tournament[0]}`}
                                                               value={tournament[1]} defaultChecked={i === 0}/>
                                                        <label className="btn btn-outline-secondary"
                                                               htmlFor={`tournamentRadio-${tournament[0]}`}><i
                                                            className="fas fa-caret-right"></i> {tournament[1]}</label>
                                                    </div>
                                                )) : (
                                                    <div></div>
                                                )}
                                                <hr className="mt-2 mb-2"/>
                                                <div className="category-buttons">
                                                    <section className="btn-group arenaChoose">
                                                        <input type="radio" className="btn-check" name="optionsArena"
                                                               id="optionsArena0" value="0" defaultChecked/>
                                                        <label className="btn btn-outline-secondary"
                                                               htmlFor="optionsArena0"> <i
                                                            className="fa-solid fa-chess-board"></i> <br/>Sân A </label>
                                                        <input type="radio" className="btn-check" name="optionsArena"
                                                               id="optionsArena1" value="1"/>
                                                        <label className="btn btn-outline-secondary"
                                                               htmlFor="optionsArena1"> <i
                                                            className="fa-solid fa-chess-board"></i> <br/>Sân B </label>
                                                    </section>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary" onClick={this.chooseArenaNo}>OK
                                    </button>
                                    <button type="button" className="btn btn-secondary" data-dismiss="modal"
                                            onClick={this.hideChooseArenaNoModal}>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal display-none" id="modalChooseMatch" tabIndex="-" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="modalLabel">Chọn trận đấu</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"
                                            onClick={this.hideModalChooseMatch}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="input-group mb-3">
                                        <span className="input-group-text"><i className="fa fa-code"></i></span>
                                        <input type="number" className="form-control" placeholder="Số thứ tự trận đấu"
                                               id="txtMatchChoose"/>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary" onClick={this.chooseMatch}>OK
                                    </button>
                                    <button type="button" className="btn btn-secondary" data-dismiss="modal"
                                            onClick={this.hideModalChooseMatch}>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal display-none" id="modalConfirm" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title"></h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"
                                            onClick={this.hideModalConfirm}></button>
                                </div>
                                <div className="modal-body">

                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary" id="buttonConfirmOK">OK</button>
                                    <button type="button" className="btn btn-secondary" data-dismiss="modal"
                                            onClick={this.hideModalConfirm}>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal display-none" id="modalShortcut" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="modalLabel"><i
                                        className="fa-solid fa-keyboard"></i> Các phím tắt</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"
                                            onClick={this.hideModalShortcut}></button>
                                </div>
                                <div className="modal-body">
                                    <table className="table">
                                        <thead>
                                        <tr>
                                            <th scope="col">Biểu Tượng</th>
                                            <th scope="col">Tên phím tắt</th>
                                            <th scope="col">Chức năng</th>
                                            <th scope="col">Ghi chú</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        <tr>
                                            <th scope="row">←</th>
                                            <td>Trái</td>
                                            <td>-1 điểm cho Đỏ</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">↑</th>
                                            <td>Lên</td>
                                            <td>+1 điểm cho Đỏ</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">→</th>
                                            <td>Phải</td>
                                            <td>+1 điểm cho Xanh</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">↓</th>
                                            <td>Xuống</td>
                                            <td>-1 điểm cho Xanh</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">—</th>
                                            <td>Cách</td>
                                            <td>Điều khiển đồng hồ</td>
                                            <td>Space</td>
                                        </tr>
                                        <tr>
                                            <th scope="row">T</th>
                                            <td>T</td>
                                            <td>Lùi trận trước</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">C</th>
                                            <td>C</td>
                                            <td>Chọn trận nhảy cóc</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">D</th>
                                            <td>D</td>
                                            <td>Đỏ thắng</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th scope="row">X</th>
                                            <td>X</td>
                                            <td>Xanh thắng</td>
                                            <td></td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" data-dismiss="modal"
                                            onClick={this.hideModalShortcut}>Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{display: 'none'}}>
                    <audio id="sound">
                        <source src={sound} type="audio/ogg"/>
                    </audio>
                </div>
                <ToastContainer/>

            </div>
        );
    }
}

export default GiamSatDoiKhangContainer;
