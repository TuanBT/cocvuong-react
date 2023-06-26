import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import '../assets/css/style-hd.css';
import sound from '../assets/sound/bell-school.wav';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class ChamDiemHdContainer extends Component {
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
    this.ref;
    this.isFirstRefereeScore = false;
    this.isTimerRunning = false;
    this.scoreTimerCount = me.timeScore;
    this.temporaryWin;

    this.tournamentMartialObj;
    this.matchMartial;
    this.teamMartial;
    this.matchMartialNoCurrent = 1;
    this.teamMartialNoCurrent = 1;
    this.theFirstTeamOfMatch;
    this.theLastTeamOfMatch;
    this.refereeMartialScore = '';

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

    this.ref.child('setting').on('value', (snapshot) => {
      me.settingObj = snapshot.val();
      $('#tournamentName').html(me.settingObj.tournamentName);
    })

    this.ref.child('lastMatchMartial').once('value', (snapshot) => {
      let lastMatchMartialObj = snapshot.val();
      me.matchMartialNoCurrent = lastMatchMartialObj.matchMartialNo;
      me.teamMartialNoCurrent = lastMatchMartialObj.teamMartialNo;
      me.ref.child('tournamentMartial').on('value', function (snapshot) {
        console.log("on value Start");
        me.initVariable(snapshot);
        me.showValue();
        console.log("on value End");
      });
    })

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
    for (let i = 0; i < this.teamMartial.fighters.length; i++) {
      $("#match-martial-team").append("<div class='fighter-detail'><div class='style-hd-fighter-code'><span class='info-text'>" + this.teamMartial.fighters[i].fighter.code + "</span></div><div class='style-hd-fighter-name'><span class='info-text'>" + this.teamMartial.fighters[i].fighter.name + "</span></div></div>");
    }

    let referee1Score = this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].refereeMartial[0].score;
    let referee2Score = this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].refereeMartial[1].score;
    let referee3Score = this.tournamentMartialObj[this.matchMartialNoCurrent - 1].team[this.teamMartialNoCurrent - 1].refereeMartial[2].score;
    $("#referee-1-score").html(this.pad(referee1Score, 2));
    $("#referee-2-score").html(this.pad(referee2Score, 2));
    $("#referee-3-score").html(this.pad(referee3Score, 2));

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

    this.ref.child('lastMatchMartial').set({
      "matchMartialNo": this.matchMartialNoCurrent,
      "teamMartialNo": this.teamMartialNoCurrent
    });

    this.stopTimer();
    this.timerCoundown = 0;
    $(".style-hd-timer-text").css("background-color", this.silverColor);
    $("#match-time").html("00:00");

    this.ref.child('tournamentMartial').once('value', (snapshot) => {
      this.initVariable(snapshot);
      this.showValue();
    })

    console.log("restoreMatch() End");
  }

  takeAverageScore = () => {
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
    $('#modalConfirm .modal-body').html("<b>Lưu ý:</b> Việc ghi đè điểm tổng sẽ chuyển điểm cả 3 giám định về 00!");
    this.showModalConfirm();
  }

  confirmSubmit = () => {
    if (parseInt(this.refereeMartialScore) > 999) {
      this.refereeMartialScore = "";
    }
    this.pathMartial = "tournamentMartial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
    this.ref.child(this.pathMartial).update({ "score": parseInt(this.refereeMartialScore) });
    this.ref.child(this.pathMartial).update({ "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }] });
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
              <div className="match-fighter" id="match-martial-team">
                {/* <div className="fighter-detail">
                    <div className="style-hd-style-hd-.fighter-code">
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
            </div>
            <div className="main-score">
              <span className="info-text" id="averageScore" onClick={this.takeAverageScore}>
                000
              </span>
            </div>
            <div className="style-hd-referee-score-area">
              <div className="referee-sub-area">
                <div className="style-hd-referee-title">
                  <span className="info-text">
                    Giám định I
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-1-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score">
              </div>
              <div className="referee-sub-area">
                <div className="style-hd-referee-title">
                  <span className="info-text">
                    Giám định II
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-2-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score">
              </div>
              <div className="referee-sub-area">
                <div className="style-hd-referee-title">
                  <span className="info-text">
                    Giám định III
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-3-score">
                    00
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal display-none" id="takeMainScoreModal" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel">Chấm điểm</h5>
                  <button type="button" className="close" data-dismiss="modal" onClick={this.hideTakeMainScoreModal} aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="container cal mt-3">
                    <div className="card-deck mb-3 text-center">
                      <div className="card mb-4 box-shadow">
                        <div className="card-header">
                          <h1 className="my-0 font-weight-normal" id="referee-result-box">000</h1>
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

export default ChamDiemHdContainer;
