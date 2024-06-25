import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/bell-school.wav';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class GiamSatDoiKhangContainer extends Component {
  constructor(props) {
    document.title = 'Giám Sát Đối Kháng';
    super(props);
    const me = this;
    this.db = Firebase();
    this.state = {
      data: []
    };

    this.fistRound = "Hiệp 1";
    this.breakRound = "Nghỉ giữa hiệp";
    this.secondRound = "Hiệp 2";
    this.breakExtraRound = "Nghỉ hiệp phụ";
    this.extraRound = "Hiệp phụ";
    this.greenColor = "#27ae60"; //Lục - Green
    this.yellowColor = "#f1c40f"; //Vàng - Yellow
    this.redColor = "#e74c3c"; //Đỏ - red
    this.grayColor = "#95a5a6"; //Xám - Gray
    this.whiteColor = "#ffffff"; //Trắng - white
    this.blackColor = "#000000"; //Đen - black
    this.orangeColor = "#e67e22"; //Cam - Orange
    this.bodyBgColor = "#ecf0f1"; //Xám nhạt
    this.silverColor = "#bdc3c7" //Bạc
    this.timeScore = 2; //2s Thời gian cho phép chấm điểm từ GD đầu tới cuối
    this.numReferee = 3; //Số lượng giám định chấm điểm

    this.timerCoundown;
    this.round = me.fistRound;
    this.matchNoCurrent;
    this.matchNoCurrentIndex;
    this.combatObj;
    this.settingObj;
    this.refereeObj;
    this.lastMatchObj;
    this.match;
    this.timer;
    this.effectTimer;
    this.scoreTimer;
    this.isFirstRefereeScore = false;
    this.isTimerRunning = false;
    this.scoreTimerCount = me.timeScore;
    this.temporaryWin;
    this.countryRed = "red";
    this.countryBlue = "blue";
    this.combatArenaNoIndex = 0;
    this.tournamentNoIndex = 0;

    this.combatConst = { "lastMatch": { "no": 1 }, "referee": [{ "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }], "combat": [] };
    this.matchObj = { "match": { "no": 1, "type": "", "category": "", "win": "" }, "fighters": { "redFighter": { "name": "Đỏ", "code": "", "score": 0 }, "blueFighter": { "name": "Xanh", "code": "", "score": 0 } } };
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    this.showPasswordModal();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'commonSetting/passwordGiamSat'), (snapshot) => {
        if (password == snapshot.val()) {
          this.hidePasswordModal();
          this.main();
        } else {
          toast.error("Sai mật khẩu!");
          location.reload();
        }
      })
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
      this.setState({ data: this.tournaments });
    })

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (this.settingObj.isShowArenaB === true) {
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
      this.settingObj = snapshot.val();
      this.timerCoundown = this.settingObj.timeRound;
      this.timeBreak = this.settingObj.timeBreak;
      this.timeExtra = this.settingObj.timeExtra;
      this.timeExtraBreak = this.settingObj.timeExtraBreak;
      if (this.settingObj.isShowCountryFlag === true) {
        $(".redFlag").show();
        $(".blueFlag").show();
      }
      if (this.settingObj.isShowCautionBox === true) {
        $(".red-caution").show();
        $(".blue-caution").show();
      }
      this.numReferee = this.settingObj.isShowFiveReferee === true ? 5 : 3;
      this.isShowFiveReferee = this.settingObj.isShowFiveReferee;
      this.setState({ data: this.isShowFiveReferee });

      this.startEffectTimer();

      onValue(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat'), (snapshot) => {
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

      onValue(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch'), (snapshot) => {
        this.lastMatchObj = snapshot.val();
        this.matchNoCurrent = this.lastMatchObj.no;
        this.matchNoCurrentIndex = this.matchNoCurrent - 1;
        this.match = this.combatObj[this.matchNoCurrentIndex];

        this.showValue();
      })

      onValue(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee'), (snapshot) => {
        this.refereeObj = snapshot.val();
        this.showValue();
      })

      //Kiểm tra kết nối internet
      onValue(ref(this.db, '.info/connected'), (snapshot) => {
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
    console.log("showValue() Start");
    //Khung thông tin về trận đấu
    $("#match-no").html(this.match.match.no);
    $("#match-type").html(this.match.match.type);
    $("#match-category").html(this.match.match.category);

    //Khung thời gian
    if (this.timerCoundown < 0) {
      this.minutes = "00";
      this.seconds = "00";
      $(".timer-text").css("background-color", this.redColor);
    } else {
      let minutes = Math.floor(this.timerCoundown / 60);
      let seconds = Math.floor(this.timerCoundown - (minutes * 60));
      minutes < "10" ? this.minutes = "0" + minutes : this.minutes = minutes;
      seconds < "10" ? this.seconds = "0" + seconds : this.seconds = seconds;
    }
    $("#match-time").html(this.minutes + ":" + this.seconds);
    if (this.timerCoundown > 0) {
      if (this.isTimerRunning == true) {
        //Đổi màu trạng thái running cho đồng hồ đang chạy
        if (this.round == this.fistRound || this.round == this.secondRound || this.round == this.extraRound) {
          $(".timer-text").css("background-color", this.greenColor);
        } else if (this.round == this.breakRound || this.round == this.breakExtraRound) {
          $(".timer-text").css("background-color", this.orangeColor);
        }
      } else if (this.isTimerRunning == false) {
        //Đổi màu trạng thái running cho đồng hồ đang chạy
        if (this.round == this.fistRound || this.round == this.secondRound || this.round == this.extraRound) {
          if (this.round == this.fistRound && this.timerCoundown == this.settingObj.timeRound) {
            $(".timer-text").css("background-color", this.silverColor);
          } else {
            $(".timer-text").css("background-color", this.yellowColor);
          }
        } else if (this.round == this.breakRound || this.round == this.breakExtraRound) {
          $(".timer-text").css("background-color", this.yellowColor);

        }
      }
    }
    $("#match-round").html(this.round);

    //Khung cúp cho người chiến thắng
    if (this.match.match.win == "red") {
      $(".icon-win-red").css("opacity", 1);
      $(".icon-win-blue").css("opacity", "");
    } else if (this.match.match.win == "blue") {
      $(".icon-win-blue").css("opacity", 1);
      $(".icon-win-red").css("opacity", "");
    } else {
      $(".icon-win-red").css("opacity", "");
      $(".icon-win-blue").css("opacity", "");
    }

    //Khung thông tin vận động viên
    $("#red-fighter").html(this.convertWL(this.match.fighters.redFighter.name));
    $("#red-code").html(this.match.fighters.redFighter.code);
    this.countryRed = this.match.fighters.redFighter.country !== "" ? this.match.fighters.redFighter.country : "red";
    $("#red-score").html(this.match.fighters.redFighter.score);
    $("#blue-fighter").html(this.convertWL(this.match.fighters.blueFighter.name));
    $("#blue-code").html(this.match.fighters.blueFighter.code);
    $("#blue-score").html(this.match.fighters.blueFighter.score);
    this.countryBlue = this.match.fighters.blueFighter.country !== "" ? this.match.fighters.blueFighter.country : "blue";
    this.setState({ data: [] });

    //Khung chuyển trận đấu
    //Xóa nút next và Prev nếu gặp biên
    if (this.matchNoCurrent == 1) {
      $(".match-prev").hide();
      $(".match-next").show();
    } else if (this.matchNoCurrent == this.combatObj.length) {
      $(".match-prev").show();
      $(".match-next").hide();
    } else {
      $(".match-prev").show();
      $(".match-next").show();
    }

    //Khung các giám định
    //Hiện điểm các giám định
    for (let i = 1; i <= this.numReferee; i++) {
      set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex), this.combatObj[this.matchNoCurrentIndex])
      $("#red-score-" + i).html(this.refereeObj[i - 1].redScore);
      $("#blue-score-" + i).html(this.refereeObj[i - 1].blueScore);
      if (this.refereeObj[i - 1].redScore != 0 || this.refereeObj[i - 1].blueScore != 0) {
        $(".referee-title.gd" + i).css("background-color", this.greenColor);
      } else {
        $(".referee-title.gd" + i).css("background-color", "");
      }
    }

    //caution area
    $("#remind-red").text(this.match.fighters.redFighter.caution.remind);
    $("#warning-red").text(this.match.fighters.redFighter.caution.warning);
    $("#medical-red").text(this.match.fighters.redFighter.caution.medical);
    $("#fall-red").text(this.match.fighters.redFighter.caution.fall);
    $("#bound-red").text(this.match.fighters.redFighter.caution.bound);
    $("#remind-blue").text(this.match.fighters.blueFighter.caution.remind);
    $("#warning-blue").text(this.match.fighters.blueFighter.caution.warning);
    $("#medical-blue").text(this.match.fighters.blueFighter.caution.medical);
    $("#fall-blue").text(this.match.fighters.blueFighter.caution.fall);
    $("#bound-blue").text(this.match.fighters.blueFighter.caution.bound);

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
    this.timerCoundown = this.settingObj.timeRound;
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
      this.refereeObj[i] = { blueScore: 0, redScore: 0 };
      referees.push(this.refereeObj[i]);
    }
    set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/referee'), referees)
    console.log("restoreMatch() End");
  }


  redWin = () => {
    console.log("redWin() Start");
    let winMatch = "W." + this.matchNoCurrent;
    for (let i = this.matchNoCurrent; i < this.combatObj.length; i++) {
      let fightersTemp = this.combatObj[i].fighters;
      if (fightersTemp.redFighter.result === winMatch) {
        for (let j = i; j < this.combatObj.length; j++) {
          let fightersTemp2 = this.combatObj[j].fighters;
          let winMatch2 = "W." + j;
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
    $('#modalConfirm .modal-body').html("<h3 style='color: red'><i class='fa-solid fa-hand-back-fist'></i> " + this.convertWL(this.match.fighters.redFighter.name) + "</h3><h3 style='color: red'>" + this.match.fighters.redFighter.code + "</h3>");
    this.showModalConfirm();

    $("#buttonConfirmOK").click(() => {
      if (this.temporaryWin == "red") {
        this.stopTimer();
        this.replaceFighter("red");
        setTimeout(() => {
          this.match.match.win = "red";
          set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/match/win'), "red")
          $(".icon-win-red").css({ opacity: 1 });
          $(".icon-win-blue").css("opacity", "");
          $(".red-score").css("background-color", "red");
          $(".red-score").css("color", this.whiteColor);
          $(".blue-score").css("background-color", "blue");
          $(".blue-score").css("color", this.whiteColor);
        }, 1000);
        this.hideModalConfirm();
      }
    })
    console.log("redWin() End");
  }

  blueWin = () => {
    console.log("blueWin() Start");
    let winMatch = "W." + this.matchNoCurrent;
    for (let i = this.matchNoCurrent; i < this.combatObj.length; i++) {
      let fightersTemp = this.combatObj[i].fighters;
      if (fightersTemp.redFighter.result === winMatch) {
        for (let j = i; j < this.combatObj.length; j++) {
          let fightersTemp2 = this.combatObj[j].fighters;
          let winMatch2 = "W." + j;
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
    $('#modalConfirm .modal-body').html("<h3 style='color: blue'><i class='fa-solid fa-hand-back-fist'></i> " + this.convertWL(this.match.fighters.blueFighter.name) + "</h3><h3 style='color: blue'>" + this.match.fighters.blueFighter.code + "</h3>");
    this.showModalConfirm();

    $("#buttonConfirmOK").click(() => {
      if (this.temporaryWin == "blue") {
        this.stopTimer();
        this.replaceFighter("blue");
        setTimeout(() => {
          this.match.match.win = "blue";
          set(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combat/' + this.matchNoCurrentIndex + '/match/win'), "blue")
          $(".icon-win-blue").css({ opacity: 1 });
          $(".icon-win-red").css("opacity", "");
          $(".red-score").css("background-color", "red");
          $(".red-score").css("color", this.whiteColor);
          $(".blue-score").css("background-color", "blue");
          $(".blue-score").css("color", this.whiteColor);
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
      if (this.refereeObj[i].redScore != 0 || this.refereeObj[i].blueScore != 0) {
        if (!this.isFirstRefereeScore) {
          this.isFirstRefereeScore = true;
        }
        this.scoreTimerCount--;
        console.log(this.scoreTimerCount);
        //Kết thúc nếu có >50% trọng tài chấm điểm
        let redScoreCounter = 0;
        let blueScoreCounter = 0;
        for (let i = 0; i < this.numReferee; i++) {
          if (this.refereeObj[i].redScore !== 0) {
            redScoreCounter++;
          }
          if (this.refereeObj[i].blueScore !== 0) {
            blueScoreCounter++;
          }
        }
        if (this.scoreTimerCount == 0 || redScoreCounter > this.numReferee / 2 || blueScoreCounter > this.numReferee / 2) {
          console.log("makeScoreTimer() Start");
          //Tổng kết và tính điểm
          let redScoreArray = [];
          let blueScoreArray = [];
          for (let i = 0; i < this.numReferee; i++) {
            redScoreArray.push(this.refereeObj[i].redScore);
            blueScoreArray.push(this.refereeObj[i].blueScore);
          }
          this.match.fighters.redFighter.score += this.getModes(redScoreArray);
          this.match.fighters.blueFighter.score += this.getModes(blueScoreArray);
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
    if (this.timerCoundown < 0) {
      //Hiệp 1 kết thúc
      if (this.round == this.fistRound) {
        this.round = this.breakRound;
        this.timerCoundown = this.timeBreak;
        $(".timer-text").css("background-color", this.orangeColor);
      }
      //Nghỉ giữa hiệp kết thúc
      else if (this.round == this.breakRound) {
        this.round = this.secondRound;
        this.timerCoundown = this.settingObj.timeRound;
        this.stopTimer();
        $(".timer-text").css("background-color", this.yellowColor);
      }
      //Hiệp 2 kết thúc
      else if (this.round == this.secondRound) {
        //Hết trận
        if (this.match.fighters.redFighter.score != this.match.fighters.blueFighter.score) {
          this.stopTimer();
          $(".timer-text").css("background-color", this.redColor);
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
          $(".timer-text").css("background-color", this.orangeColor);
        }
      }
      //Hết nghỉ hiệp phụ
      else if (this.round == this.breakExtraRound) {
        this.round = this.extraRound;
        this.timerCoundown = this.timeExtra;
        this.stopTimer();
        $(".timer-text").css("background-color", this.yellowColor);
      }
      //Hiệp phụ kết thúc - Hết trận
      else if (this.round == this.extraRound) {
        this.stopTimer();
        $(".timer-text").css("background-color", this.redColor);
        if (this.match.fighters.redFighter.score > this.match.fighters.blueFighter.score) {
          this.redWin();
        } else if (this.match.fighters.redFighter.score < this.match.fighters.blueFighter.score) {
          this.blueWin();
        }
        return;
      }
    }

    if (this.timerCoundown == 0) {
      $(".timer-text").css("background-color", this.redColor);
      this.minutes = "00";
      this.seconds = "00";
      this.playSound();
    } else if (this.timerCoundown < 0) {
      this.minutes = "00";
      this.seconds = "00";
    } else {
      let minutes = Math.floor(this.timerCoundown / 60);
      let seconds = Math.floor(this.timerCoundown - (minutes * 60));
      minutes < "10" ? this.minutes = "0" + minutes : this.minutes = minutes;
      seconds < "10" ? this.seconds = "0" + seconds : this.seconds = seconds;
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
    } else {
      this.playSound();
      setTimeout(() => {
        this.timer = setInterval(() => { this.makeTimer(); }, 1000);
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
      this.effectTimer = setInterval(() => { this.makeEffectTimer(); }, 500);
    }
    if (!this.scoreTimer) {
      this.scoreTimer = setInterval(() => { this.makeScoreTimer(); }, 1000);
    }
    console.log("startEffectTimer() End");
  }

  stopTimer() {
    clearInterval(this.timer);
    this.timer = false;
    this.isTimerRunning = false;
  }

  getModes(array) {
    let frequency = {}; // array of frequency.
    let maxFreq = 0; // holds the max frequency.
    let modes = [];

    for (let i in array) {
      frequency[array[i]] = (frequency[array[i]] || 0) + 1; // increment frequency.

      if (frequency[array[i]] > maxFreq) { // is this frequency > max so far ?
        maxFreq = frequency[array[i]]; // update max.
      }
    }

    for (let k in frequency) {
      if (frequency[k] == maxFreq) {
        modes.push(k);
      }
    }

    if (modes.length == 1) {
      return +modes[0];
    }

    return 0;
  }

  convertWL(type_no) {
    let type = type_no.split('.')[0];
    let no = type_no.split('.')[1];

    if (type === "W") {
      let s = "THẮNG TRẬN " + no;
      return s
    } else if (type === "L") {
      let s = "THUA TRẬN " + no;
      return s
    } else {
      return type_no;
    }
  }

  playSound() {
    let sound = document.getElementById("reggSound");
    if (sound.paused) {
      sound.play();
    } else {
      sound.currentTime = 0
    }
    sound.play();
  }

  inputPw = (value) => {
    if (value === "-1") {
      $("#txtPassword").val("");
    } else {
      let oldValue = $("#txtPassword").val();
      $("#txtPassword").val(oldValue + value);
    }
  }

  showPasswordModal = () => {
    $('#passwordModal').removeClass('modal display-none').addClass('modal display-block');
  };
  hidePasswordModal = () => {
    $('#passwordModal').removeClass('modal display-block').addClass('modal display-none');;
  };
  showChooseArenaNoModal = () => {
    $('#chooseArenaNoModal').removeClass('modal display-none').addClass('modal display-block');
  };
  hideChooseArenaNoModal = () => {
    $('#chooseArenaNoModal').removeClass('modal display-block').addClass('modal display-none');;
  };
  showModalChooseMatch = () => {
    $('#modalChooseMatch').removeClass('modal display-none').addClass('modal display-block');
  };
  hideModalChooseMatch = () => {
    $('#modalChooseMatch').removeClass('modal display-block').addClass('modal display-none');;
  };
  showModalConfirm = () => {
    $('#modalConfirm').removeClass('modal display-none').addClass('modal display-block');
  };
  hideModalConfirm = () => {
    $('#modalConfirm').removeClass('modal display-block').addClass('modal display-none');;
  };
  showModalShortcut = () => {
    $('#modalShortcut').removeClass('modal display-none').addClass('modal display-block');
  };
  hideModalShortcut = () => {
    $('#modalShortcut').removeClass('modal display-block').addClass('modal display-none');;
  };


  render() {
    return (
      <div>
        <div className="body" style={{ height: '100vh' }}>
          <div className="info-area">
            <div className="info-match-left-area">
              <div className="referee-score-area-top">
                <span className="info-text">
                  <span id="tournamentName">
                    Cóc Vương
                  </span>
                  <span id="internet-status">
                    - Mất kết nối Internet...
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
                    <span id="red-code"></span>
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
                  <a href="#" onClick={this.showShortcut}><img src={logo} height="100%" style={{ width: '20vh' }} /></a>
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
                    <span id="blue-code"></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="score-area">
            <div className="red-score">
              <div className="addition" onClick={this.redAddition}></div>
              <div className="redFlag countryFlag" style={{ display: 'none' }}><img className="flagImage" src={require('../assets/flag/' + this.countryRed + '.jpg')} /></div>
              <div className="subtraction subtraction-red" onClick={this.redSubtraction}></div>
              <div className="red-caution cautions-information" style={{ display: 'none' }}>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-red"><span className="info-text">&nbsp;<i className="fas fa-exclamation-circle"></i>&nbsp;Nhắc nhở&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-red" onClick={this.remindRedDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-red"><span className="info-text"><span id="remind-red">0</span></span></div>
                  <div className="btn-increment btn-increment-red" onClick={this.remindRedIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-red"><span className="info-text">&nbsp;<i className="fas fa-exclamation-triangle"></i>&nbsp;Cảnh cáo&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-red" onClick={this.warningRedDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-red"><span className="info-text"><span id="warning-red">0</span></span></div>
                  <div className="btn-increment btn-increment-red" onClick={this.warningRedIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-red"><span className="info-text">&nbsp;<i className="fas fa-briefcase-medical"></i>&nbsp;Y Tế&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-red" onClick={this.medicalRedDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-red"><span className="info-text"><span id="medical-red">0</span></span></div>
                  <div className="btn-increment btn-increment-red" onClick={this.medicalRedIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-red"><span className="info-text">&nbsp;<i className="fas fa-slash"></i>&nbsp;Ngã&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-red" onClick={this.fallRedDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-red"><span className="info-text"><span id="fall-red">0</span></span></div>
                  <div className="btn-increment btn-increment-red" onClick={this.fallRedIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-red"><span className="info-text">&nbsp;<i className="fas fa-grip-lines-vertical"></i>&nbsp;Biên&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-red" onClick={this.boundRedDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-red"><span className="info-text"><span id="bound-red">0</span></span></div>
                  <div className="btn-increment btn-increment-red" onClick={this.boundRedIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
              </div>
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
                  <div className="red-score-refereeSc">
                    <span className="info-text">
                      <span id="red-score-1"></span>
                    </span>
                  </div>
                  <div className="blue-score-refereeSc">
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
                  <div className="red-score-refereeSc">
                    <span className="info-text">
                      <span id="red-score-2"></span>
                    </span>
                  </div>
                  <div className="blue-score-refereeSc">
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
                  <div className="red-score-refereeSc">
                    <span className="info-text">
                      <span id="red-score-3"></span>
                    </span>
                  </div>
                  <div className="blue-score-refereeSc">
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
                        <div className="red-score-refereeSc">
                          <span className="info-text">
                            <span id="red-score-4"></span>
                          </span>
                        </div>
                        <div className="blue-score-refereeSc">
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
                        <div className="red-score-refereeSc">
                          <span className="info-text">
                            <span id="red-score-5"></span>
                          </span>
                        </div>
                        <div className="blue-score-refereeSc">
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
              <div className="blueFlag countryFlag" style={{ display: 'none' }}><img className="flagImage" src={require('../assets/flag/' + this.countryBlue + '.jpg')} /></div>
              <div className="subtraction subtraction-blue" onClick={this.blueSubtraction}></div>
              <div className="blue-caution cautions-information" style={{ display: 'none' }}>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-blue"><span className="info-text">&nbsp;<i className="fas fa-exclamation-circle"></i>&nbsp;Nhắc nhở&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-blue" onClick={this.remindBlueDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-blue"><span className="info-text"><span id="remind-blue">0</span></span></div>
                  <div className="btn-increment btn-increment-blue" onClick={this.remindBlueIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-blue"><span className="info-text">&nbsp;<i className="fas fa-exclamation-triangle"></i>&nbsp;Cảnh cáo&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-blue" onClick={this.warningBlueDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-blue"><span className="info-text"><span id="warning-blue">0</span></span></div>
                  <div className="btn-increment btn-increment-blue" onClick={this.warningBlueIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-blue"><span className="info-text">&nbsp;<i className="fas fa-briefcase-medical"></i>&nbsp;Y Tế&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-blue" onClick={this.medicalBlueDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-blue"><span className="info-text"><span id="medical-blue">0</span></span></div>
                  <div className="btn-increment btn-increment-blue" onClick={this.medicalBlueIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-blue"><span className="info-text">&nbsp;<i className="fas fa-slash"></i>&nbsp;Ngã&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-blue" onClick={this.fallBlueDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-blue"><span className="info-text"><span id="fall-blue">0</span></span></div>
                  <div className="btn-increment btn-increment-blue" onClick={this.fallBlueIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
                <div className="cautions-box">
                  <div className="cautions-label cautions-label-blue"><span className="info-text">&nbsp;<i className="fas fa-grip-lines-vertical"></i>&nbsp;Biên&nbsp;</span></div>
                  <div className="btn-decrement btn-decrement-blue" onClick={this.boundBlueDecrease}><span className="info-text"><span>-</span></span></div>
                  <div className="text-cautions-number text-cautions-number-blue"><span className="info-text"><span id="bound-blue">0</span></span></div>
                  <div className="btn-increment btn-increment-blue" onClick={this.boundBlueIncrease}><span className="info-text"><span>+</span></span></div>
                </div>
                <div className="line-break-caution"></div>
              </div>
              <span className="info-text">
                <span id="blue-score"></span>
              </span>
            </div>
          </div>

          <div className="modal display-none" id="passwordModal" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="fa-solid fa-lock"></i> Vui lòng nhập mật khẩu</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hidePasswordModal}></button>
                </div>
                <div className="modal-body">
                  <div className="input-group mb-3">
                    <span className="input-group-text"><i className="fa fa-key" aria-hidden="true"></i></span>
                    <input type="password" className="form-control" placeholder="Mật khẩu" id="txtPassword" disabled />
                    <button type="button" className="btn btn-outline-danger btn-lg" onClick={() => this.inputPw('-1')}><i className="fas fa-trash-alt"></i></button>
                  </div>
                  <div className="numPadPassword">
                    <div className="input-group mb-3">
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('1')}><i className="fa-solid fa-1"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('2')}><i className="fa-solid fa-2"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('3')}><i className="fa-solid fa-3"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('4')}><i className="fa-solid fa-4"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('5')}><i className="fa-solid fa-5"></i></button>
                    </div>
                    <div className="input-group mb-3">
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('6')}><i className="fa-solid fa-6"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('7')}><i className="fa-solid fa-7"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('8')}><i className="fa-solid fa-8"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('9')}><i className="fa-solid fa-9"></i></button>
                      <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => this.inputPw('0')}><i className="fa-solid fa-0"></i></button>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary ok-button" onClick={this.verifyPassword}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hidePasswordModal} >Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal display-none" id="chooseArenaNoModal" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-id-badge"></i> Chọn giải và sân thi đấu
                  </h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideChooseArenaNoModal}></button>
                </div>
                <div className="modal-body">

                  <form className="form-style-7 mt-3">
                    <div className="row">
                      <div className="col mb-3">
                        {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                          <div className='mb-2' key={i} onClick={() => this.chooseTournament(i)}>
                            <input type="radio" className="btn-check" name="tournamentRadio" onClick={() => this.chooseTournament(i)} id={`tournamentRadio-${tournament[0]}`} value={tournament[1]} defaultChecked={i === 0} />
                            <label className="btn btn-outline-secondary" htmlFor={`tournamentRadio-${tournament[0]}`}><i className="fas fa-caret-right"></i> {tournament[1]}</label>
                          </div>
                        )) : (
                          <div></div>
                        )}
                        <hr className="mt-2 mb-2" />
                        <div className="category-buttons">
                          <section className="btn-group arenaChoose">
                            <input type="radio" className="btn-check" name="optionsArena" id="optionsArena0" value="0" defaultChecked />
                            <label className="btn btn-outline-secondary" htmlFor="optionsArena0"> <i className="fa-solid fa-chess-board"></i> <br />Sân A </label>
                            <input type="radio" className="btn-check" name="optionsArena" id="optionsArena1" value="1" />
                            <label className="btn btn-outline-secondary" htmlFor="optionsArena1"> <i className="fa-solid fa-chess-board"></i> <br />Sân B </label>
                          </section>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={this.chooseArenaNo}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideChooseArenaNoModal}>Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal display-none" id="modalChooseMatch" tabIndex="-" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel">Chọn trận đấu</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideModalChooseMatch}></button>
                </div>
                <div className="modal-body">
                  <div className="input-group mb-3">
                    <span className="input-group-text"><i className="fa fa-code"></i></span>
                    <input type="number" className="form-control" placeholder="Số thứ tự trận đấu" id="txtMatchChoose" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={this.chooseMatch}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideModalChooseMatch}>Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal display-none" id="modalConfirm" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"></h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideModalConfirm}></button>
                </div>
                <div className="modal-body">

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" id="buttonConfirmOK">OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideModalConfirm}>Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal display-none" id="modalShortcut" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-keyboard"></i> Các phím tắt</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideModalShortcut}></button>
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
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideModalShortcut}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'none' }}>
          <audio id="reggSound">
            <source src={sound} type="audio/ogg" />
          </audio>
        </div>
        <ToastContainer />

      </div>
    );
  }
}

export default GiamSatDoiKhangContainer;
