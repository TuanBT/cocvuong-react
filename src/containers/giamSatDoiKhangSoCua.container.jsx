import React, { Component } from 'react';
import $ from 'jquery';
import logo from '../assets/img/logo.png';
import sound from '../assets/sound/bell-school.wav';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class GiamSatDoiKhangSoCuaContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
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
    this.tournamentObj;
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

    this.tournamentConst = { "lastMatch": { "no": 1 }, "referee": [{ "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }], "tournament": [] };
    this.matchObj = { "match": { "no": 0, "type": "-", "category": "-", "win": "" }, "fighters": { "redFighter": { "name": "Đỏ", "code": "", "score": 0 }, "blueFighter": { "name": "Xanh", "code": "", "score": 0 } } };
    this.settingObj = { "setting": { "timeRound": 90, "timeBreak": 30, "timeExtra": 60, "timeExtraBreak": 15, "tournamentName": "Cóc Vương", "isShowCountryFlag": false, "isShowFiveReferee": false, "password": 1 } };
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    this.main();
  }

  main() {
    this.timerCoundown = this.settingObj.setting.timeRound;
      this.timeBreak = this.settingObj.setting.timeBreak;
      this.timeExtra = this.settingObj.setting.timeExtra;
      this.timeExtraBreak = this.settingObj.setting.timeExtraBreak;
      this.startEffectTimer();
    this.showValue();
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
    $("#match-no").html(this.matchObj.match.no);
    $("#match-type").html(this.matchObj.match.type);
    $("#match-category").html(this.matchObj.match.category);

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
    if (this.matchObj.match.win == "red") {
      $(".icon-win-red").css("opacity", 1);
      $(".icon-win-blue").css("opacity", "");
    } else if (this.matchObj.match.win == "blue") {
      $(".icon-win-blue").css("opacity", 1);
      $(".icon-win-red").css("opacity", "");
    } else {
      $(".icon-win-red").css("opacity", "");
      $(".icon-win-blue").css("opacity", "");
    }

    //Khung thông tin vận động viên
    $("#red-fighter").html(this.matchObj.fighters.redFighter.name);
    $("#red-code").html(this.matchObj.fighters.redFighter.code);
    $("#red-score").html(this.matchObj.fighters.redFighter.score);
    $("#blue-fighter").html(this.matchObj.fighters.blueFighter.name);
    $("#blue-code").html(this.matchObj.fighters.blueFighter.code);
    $("#blue-score").html(this.matchObj.fighters.blueFighter.score);
    this.setState({ data: [] });

    console.log("showValue() End");
  }

  redWin = () => {
    console.log("redWin() Start");
    if (this.matchObj.match.win == "blue") {
      toast.error("XANH đã thắng, bạn không thể thay đổi kết quả được!");
    } else {
      this.temporaryWin = "red";

      $('#modalConfirm .modal-title').html("<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>");
      $('#modalConfirm .modal-body').html("<h3 style='color: red'><i class='fa-solid fa-medal'></i> " + this.convertWL(this.matchObj.fighters.redFighter.name) + " (" + this.matchObj.fighters.redFighter.code + ")</h3>");
      this.showModalConfirm();

      $("#buttonConfirmOK").click(() => {
        if (this.temporaryWin == "red") {
          this.stopTimer();
          setTimeout(() => {
            this.matchObj.match.win = "red";
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
    if (this.matchObj.match.win == "red") {
      toast.error("ĐỎ đã thắng, bạn không thể thay đổi kết quả được!");
    } else {
      this.temporaryWin = "blue";

      $('#modalConfirm .modal-title').html("<i class='fa-solid fa-clipboard-check'></i> Xác nhận kết quả <b>THẮNG</b>");
      $('#modalConfirm .modal-body').html("<h3 style='color: blue'><i class='fa-solid fa-medal'></i> " + this.convertWL(this.matchObj.fighters.blueFighter.name) + " (" + this.matchObj.fighters.blueFighter.code + ")</h3>");
      this.showModalConfirm();

      $("#buttonConfirmOK").click(() => {
        if (this.temporaryWin == "blue") {
          this.stopTimer();
          setTimeout(() => {
            this.matchObj.match.win = "blue";
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
    this.matchObj.fighters.redFighter.score++;
    $("#red-score").html(this.matchObj.fighters.redFighter.score);
  }

  blueAddition = () => {
    this.matchObj.fighters.blueFighter.score++;
    $("#blue-score").html(this.matchObj.fighters.blueFighter.score);
  }

  redSubtraction = () => {
    this.matchObj.fighters.redFighter.score--;
    $("#red-score").html(this.matchObj.fighters.redFighter.score);
  }

  blueSubtraction = () => {
    this.matchObj.fighters.blueFighter.score--;
    $("#blue-score").html(this.matchObj.fighters.blueFighter.score);
  }

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
        if (this.matchObj.fighters.redFighter.score != this.matchObj.fighters.blueFighter.score) {
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
    if (this.matchObj.match.win == "red") {
      if ($(".red-score").css("background-color") == "rgb(255, 0, 0)") {
        $(".red-score").css("background-color", this.bodyBgColor);
        $(".red-score").css("color", "red");
      } else {
        $(".red-score").css("background-color", "red");
        $(".red-score").css("color", this.whiteColor);
      }
    } else if (this.matchObj.match.win == "blue") {
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
    console.log("startEffectTimer() End");
  }

  stopTimer() {
    clearInterval(this.timer);
    this.timer = false;
    this.isTimerRunning = false;
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
                    Giám Sát Đối Kháng Sơ Cua
                  </span>
                  <span id="internet-status">
                    - Mất kết nối Internet...
                  </span>
                </span>
              </div>
              <div className="referee-score-area">
                <div className="line-break"></div>
                <div className="referee">
                  <div className="referee-title gd1">
                    <span className="info-text">
                      -
                    </span>
                  </div>
                  <div className="referee-score">
                    <div className="red-score-refereeSc">
                      <span className="info-text">
                        <span id="red-score-1">-</span>
                      </span>
                    </div>
                    <div className="blue-score-refereeSc">
                      <span className="info-text">
                        <span id="blue-score-1">-</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="line-break"></div>
                <div className="referee">
                  <div className="referee-title gd2">
                    <span className="info-text">
                      -
                    </span>
                  </div>
                  <div className="referee-score">
                    <div className="red-score-refereeSc">
                      <span className="info-text">
                        <span id="red-score-2">-</span>
                      </span>
                    </div>
                    <div className="blue-score-refereeSc">
                      <span className="info-text">
                        <span id="blue-score-2">-</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="line-break"></div>
                <div className="referee">
                  <div className="referee-title gd3">
                    <span className="info-text">
                      -
                    </span>
                  </div>
                  <div className="referee-score">
                    <div className="red-score-refereeSc">
                      <span className="info-text">
                        <span id="red-score-3">-</span>
                      </span>
                    </div>
                    <div className="blue-score-refereeSc">
                      <span className="info-text">
                        <span id="blue-score-3">-</span>
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
                <span className="info-text">
                  <span id="match-no"></span>
                </span>
              </div>
              <div className="logo">
                <span className="info-text">
                  <a href="#" onClick={this.showShortcut}><img src={logo} height="100%" style={{ width: '30vh' }} /></a>
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
              <div className="redFlag countryFlag" style={{ display: 'none' }}><img className="flagImage" src={require('../assets/flag/' + this.countryRed + '.jpg')} /></div>
              <div className="subtraction" onClick={this.redSubtraction}></div>
              <span className="info-text">
                <span id="red-score"></span>
              </span>
            </div>
            <div className="blue-score">
              <div className="addition" onClick={this.blueAddition}></div>
              <div className="blueFlag countryFlag" style={{ display: 'none' }}><img className="flagImage" src={require('../assets/flag/' + this.countryBlue + '.jpg')} /></div>
              <div className="subtraction" onClick={this.blueSubtraction}></div>
              <span className="info-text">
                <span id="blue-score"></span>
              </span>
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

export default GiamSatDoiKhangSoCuaContainer;
