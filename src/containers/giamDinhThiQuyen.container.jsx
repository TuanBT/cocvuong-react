import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class GiamDinhThiQuyenContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.db = Firebase();

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
    this.numReferee = 3; //Số lượng giám định chấm điểm

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
    this.showPasswordModal();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'setting/password'), (snapshot) => {
        if (password == snapshot.val()) {
          this.hidePasswordModal();
          document.addEventListener("keydown", this._handleKeyDown);
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
      let refereeChoose123 = "<input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee1' value='1' checked><label class='btn btn-outline-secondary' for='optionsReferee1'><i class='fa-solid fa-user'></i><br>Giám định 1</label><input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee2' value='2'><label class='btn btn-outline-secondary' for='optionsReferee2'><i class='fa-solid fa-user'></i><br>Giám định 2</label><input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee3' value='3'><label class='btn btn-outline-secondary' for='optionsReferee3'><i class='fa-solid fa-user'></i><br>Giám định 3</label>";
      $(".refereeChoose").append(refereeChoose123);
      if (this.settingObj.isShowFiveReferee === true) {
        this.numReferee = 5;
        let refereeChoose45 = "<input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee4' value='4'/> <label class='btn btn-outline-secondary' for='optionsReferee4'> <i class='fa-solid fa-user'></i> <br/>Giám định 4 </label><input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee5' value='5'/> <label class='btn btn-outline-secondary' for='optionsReferee5'> <i class='fa-solid fa-user'></i> <br/>Giám định 5 </label>"
        $(".refereeChoose").append(refereeChoose45);
      }
      this.showChooseRefereeNoModal();
    })
  }

  _handleKeyDown = (e) => {
    //Space
    if (e.which == 32) {
      this.submitInput()();
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
  }

  chooseRefereeNo = () => {
    let refereeNo = $("input:radio[name ='optionsReferee']:checked").val();
    if (refereeNo != null && refereeNo != "") {
      this.hideChooseRefereeNoModal();

      if (refereeNo == "1") {
        this.refereeName = "Giám định 1";
        this.referreIndex = 0;
      }
      else if (refereeNo == "2") {
        this.refereeName = "Giám định 2";
        this.referreIndex = 1;
      }
      else if (refereeNo == "3") {
        this.refereeName = "Giám định 3";
        this.referreIndex = 2;
      }
      $("#gd-name").html(this.refereeName);

      onValue(ref(this.db, 'lastMatch/no'), (snapshot) => {
        //Kiểm tra kết nối internet
        onValue(ref(this.db, '.info/connected'), (snapshot) => {
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

      onValue(ref(this.db, 'lastMatchMartial'), (snapshot) => {
        //Kiểm tra kết nối internet
        onValue(ref(this.db, '.info/connected'), (snapshot) => {
          if (!snapshot.val() === true) {
            $('#internet-status').show();
          } else {
            $('#internet-status').hide();
          }
        })

        let lastMatchMartial = snapshot.val();

        this.matchNoCurrentIndex = lastMatchMartial.matchMartialNo - 1;
        this.teamNoCurrentIndex = lastMatchMartial.teamMartialNo - 1;

        get(ref(this.db, 'tournamentMartial/' + this.matchNoCurrentIndex)).then((snapshot) => {
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

  clearInput = () => {
    this.refereeMartialScore = "";
    $("#referee-result-box").html("00");
  }

  submitInput = () => {
    console.log
    if (parseInt(this.refereeMartialScore) > 99) {
      this.refereeMartialScore = "";
    }
    update(ref(this.db, this.pathMartial), { "score": parseInt(this.refereeMartialScore) });

    this.pathMartialScore = "tournamentMartial/" + this.matchNoCurrentIndex + "/team/" + this.teamNoCurrentIndex;
    get(ref(this.db, this.pathMartialScore)).then((snapshot) => {
      let refereeMartialObj = snapshot.val();
      let finalScore = 0;
      let refereeScore = 0;
      let minScore = 0;
      let maxScore = 0;
      for (let i = 1; i <= this.numReferee; i++) {
        let score = refereeMartialObj.refereeMartial[i - 1].score;
        refereeScore += score;
        minScore = score < minScore ? score : minScore;
        maxScore = score > maxScore ? score : maxScore;
      }
      if (this.numReferee === 5) {
        finalScore = refereeScore - (minScore + maxScore);
      } else {
        finalScore = refereeScore;
      }
      update(ref(this.db, this.pathMartialScore), { "score": parseInt(finalScore) });
    })

    this.refereeMartialScore = "";
    $("#referee-result-box").html("00");
    toast.success("Chấm điểm thành công!");
  }

  showShortcut = () => {
    this.showModalShortcut();
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
          <div className="info-header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center text-belize-hole">
            <h1 className="blog-header-logo text-midnight-blue" id="gd-name"></h1>
            <h2>
              <span id="match-martial-name"></span>
              <span> - </span>
              <span id="match-martial-no"></span>
            </h2>
            <p className="lead text-danger" id="internet-status"></p>
          </div>

          <div className="container-cal" >
            <div className="cal">
              <div className="card-deck text-center">
                <div className="card box-shadow">
                  <div className="card-header">
                    <h1 className="my-0 display-2 info-text" id="referee-result-box">00</h1>
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
                    <section className="btn-group refereeChoose">
                      {/* <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee1" value="1" defaultChecked />
                      <label className="btn btn-outline-secondary" htmlFor="optionsReferee1"> <i className="fa-solid fa-user"></i> Giám định 1 </label>
                      <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee2" value="2" />
                      <label className="btn btn-outline-secondary" htmlFor="optionsReferee2"> <i className="fa-solid fa-user"></i> Giám định 2 </label>
                      <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee3" value="3" />
                      <label className="btn btn-outline-secondary" htmlFor="optionsReferee3"> <i className="fa-solid fa-user"></i> Giám định 3 </label> */}
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
        <ToastContainer
          position="top-right"
          autoClose={1000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable={false}
          pauseOnHover={false}
          theme="light"
        />

      </div >
    );
  }
}

export default GiamDinhThiQuyenContainer;
