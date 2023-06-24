import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/bell-school.wav';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class ChamDiemDkContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();

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
    this.tournamentObj;
    this.settingObj;
    this.refereeObj;
    this.lastMatchObj;
    this.match;
    this.timer;
    this.effectTimer;
    this.scoreTimer;
    this.sound;
    this.ref;
    this.isFirstRefereeScore = false;
    this.isTimerRunning = false;
    this.scoreTimerCount = me.timeScore;

    this.temporaryWin;

    this.settingConst = {
      "setting":
      {
        "timeRound": 90,
        "timeBreak": 30,
        "timeExtra": 60,
        "timeExtraBreak": 15,
        "tournamentName": "Cóc Vương"
      }
    }

    this.tournamentConst = {
      "lastMatch":
      {
        "no": 1
      },
      "referee": [
        {
          "redScore": 0,
          "blueScore": 0
        },
        {
          "redScore": 0,
          "blueScore": 0
        },
        {
          "redScore": 0,
          "blueScore": 0
        }
      ],
      "tournament": []
    }

    this.matchObj = {
      "match": {
        "no": 1,
        "type": "",
        "category": "",
        "win": ""
      },
      "fighters": {
        "redFighter": {
          "name": "Đỏ",
          "code": "",
          "score": 0
        },
        "blueFighter": {
          "name": "Xanh",
          "code": "",
          "score": 0
        }
      }
    };

    this.tournamentMartialConst = {
      "lastMatchMartial": {
        "matchMartialNo": 1,
        "teamMartialNo": 1
      },
      "tournamentMartial": [
      ]
    }

    this.matchMartialObj = {
      "match": {
        "name": ""
      },
      "team": []
    };

    this.fightersMartialObj = {
      "fighters": [],
      "no": 0,
      "score": 0,
      "refereeMartial": [
        {
          "score": 0
        },
        {
          "score": 0
        },
        {
          "score": 0
        }
      ],
    }

    this.fighterMartialObj = {
      "fighter":
      {
        "code": "",
        "name": "",
      }
    }

    this.ref.child('setting').on('value',  (snapshot) => {
      me.settingObj = snapshot.val();
      $('#tournamentName').html(me.settingObj.tournamentName);

      me.startEffectTimer();

      me.ref.child('setting').on('value', function (snapshot) {
        me.settingObj = snapshot.val();
        me.timerCoundown = me.settingObj.timeRound;
        me.timeBreak = me.settingObj.timeBreak;
        me.timeExtra = me.settingObj.timeExtra;
        me.timeExtraBreak = me.settingObj.timeExtraBreak;
      })

      me.ref.child('tournament').on('value', function (snapshot) {
        me.tournamentObj = snapshot.val();
        if (me.lastMatchObj == null) {
          me.matchNoCurrent = me.tournamentConst.lastMatch.no;
          me.matchNoCurrentIndex = me.matchNoCurrent - 1;
          me.match = me.tournamentObj[me.matchNoCurrentIndex];
        }
        if (me.refereeObj == null) {
          me.refereeObj = me.tournamentConst.referee;
        }
        me.showValue();
      });

      me.ref.child('lastMatch').on('value', function (snapshot) {
        me.lastMatchObj = snapshot.val();
        me.matchNoCurrent = me.lastMatchObj.no;
        me.matchNoCurrentIndex = me.matchNoCurrent - 1;
        me.match = me.tournamentObj[me.matchNoCurrentIndex];

        me.showValue();
      })

      me.ref.child('referee').on('value', function (snapshot) {
        me.refereeObj = snapshot.val();
        me.showValue();
      })

      //Kiểm tra kết nối internet
      me.ref.child('.info/connected').on('value', function (snapshot) {
        if (!snapshot.val() === true) {
          $('#internet-status').show();
        } else {
          $('#internet-status').hide();
        }
      })
    })
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
    $("#red-score").html(this.match.fighters.redFighter.score);
    $("#blue-fighter").html(this.convertWL(this.match.fighters.blueFighter.name));
    $("#blue-code").html(this.match.fighters.blueFighter.code);
    $("#blue-score").html(this.match.fighters.blueFighter.score);

    //Khung chuyển trận đấu
    //Xóa nút next và Prev nếu gặp biên
    if (this.matchNoCurrent == 1) {
      $(".match-prev").hide();
      $(".match-next").show();
    } else if (this.matchNoCurrent == this.tournamentObj.length) {
      $(".match-prev").show();
      $(".match-next").hide();
    } else {
      $(".match-prev").show();
      $(".match-next").show();
    }

    //Khung các giám định
    //Hiện điểm các giám định
    for (let i = 1; i <= this.numReferee; i++) {
      this.ref.child('tournament').set(this.tournamentObj);
      $("#red-score-" + i).html(this.refereeObj[i - 1].redScore);
      $("#blue-score-" + i).html(this.refereeObj[i - 1].blueScore);
      if (this.refereeObj[i - 1].redScore != 0 || this.refereeObj[i - 1].blueScore != 0) {
        $(".referee-title.gd" + i).css("background-color", this.greenColor);
      } else {
        $(".referee-title.gd" + i).css("background-color", "");
      }
    }
    console.log("showValue() End");
  }

  saveMatch() {
    console.log("saveMatch() Start");
    this.ref.child('tournament/' + this.matchNoCurrentIndex).update(this.match);
    console.log("saveMatch() End");
  }
  
  //Gõ số để đi đến trận đấu
  chooseMatch = () => {
    console.log("chooseMatch() Start");

    let matchChoose = $('#txtMatchChoose').val();

    if (matchChoose != null && matchChoose != "") {
      if (matchChoose < 1 || matchChoose > this.tournamentObj.length) {
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

      $("#buttonConfirmOK").click( () => {
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
    this.ref.child('lastMatch/no').set(this.matchNoCurrent);
    let referees = [];
    for (let i = 0; i < this.numReferee; i++) {
      this.refereeObj[i] = { blueScore: 0, redScore: 0 };
      referees.push(this.refereeObj[i]);
    }
    this.ref.child('referee').set(referees);
    console.log("restoreMatch() End");
  }


  redWin = () => {
    console.log("redWin() Start");
    if (this.match.match.win == "blue") {
      toast.error("XANH đã thắng, bạn không thể thay đổi kết quả được!");
    } else {
      this.temporaryWin = "red";

      $('#modalConfirm .modal-title').html("<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>");
      $('#modalConfirm .modal-body').html("<h3 style='color: red'><i class='fa-solid fa-medal'></i> " + this.convertWL(this.match.fighters.redFighter.name) + " (" + this.match.fighters.redFighter.code + ")</h3>");
      this.showModalConfirm();

      $("#buttonConfirmOK").click(() => {
        if (this.temporaryWin == "red") {
          this.stopTimer();
          this.replaceFighter("red");
          setTimeout(() => {
            this.match.match.win = "red";
            this.ref.child('tournament/' + this.matchNoCurrentIndex + '/match/win').set("red");
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
    }
    console.log("redWin() End");
  }



  blueWin = () => {
    console.log("blueWin() Start");
    if (this.match.match.win == "red") {
      toast.error("ĐỎ đã thắng, bạn không thể thay đổi kết quả được!");
    } else {
      this.temporaryWin = "blue";

      $('#modalConfirm .modal-title').html("<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>");
      $('#modalConfirm .modal-body').html("<h3 style='color: blue'><i class='fa-solid fa-medal'></i> " + this.convertWL(this.match.fighters.blueFighter.name) + " (" + this.match.fighters.blueFighter.code + ")</h3>");
      this.showModalConfirm();

      $("#buttonConfirmOK").click(() => {
        if (this.temporaryWin == "blue") {
          this.stopTimer();
          this.replaceFighter("blue");
          this.setTimeout(() => {
            this.match.match.win = "blue";
            this.ref.child('tournament/' + this.matchNoCurrentIndex + '/match/win').set("blue");
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
    }
    console.log("redWin() End");
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

    for (let i = this.matchNoCurrent; i < this.tournamentObj.length; i++) {
      let fightersTemp = this.tournamentObj[i].fighters;
      if (fightersTemp.redFighter.name == matchWin) {
        fightersTemp.redFighter = JSON.parse(JSON.stringify(winFighter));
        fightersTemp.redFighter.score = 0;
        this.ref.child('tournament/' + i + '/fighters').update(fightersTemp);
        break;
      }

      if (fightersTemp.redFighter.name == matchLose) {
        fightersTemp.redFighter = JSON.parse(JSON.stringify(loseFighter));
        fightersTemp.redFighter.score = 0;
        this.ref.child('tournament/' + i + '/fighters').update(fightersTemp);
        break;
      }

      if (fightersTemp.blueFighter.name == matchWin) {
        fightersTemp.blueFighter = JSON.parse(JSON.stringify(winFighter));
        fightersTemp.blueFighter.score = 0;
        this.ref.child('tournament/' + i + '/fighters').update(fightersTemp);
        break;
      }

      if (fightersTemp.blueFighter.name == matchLose) {
        fightersTemp.blueFighter = JSON.parse(JSON.stringify(loseFighter));
        fightersTemp.blueFighter.score = 0;
        this.ref.child('tournament/' + i + '/fighters').update(fightersTemp);
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
          this.ref.child('tournament/' + this.matchNoCurrentIndex + '/fighters').set(this.match.fighters);
          //Reset Giám định
          this.ref.child('referee').set(this.tournamentConst.referee);
          this.refereeObj = this.tournamentConst.referee;
          this.scoreTimerCount = this.timeScore;
          this.isFirstRefereeScore = false;
          console.log("makeScoreTimer() End");
          break;
        }
      }
    }
  }

  // //Score referee time
  // makeScoreTimer1() {
  //   console.log("makeScoreTimer1");
  //   for (let i = 0; i < this.numReferee; i++) {
  //     if (this.refereeObj[i].redScore != 0 || this.refereeObj[i].blueScore != 0) {
  //       if (!this.isFirstRefereeScore) {
  //         this.tournamentObj.scoreTimer = this.timeScore;
  //         this.isFirstRefereeScore = true;
  //       }
  //       this.tournamentObj.scoreTimer--;
  //       if (this.tournamentObj.scoreTimer == 0) {
  //         //Tổng kết và tính điểm
  //         let redScoreArray = [];
  //         let blueScoreArray = [];
  //         for (let i = 0; i < this.numReferee; i++) {
  //           redScoreArray.push(this.refereeObj[i].redScore);
  //           blueScoreArray.push(this.refereeObj[i].blueScore);
  //         }
  //         this.match.fighters.redFighter.score += this.getModes(redScoreArray);
  //         this.match.fighters.blueFighter.score += this.getModes(blueScoreArray);

  //         this.ref.child('tournament/' + this.matchNoCurrentIndex + '/fighters').update(this.match.fighters);
  //         this.isFirstRefereeScore = false;
  //       }
  //       break;
  //     }
  //   }
  // }

  makeTimer() {
    console.log("makeTimer() Start");
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

    console.log("makeTimer() End");
  }

  showShortcut =()=> {
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
    // console.log("makeEffectTimer() Start");
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
    // console.log("makeEffectTimer() End");
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
                  </span>
                  <span id="internet-status">
                    - Mất kết nối Internet...
                  </span>
                </span>
              </div>
              <div className="referee-score-area">
                <div className="line-break"></div>
                <div className="referee">
                  <a href="http://buitientuan.com/chamdiem/giamdinh.html" target="_blank">
                    <div className="referee-title gd1">
                      <span className="info-text">
                        Giám định I
                      </span>
                    </div>
                  </a>
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
                      Giám định II
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
                      Giám định III
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
              </div>
              <div className="red-fighter">
                <div className="red-win">
                  <span className="info-text">

                  </span>
                </div>
                <div className="fighter-code red">
                  <span className="info-text-fighter-code-red">
                    <span id="red-code"></span>
                  </span>
                </div>
                <div className="fighter-name red">

                  <span className="info-text-fighter-name-red" onClick={this.redWin}>
                    <span className="icon-win-red">
                      <i className="fa-solid fa-medal"></i>
                    </span>
                    <span id="red-fighter">
                    </span>
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
                  <a href="#" onClick={this.showShortcut}><img src={logo} height="100%"  style={{width : '30vh'}}/></a>
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
                <div className="fighter-code blue">
                  <span className="info-text-fighter-code-blue">
                    <span id="blue-code"></span>
                  </span>
                </div>
                <div className="fighter-name blue">
                  <span className="info-text-fighter-name-blue" onClick={this.blueWin}>
                    <span id="blue-fighter"></span>
                    <span className="icon-win-blue">
                      <i className="fa-solid fa-medal"></i>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="score-area">
            <div className="red-score">
              <div className="addition" onClick={this.redAddition}></div>
              <div className="subtraction" onClick={this.redSubtraction}></div>
              <span className="info-text">
                <span id="red-score"></span>
              </span>
            </div>
            <div className="blue-score">
              <div className="addition" onClick={this.blueAddition}></div>
              <div className="subtraction" onClick={this.blueSubtraction}></div>
              <span className="info-text">
                <span id="blue-score"></span>
              </span>
            </div>
          </div>

          <div className="modal display-none" id="modalChooseMatch" tabIndex="-" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel">Trọn trận đấu</h5>
                  <button type="button" className="close" data-dismiss="modal" onClick={this.hideModalChooseMatch} aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="input-group mb-3">
                    <div className="input-group-prepend">
                      <span className="input-group-text"><i className="fa fa-code"></i></span>
                    </div>
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
                  <button type="button" className="close" data-dismiss="modal" onClick={this.hideModalConfirm} aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
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
                  <button type="button" className="close" data-dismiss="modal" onClick={this.hideModalShortcut} aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
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

export default ChamDiemDkContainer;
