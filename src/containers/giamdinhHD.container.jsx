import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import "../assets/css/style.css";
import "../assets/css/style-giam_dinh_hd.css";

class GiamDinhHdContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;

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

    this.timerCoundown;
    this.round = this.fistRound;
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
    this.scoreTimerCount = this.timeScore;
    this.refereeName = "";
    this.referreIndex = -1;
    this.path = "";
    this.refereeScore = {
    "redScore": 0,
    "blueScore": 0
}
this.refereeMartialScore = "";
this.matchNoCurrentIndex;
this.teamNoCurrentIndex;

    const tournamentConst = {
      "lastMatch":
      {
        "no": 1
      },
      "setting":
      {
        "timeRound": 90,
        "timeBreak": 30,
        "timeExtra": 60,
        "timeExtraBreak": 15,
        "tournamentName": "Cóc Vương"
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
        "this.teamMartialNo": 1
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

    this.ref = database.ref();
    this.tournamentMartialObj;
    this.matchMartial;
    this.teamMartial;
    this.matchMartialNoCurrent = 1;
    this.teamMartialNoCurrent = 1;
    this.theFirstTeamOfMatch;
    this.theLastTeamOfMatch;
    this.timerCoundown = 0;
    this.refereeMartialScore = "";

    $(document).ready(function () {
      //Phím tắt cho các chức năng trên màn hình
      document.addEventListener("keydown", function (e) {
        //console.log(event.which);
        //Space
        if (e.which == 32) {
          this.submitInput();
        };
        //ESC
        if (e.which == 27) {
          this.clearInput();
        }
        //0
        if (e.which == 48) {
          this.input(0);
        }
        //1
        if (e.which == 49) {
          this.input(1);
        }
        //2
        if (e.which == 50) {
          this.input(2);
        }
        //3
        if (e.which == 51) {
          this.input(3);
        }
        //4
        if (e.which == 52) {
          this.input(4);
        }
        //5
        if (e.which == 53) {
          this.input(5);
        }
        //6
        if (e.which == 54) {
          this.input(6);
        }
        //7
        if (e.which == 55) {
          this.input(7);
        }
        //8
        if (e.which == 56) {
          this.input(8);
        }
        //9
        if (e.which == 57) {
          this.input(9);
        }
      })
      window.$('#chooseRefereeNoModal').modal('show');
    })
  }

  takeAverageScore() {
    $("#takeMainScoreModal").modal('show');
  }

  input(score) {
    if (this.refereeMartialScore.length == 3) {
      // $.showNotification({
      //   body: "Chỉ nhập điểm từ 0 đến 999", type: "danger"
      // })
      return;
    }
    this.refereeMartialScore += score;
    $("#referee-result-box").html(this.refereeMartialScore);
  }

  clearInput() {
    this.refereeMartialScore = "";
    $("#referee-result-box").html("000");
  }

  submitInput() {
    console.log("submitInput");
    $('#modalConfirm .modal-title').html("Xác nhận việc ghi đè điểm tổng");
    $('#modalConfirm .modal-body').html("<b>Lưu ý:</b> Việc ghi đè điểm tổng sẽ chuyển điểm cả 3 giám định về 00!");

    window.$('#modalConfirm').modal('show');

    $("#buttonConfirmOK").click(() => {
      if (parseInt(this.refereeMartialScore) > 999) {
        this.refereeMartialScore = "";
      }
      this.pathMartial = "tournamentMartial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
      var _this = this;
      this.ref.child(this.pathMartial).update({ "score": parseInt(_this.refereeMartialScore) }); //Có bug về việc gọi nhiều lần hàm này sau mỗi một lần ấn
      this.ref.child(this.pathMartial).update({ "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }] });
      this.refereeMartialScore = "";
      $("#referee-result-box").html("00");
      // $.showNotification({
      //   body: "Chấm điểm thành công!", type: "success"
      // })

      window.$('#modalConfirm').modal('hide');
    })
  }

  showShortcut() {
    window.$("#modalShortcut").modal("show");
  }

  chooseRefereeNo() {
    var refereeNo = $("input:radio[name ='optionsReferee']:checked").val();
    if (refereeNo != null && refereeNo != "") {
      window.$('#chooseRefereeNoModal').modal('hide');

      if (refereeNo == "1") {
        this.refereeName = "Giám định I";
        this.referreIndex = 0;
      }
      else if (refereeNo == "2") {
        this.refereeName = "Giám định II";
        this.referreIndex = 1;
      }
      else if (refereeNo == "3") {
        this.refereeName = "Giám định III";
        this.referreIndex = 2;
      }
      $("#gd-name").html(this.refereeName);

      var _this = this;

      this.ref.child("lastMatch/no").on('value', function (snapshot) {
        //Kiểm tra kết nối internet
        _this.ref.child('.info/connected').on('value', function (snapshot) {
          if (!snapshot.val() === true) {
            $('#internet-status').show();
          } else {
            $('#internet-status').hide();
          }
        })

        var matchCurrentNoIndex = snapshot.val() - 1;
        var matchCurrentNo = matchCurrentNoIndex + 1
        $("#gd-match").html("Trận số " + matchCurrentNo);
        _this.path = "referee/" + _this.referreIndex;
      })

      this.ref.child("lastMatchMartial").on('value', function (snapshot) {
        //Kiểm tra kết nối internet
        _this.ref.child('.info/connected').on('value', function (snapshot) {
          if (!snapshot.val() === true) {
            $('#internet-status').show();
          } else {
            $('#internet-status').hide();
          }
        })

        var lastMatchMartial = snapshot.val();

        _this.matchNoCurrentIndex = lastMatchMartial.matchMartialNo - 1;
        _this.teamNoCurrentIndex = lastMatchMartial.teamMartialNo - 1;

        _this.ref.child("tournamentMartial/" + _this.matchNoCurrentIndex).once('value', function (snapshot) {
          $("#match-martial-name").html(snapshot.val().match.name);
          $("#match-martial-no").html(snapshot.val().team[_this.teamNoCurrentIndex].no);
        })

        _this.pathMartial = "tournamentMartial/" + _this.matchNoCurrentIndex + "/team/" + _this.teamNoCurrentIndex + "/refereeMartial/" + _this.referreIndex;
      })
    }
  }

  render() {
    return (
      <div>
        <div className="container-fluit">
          <header className="blog-header p-3">
            <div className="row flex-nowrap justify-content-between align-items-center">
              <div className="col-4 pt-1 text-center">
                <span className="text-pomegrante" id="tournamentName"></span>
              </div>
              <div className="col-4 text-center">
                <h2 className="blog-header-logo text-midnight-blue" id="gd-name"></h2>
              </div>
              <div className="col-4 d-flex justify-content-end align-items-center">
                <span className="text-muted">
                  <a href="#" onClick={this.showShortcut.bind(this)}><img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân" className="img-fluid"
                    style={{ height: "50px" }} /></a>
                </span>
              </div>
            </div>
          </header>
        </div>

        <div className="pricing-header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center text-belize-hole">
          <h1 className="display-4">
            <span id="match-martial-name">
            </span>
            <span>
              -
            </span>
            <span id="match-martial-no">
            </span>
          </h1>
          <p className="lead text-danger" id="internet-status"></p>
        </div>

        <div className="container cal mt-3">
          <div className="card-deck mb-3 text-center">
            <div className="card mb-4 box-shadow">
              <div className="card-header">
                <h1 className="my-0 font-weight-normal" id="referee-result-box">00</h1>
              </div>
              <div className="card-body">
                <div className="buttons">
                  <div className="button num-button seven" onClick={this.input.bind(this, '7')}>7</div>
                  <div className="button num-button eight" onClick={this.input.bind(this, '8')}>8</div>
                  <div className="button num-button  nine" onClick={this.input.bind(this, '9')}>9</div>
                  <div className="button num-button  four" onClick={this.input.bind(this, '4')}>4</div>
                  <div className="button num-button  five" onClick={this.input.bind(this, '5')}>5</div>
                  <div className="button num-button  six" onClick={this.input.bind(this, '6')}>6</div>
                  <div className="button num-button  one" onClick={this.input.bind(this, '1')}>1</div>
                  <div className="button num-button  two" onClick={this.input.bind(this, '2')}>2</div>
                  <div className="button num-button  three" onClick={this.input.bind(this, '3')}>3</div>
                  <div className="button action-btn eraser" onClick={this.clearInput.bind(this)}><i className="fa-regular fa-trash-can"></i>
                  </div>
                  <div className="button num-button" onClick={this.input.bind(this, '0')}>0</div>
                  <div className="button action-btn enter" onClick={this.submitInput.bind(this)}><i className="fa-solid fa-check"></i></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="chooseRefereeNoModal" tabindex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-id-badge"></i> Chọn mã giám định của bạn</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="btn-group btn-group-toggle" data-toggle="buttons">
                  <label className="btn btn-warning active">
                    <input type="radio" name="optionsReferee" value="1" autocomplete="off" checked /><i className="fa-solid fa-user"></i> Giám định I
                  </label>
                  <label className="btn btn-warning">
                    <input type="radio" name="optionsReferee" value="2" autocomplete="off" /><i className="fa-solid fa-user"></i> Giám định II
                  </label>
                  <label className="btn btn-warning">
                    <input type="radio" name="optionsReferee" value="3" autocomplete="off" /><i className="fa-solid fa-user"></i> Giám định III
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={this.chooseRefereeNo.bind(this)}>OK</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal fade" id="modalConfirm" tabindex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"></h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" id="buttonConfirmOK">OK</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal fade" id="modalShortcut" tabindex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-keyboard"></i> Các phím tắt</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
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
                      <th scope="col">Lưu ý</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">0..9</th>
                      <td>0..9</td>
                      <td>Số 0 tới 9</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">—</th>
                      <td>Space</td>
                      <td>Chấm điểm</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">Esc</th>
                      <td>Esc</td>
                      <td>Xóa điểm</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

export default GiamDinhHdContainer;
