import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import '../assets/css/style-giam_dinh_hd.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class GiamDinhHdContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();

    this.round = me.fistRound;
    this.matchNoCurrent;
    this.matchNoCurrentIndex;
    this.tournamentObj;
    this.settingObj;
    this.match;
    this.scoreTimer;
    this.matchMartial;
    this.teamMartial;
    this.matchMartialNoCurrent = 1;
    this.refereeMartialScore = '';

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
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    this.showPasswordModal();
  }
  
  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      this.ref.child('pass/firstPass').once('value', (snapshot) => {
        if (password == snapshot.val()) {
          this.hidePasswordModal();
          this.main();
        } else {
          toast.error("Sai mật khẩu!");
        }
      })
    } else {
      toast.error("Sai mật khẩu!");
    }
  }

  main(){
    this.ref.child('setting').on('value', (snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
      this.showChooseRefereeNoModal();
    })
  }

  _handleKeyDown = (e) => {
    //Space
    if (e.which == 32) {
      submitInput()();
    };
    //ESC
    if (e.which == 27) {
      clearInput();
    }
    //0
    if (e.which == 48) {
      input(0);
    }
    //1
    if (e.which == 49) {
      input(1);
    }
    //2
    if (e.which == 50) {
      input(2);
    }
    //3
    if (e.which == 51) {
      input(3);
    }
    //4
    if (e.which == 52) {
      input(4);
    }
    //5
    if (e.which == 53) {
      input(5);
    }
    //6
    if (e.which == 54) {
      input(6);
    }
    //7
    if (e.which == 55) {
      input(7);
    }
    //8
    if (e.which == 56) {
      input(8);
    }
    //9
    if (e.which == 57) {
      input(9);
    }
  }

  chooseRefereeNo = () => {
    let refereeNo = $("input:radio[name ='optionsReferee']:checked").val();
    if (refereeNo != null && refereeNo != "") {
      this.hideChooseRefereeNoModal();

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

      this.ref.child("lastMatch/no").on('value', (snapshot) => {
        //Kiểm tra kết nối internet
        this.ref.child('.info/connected').on('value', (snapshot) => {
          if (!snapshot.val() === true) {
            $('#internet-status').show();
          } else {
            $('#internet-status').hide();
          }
        })

        let matchCurrentNoIndex = snapshot.val() - 1;
        let matchCurrentNo = matchCurrentNoIndex + 1
        $("#gd-match").html("Trận số " + matchCurrentNo);
        this.path = "referee/" + this.referreIndex;
      })

      this.ref.child("lastMatchMartial").on('value', (snapshot) => {
        //Kiểm tra kết nối internet
        this.ref.child('.info/connected').on('value', (snapshot) => {
          if (!snapshot.val() === true) {
            $('#internet-status').show();
          } else {
            $('#internet-status').hide();
          }
        })

        let lastMatchMartial = snapshot.val();

        this.matchNoCurrentIndex = lastMatchMartial.matchMartialNo - 1;
        this.teamNoCurrentIndex = lastMatchMartial.teamMartialNo - 1;

        this.ref.child("tournamentMartial/" + this.matchNoCurrentIndex).once('value', (snapshot) => {
          $("#match-martial-name").html(snapshot.val().match.name);
          $("#match-martial-no").html(snapshot.val().team[this.teamNoCurrentIndex].no);
        })

        this.pathMartial = "tournamentMartial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex + "/refereeMartial/" + this.referreIndex;
      })
    }
  }

  input = (score) => {
    if (this.refereeMartialScore.length == 2) {
      toast.error("Chỉ nhập điểm từ 0 đến 999");
      return;
    }
    this.refereeMartialScore += score;
    $("#referee-result-box").html(this.refereeMartialScore);
  }

  clearInput() {
    this.refereeMartialScore = "";
    $("#referee-result-box").html("00");
  }

  submitInput = () => {
    console.log
    if (parseInt(this.refereeMartialScore) > 99) {
      this.refereeMartialScore = "";
    }
    this.ref.child(this.pathMartial).update({ "score": parseInt(this.refereeMartialScore) });

    this.pathMartialScore = "tournamentMartial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
    this.ref.child(this.pathMartialScore).once('value', (snapshot) => {
      let refereeMartialObj = snapshot.val();
      let referee1Score = refereeMartialObj.refereeMartial[0].score;
      let referee2Score = refereeMartialObj.refereeMartial[1].score;
      let referee3Score = refereeMartialObj.refereeMartial[2].score;
      let totalScore = referee1Score + referee2Score + referee3Score;
      this.ref.child(this.pathMartialScore).update({ "score": parseInt(totalScore) });
    })

    this.refereeMartialScore = "";
    $("#referee-result-box").html("00");
    toast.success("Chấm điểm thành công!");
  }

  showShortcut = () => {
    this.showModalShortcut();
  }

 showPasswordModal = () => {
    $('#passwordModal').removeClass('modal display-none').addClass('modal display-block');
  };
  hidePasswordModal = () => {
    $('#passwordModal').removeClass('modal display-block').addClass('modal display-none');;
  };
  showChooseRefereeNoModal = () => {
    $('#chooseRefereeNoModal').removeClass('modal display-none').addClass('modal display-block');
  };
  hideChooseRefereeNoModal = () => {
    $('#chooseRefereeNoModal').removeClass('modal display-block').addClass('modal display-none');;
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

        <div className="body style-gd-hd-body" style={{ height: '100vh' }}>
          <div className="vsc-initialized">
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
                      <a href="#" onClick={this.showShortcut}><img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân"
                        className="img-fluid" style={{ height: '50px' }} /></a>
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
          </div>

          <div className="container cal mt-3">
            <div className="card-deck mb-3 text-center">
              <div className="card mb-4 box-shadow">
                <div className="card-header">
                  <h1 className="my-0 font-weight-normal" id="referee-result-box">00</h1>
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

        <div>
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
                    <input type="password" className="form-control" placeholder="Mật khẩu" id="txtPassword" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary ok-button" onClick={this.verifyPassword}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hidePasswordModal} >Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal display-none" id="chooseRefereeNoModal" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-id-badge"></i> Chọn mã giám định của bạn
                  </h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideChooseRefereeNoModal}></button>
                </div>
                <div className="modal-body">
                  <div className="category-buttons">
                    <section className="btn-group">
                      <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee1" value="1" defaultChecked />
                      <label className="btn btn-outline-secondary" htmlFor="optionsReferee1"> <i className="fa-solid fa-user"></i> Giám định I </label>
                      <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee2" value="2" />
                      <label className="btn btn-outline-secondary" htmlFor="optionsReferee2"> <i className="fa-solid fa-user"></i> Giám định II </label>
                      <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee3" value="3" />
                      <label className="btn btn-outline-secondary" htmlFor="optionsReferee3"> <i className="fa-solid fa-user"></i> Giám định III </label>
                    </section>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={this.chooseRefereeNo}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideChooseRefereeNoModal}>Cancel</button>
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
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideModalShortcut}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ToastContainer />

      </div >
    );
  }
}

export default GiamDinhHdContainer;
