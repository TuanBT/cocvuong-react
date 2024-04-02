import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/bell-school.wav';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class GiamSatThiQuyenContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.db = Firebase();

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
    this.timeScore = 4; //3s Thời gian cho phép chấm điểm từ GD đầu tới cuối
    this.numReferee = 3; //Số lượng giám định chấm điểm

    this.timerCoundown = 0;
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
    this.isFirstRefereeScore = false;
    this.isTimerRunning = false;
    this.scoreTimerCount = me.timeScore;
    this.temporaryWin;
    this.numReferee = 3; //Số lượng giám định chấm điểm

    this.tournamentMartialObj;
    this.matchMartial;
    this.teamMartial;
    this.matchMartialNoCurrent = 1;
    this.teamMartialNoCurrent = 1;
    this.theFirstTeamOfMatch;
    this.theLastTeamOfMatch;
    this.refereeMartialScore = '';

    this.tournamentConst = { "lastMatch": { "no": 1 }, "referee": [{ "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }], "tournament": [] };
    this.matchObj = { "match": { "no": 1, "type": "", "category": "", "win": "" }, "fighters": { "redFighter": { "name": "Đỏ", "code": "", "score": 0 }, "blueFighter": { "name": "Xanh", "code": "", "score": 0 } } };
    this.tournamentMartialConst = { "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 }, "tournamentMartial": [] };
    this.matchMartialObj = { "match": { "name": "" }, "team": [] };
    this.fightersMartialObj = { "fighters": [], "no": 0, "score": 0, "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }] }
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    this.showPasswordModal();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'setting/passwordGiamSat'), (snapshot) => {
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
    get(child(ref(this.db), 'setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
      if (this.settingObj.isShowFiveReferee === true) {
        this.numReferee = 5;
        let refereeElement45 = "<div class='referee-sub-area'> <div class='style-hd-referee-title'> <span class='info-text'> Giám định 4 </span> </div><div class='referee-sub-score'> <span class='info-text' id='referee-4-score'> 00 </span> </div></div><div class='spec-score'></div><div class='referee-sub-area'> <div class='style-hd-referee-title'> <span class='info-text'> Giám định 5 </span> </div><div class='referee-sub-score'> <span class='info-text' id='referee-5-score'> 00 </span> </div></div><div class='spec-score'></div>";
        $(".style-hd-referee-score-area").append(refereeElement45);
        // $(".spec-score").width("4.1%");
      }
    })

    get(ref(this.db, 'lastMatchMartial')).then((snapshot) => {
      let lastMatchMartialObj = snapshot.val();
      this.matchMartialNoCurrent = lastMatchMartialObj.matchMartialNo;
      this.teamMartialNoCurrent = lastMatchMartialObj.teamMartialNo;
      onValue(ref(this.db, 'tournamentMartial'), (snapshot) => {
        console.log("on value Start");
        this.initVariable(snapshot);
        this.showValue();
        console.log("on value End");
      });
    })
  }

  _handleKeyDown = (e) => {
    if (e.which == 32) {
      this.startTimer();
    };
    //Left arrow
    if (e.which == 37) {
      this.prevMatchMartial();
    }
    //Right arrow
    if (e.which == 39) {
      this.nextMatchMartial();
    }
  }

  initVariable(snapshot) {
    this.tournamentMartialObj = snapshot.val();
    if (this.matchMartialNoCurrent > this.tournamentMartialObj.length) {
      this.matchMartialNoCurrent = this.tournamentMartialObj.length;
    }
    if (this.matchMartialNoCurrent < 1) {
      this.matchMartialNoCurrent = 1;
    }
    this.matchNoCurrentIndex = this.matchMartialNoCurrent - 1;
    this.teamNoCurrentIndex = this.teamMartialNoCurrent - 1;
    this.theLastTeamOfMatch = false;
    if (this.teamMartialNoCurrent > this.tournamentMartialObj[this.matchNoCurrentIndex].team.length) {
      this.teamMartialNoCurrent = this.tournamentMartialObj[this.matchNoCurrentIndex].team.length;
      this.teamNoCurrentIndex = this.teamMartialNoCurrent - 1;
    }
    if (this.teamMartialNoCurrent === this.tournamentMartialObj[this.matchNoCurrentIndex].team.length) {
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
    this.teamMartial = this.tournamentMartialObj[this.matchNoCurrentIndex].team[this.teamNoCurrentIndex];
  }

  pad(number, size) {
    let paddedNumber = String(number);
    while (paddedNumber.length < size) {
      paddedNumber = "0" + paddedNumber;
    }
    return paddedNumber;
  }

  showValue() {
    console.log("showValue() Start");
    //Khung thông tin về trận đấu
    $("#match-martial-name").html(this.tournamentMartialObj[this.matchMartialNoCurrent - 1].match.name);
    $("#match-martial-no").html(this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].no);
    $("#match-martial-team").html("");
    let divFlag = this.settingObj.isShowCountryFlag === true ? "<div class='countryFlagHD'><img class='info-text flagImageHD' src='" + require('../assets/flag/' + this.teamMartial.fighters[0].fighter.country + '.jpg') + "'></div>" : "";
    $("#group-fighter-info").html(divFlag);
    $("#hd-fighter-code").html(this.teamMartial.fighters[0].fighter.code);
    for (let i = 0; i < this.teamMartial.fighters.length; i++) {
      $("#match-martial-team").append("<div class='spec-score'></div><div class='fighter-detail'><div class='style-hd-fighter-name'><span class='info-text'>" + this.teamMartial.fighters[i].fighter.name + "</span></div></div>");
    }

    for (let i = 1; i <= this.numReferee; i++) {
      let refereeScore = this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].refereeMartial[i - 1].score;
      $("#referee-" + i + "-score").html(this.pad(refereeScore, 2));
    }

    $("#averageScore").html(this.pad(this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].score, 3));

    return;
  }

  nextMatchMartial = () => {
    console.log("nextMatchMartial() Start");

    if (this.matchMartialNoCurrent === this.tournamentMartialObj.length && this.teamMartialNoCurrent === this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team.length) {
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

  prevMatchMartial = () => {
    console.log("prevMatchMartial() Start");

    if (this.matchMartialNoCurrent === 1 && this.teamMartialNoCurrent === 1) {
      return;
    }

    this.teamMartialNoCurrent--;
    if (this.theFirstTeamOfMatch) {
      this.matchMartialNoCurrent--;
      this.teamMartialNoCurrent = this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team.length;
    }
    this.restoreMatch();
    console.log("prevMatchMartial() End");
  }


  restoreMatch() {
    console.log("restoreMatch() Start");

    set(ref(this.db, 'lastMatchMartial'), {
      "matchMartialNo": this.matchMartialNoCurrent,
      "teamMartialNo": this.teamMartialNoCurrent
    });

    this.stopTimer();
    this.timerCoundown = 0;
    $(".style-hd-timer-text").css("background-color", this.silverColor);
    $("#match-time").html("00:00");

    get(ref(this.db, 'tournamentMartial')).then((snapshot) => {
      this.initVariable(snapshot);
      this.showValue();
    })

    console.log("restoreMatch() End");
  }

  takeMainScore = () => {
    this.showTakeMainScoreModal();
  }

  input = (score) => {
    if (this.refereeMartialScore.length === 3) {
      toast.error("Chỉ nhập điểm từ 0 đến 999");
      return;
    }
    this.refereeMartialScore += score;
    $("#referee-result-box").html(this.refereeMartialScore);
  }

  clearInput = () => {
    this.refereeMartialScore = "";
    $("#referee-result-box").html("000");
  }

  submitInput = () => {
    $('#modalConfirm .modal-title').html("Xác nhận việc ghi đè điểm tổng");
    $('#modalConfirm .modal-body').html("<b>Lưu ý:</b> Việc ghi đè điểm tổng sẽ chuyển điểm tất cả giám định về 00!");
    this.showModalConfirm();
  }

  confirmSubmit = () => {
    if (parseInt(this.refereeMartialScore) > 999) {
      this.refereeMartialScore = "";
    }
    this.pathMartial = "tournamentMartial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
    update(ref(this.db, this.pathMartial), { "score": parseInt(this.refereeMartialScore) });
    update(ref(this.db, this.pathMartial), { "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }] });
    this.refereeMartialScore = "";
    $("#referee-result-box").html("000");
    $("#averageScore").html(this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].score);
    this.hideTakeMainScoreModal();
    toast.success("Chấm điểm thành công!");

    this.hideModalConfirm();
  }

  showShortcut = () => {
    this.showModalShortcut();
  }

  startTimer = () => {
    console.log("startTimer() Start");
    if (this.timer) {
      this.stopTimer();
      $(".style-hd-timer-text").css("background-color", this.yellowColor);
    } else {
      this.timer = setInterval(() => { this.makeTimer(); }, 1000);
      this.isTimerRunning = true;
      $(".style-hd-timer-text").css("background-color", this.greenColor);
      this.playSound();
    }
    console.log("startTimer() End");
  }

  stopTimer() {
    clearInterval(this.timer);
    this.timer = false;
    this.isTimerRunning = false;
  }

  makeTimer() {
    console.log("makeTimer() Start");

    this.timerCoundown++;

    let minutes = Math.floor(this.timerCoundown / 60);
    let seconds = Math.floor(this.timerCoundown - (minutes * 60));
    minutes < "10" ? this.minutes = "0" + minutes : this.minutes = minutes;
    seconds < "10" ? this.seconds = "0" + seconds : this.seconds = seconds;

    $("#match-time").html(this.minutes + ":" + this.seconds);
    console.log("makeTimer() End");
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
  showTakeMainScoreModal = () => {
    $('#takeMainScoreModal').removeClass('modal display-none').addClass('modal display-block');
  };
  hideTakeMainScoreModal = () => {
    $('#takeMainScoreModal').removeClass('modal display-block').addClass('modal display-none');;
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
        <div>
          <div className="style-hd-body" style={{ height: '100vh' }}>
            <div className="information">
              <div className="style-hd-info">
                <span className="info-text tournament-quyen-name">
                  <span id="tournamentName">
                  </span>
                </span>
              </div>
              <div className="style-hd-timer-area">
                <div className="style-hd-timer-text" onClick={this.startTimer}>
                  <span className="info-text">
                    <span id="match-time">
                      00:00
                    </span>
                  </span>
                </div>
              </div>
              <div className="logo-area">
                <span className="info-text">
                  <a href="#" onClick={this.showShortcut}><img src={logo} height="100%" style={{ width: '38vh' }}></img></a>
                </span>
              </div>
            </div>
            <div className="match-detail">
              <div className="match-title">
                <div className="style-hd-match-prev" onClick={this.prevMatchMartial}>
                  <span className=" info-text">
                    <i className="fa fa-caret-left"></i>
                  </span>
                </div>
                <div className="match-name-no">
                  <span className="info-text">
                    <span id="match-martial-name">
                      {/* <!-- Đa luyện vũ khí nữ --> */}
                    </span>
                    <span>
                      -
                    </span>
                    <span id="match-martial-no">
                      {/* 1 */}
                    </span>
                  </span>
                </div>
                <div className="style-hd-match-next" onClick={this.nextMatchMartial}>
                  <span className="info-text">
                    <i className="fa fa-caret-right"></i>
                  </span>
                </div>
              </div>
            </div>
            <div className="match-fighter">
              <div className="fighter-detail style-group-fighter-info">
                <span id="group-fighter-info"></span>
                <div className="style-hd-fighter-code">
                  <span className="info-text" id="hd-fighter-code"></span>
                </div>
              </div>
              <span id="match-martial-team">

              </span>
              {/* <div className="fighter-detail">
                    <div className="style-hd-style-hd-fighter-code">
                        <span className="info-text">
                            SE123456
                        </span>
                    </div>
                    <div className="style-hd-fighter-name">
                        <span className="info-text">
                            Nguyễn Đặng Thành Trung
                        </span>
                    </div>
                </div> */}
            </div>
            <div className="main-score">
              <span className="info-text" id="averageScore" onClick={this.takeMainScore}>
                000
              </span>
            </div>
            <div className="style-hd-referee-score-area">
              <div className="referee-sub-area">
                <div className="style-hd-referee-title">
                  <span className="info-text">
                    Giám định 1
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-1-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score"></div>
              <div className="referee-sub-area">
                <div className="style-hd-referee-title">
                  <span className="info-text">
                    Giám định 2
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-2-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score"></div>
              <div className="referee-sub-area">
                <div className="style-hd-referee-title">
                  <span className="info-text">
                    Giám định 3
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-3-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score"></div>
            </div>
          </div>

          <div className="modal display-none" id="takeMainScoreModal" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel">Chấm điểm</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideTakeMainScoreModal}></button>
                </div>
                <div className="modal-body">
                  <div className="container cal">
                    <div className="card-deck text-center">
                      <div className="card box-shadow">
                        <div className="card-header">
                          <h1 className="my-0 display-2" id="referee-result-box">000</h1>
                        </div>
                        <div className="card-body">
                          <div className="buttons">
                            <div className="button num-button seven" onClick={() => this.input('7')}>7</div>
                            <div className="button num-button eight" onClick={() => this.input('8')}>8</div>
                            <div className="button num-button  nine" onClick={() => this.input('9')}>9</div>
                            <div className="button num-button  four" onClick={() => this.input('4')}>4</div>
                            <div className="button num-button  five" onClick={() => this.input('5')}>5</div>
                            <div className="button num-button  six" onClick={() => this.input('6')}>6</div>
                            <div className="button num-button  one" onClick={() => this.input('1')}>1</div>
                            <div className="button num-button  two" onClick={() => this.input('2')}>2</div>
                            <div className="button num-button  three" onClick={() => this.input('3')}>3</div>
                            <div className="button action-btn eraser" onClick={this.clearInput}><i
                              className="fa-regular fa-trash-can"></i>
                            </div>
                            <div className="button num-button" onClick={() => this.input('0')}>0</div>
                            <div className="button action-btn enter" onClick={this.submitInput}><i
                              className="fa-solid fa-check"></i></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideTakeMainScoreModal}>Cancel</button>
                </div>
              </div>
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
                  <button type="button" className="btn btn-primary" onClick={this.confirmSubmit}>OK</button>
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
                        <td>Lùi trận trước</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">→</th>
                        <td>Phải</td>
                        <td>Đến trận tiếp theo</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">—</th>
                        <td>Cách</td>
                        <td>Điều khiển đồng hồ</td>
                        <td>Space</td>
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

export default GiamSatThiQuyenContainer;
