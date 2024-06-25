import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class GiamDinhDoiKhangContainer extends Component {
  constructor(props) {
    document.title = 'Giám Định Đối Kháng';
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
    this.numReferee = 3; //Số lượng Giám định chấm điểm

    this.refereeName = "";
    this.referreIndex = -1;
    this.path = "";
    this.combatArenaNoIndex = 0;
    this.matchNoCurrentIndex;
    this.teamNoCurrentIndex;
    this.tournamentNoIndex = 0;
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown);
    this.showPasswordModal();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'commonSetting/passwordGiamDinh'), (snapshot) => {
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
      $('#tournamentName').html(this.settingObj.tournamentName);
      let refereeChoose123 = "<input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee1' value='1' checked><label class='btn btn-outline-secondary' htmlFor='optionsReferee1'><i class='fa-solid fa-user'></i><br>Giám định 1</label><input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee2' value='2'><label class='btn btn-outline-secondary' htmlFor='optionsReferee2'><i class='fa-solid fa-user'></i><br>Giám định 2</label><input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee3' value='3'><label class='btn btn-outline-secondary' htmlFor='optionsReferee3'><i class='fa-solid fa-user'></i><br>Giám định 3</label>";
      $(".refereeChoose").append(refereeChoose123);
      if (this.settingObj.isShowFiveReferee === true) {
        this.numReferee = 5;
        let refereeChoose45 = "<input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee4' value='4'/> <label class='btn btn-outline-secondary' htmlFor='optionsReferee4'> <i class='fa-solid fa-user'></i> <br/>Giám định 4 </label><input type='radio' class='btn-check' name='optionsReferee' id='optionsReferee5' value='5'/> <label class='btn btn-outline-secondary' htmlFor='optionsReferee5'> <i class='fa-solid fa-user'></i> <br/>Giám định 5 </label>"
        $(".refereeChoose").append(refereeChoose45);
      }
      this.showChooseRefereeNoModal();
    })
  }

  chooseTournament = (tournamentNoIndex) => {
    this.tournamentNoIndex = tournamentNoIndex;
  }

  _handleKeyDown = (e) => {
    //Left arrow
    if (e.which == 37) {
      this.redAddition(2);
    }//up arrow
    if (e.which == 38) {
      this.redAddition(1);
    }
    //Right arrow
    if (e.which == 39) {
      this.blueAddition(2);
    }
    //Down arrow
    if (e.which == 40) {
      this.blueAddition(1);
    }
  }

  chooseRefereeNo = () => {
    let combatArenaNo = $("input:radio[name ='optionsArena']:checked").val();
    this.combatArenaNoIndex = combatArenaNo;
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/combatArenaName')).then((snapshot) => {
      $('#arena-name').html(snapshot.val());
    })
    let refereeNo = $("input:radio[name ='optionsReferee']:checked").val();
    if (refereeNo != null && refereeNo != "") {
      this.hideChooseRefereeNoModal();

      for (let i = 1; i <= this.numReferee; i++) {
        if (refereeNo === i + "") {
          this.refereeName = "Giám định " + i;
          this.referreIndex = i - 1;
        }
      }
      $("#gd-name").html(this.refereeName);

      onValue(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/combatArena/' + this.combatArenaNoIndex + '/lastMatch/no'), (snapshot) => {
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
        this.path = "tournament/" + this.tournamentNoIndex + "/combatArena/" + this.combatArenaNoIndex + "/referee/" + this.referreIndex;
      })
    }
  }

  redAddition = (score) => {
    update(ref(this.db, this.path), { "redScore": score });
    toast.error("+" + score + " điểm cho ĐỎ", {
      position: "top-left",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
      theme: "light",
    });
  }

  blueAddition = (score) => {
    update(ref(this.db, this.path), { "blueScore": score });
    toast.info("+" + score + " điểm cho XANH", {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
      theme: "light",
    });
  }

  showShortcut = () => {
    document.addEventListener("keydown", this._handleKeyDown);
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
        <div className="body" style={{ height: '100vh' }}>
          <div className="vsc-initialized" style={{ height: '100%' }}>
            <div className="gd-info">
              {/* <header className="blog-header p-3">
                <div className="col-12 text-center">
                  <span className="text-muted">
                    <a href="#" onClick={this.showShortcut}><img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân"
                      className="img-fluid" style={{ height: '50px' }} /></a>
                  </span>
                </div>
              </header> */}
              <header className="blog-header p-3">
                <div className="row justify-content-between align-items-center">

                  <div className="col-12 text-center">
                    <h1 className="" id="arena-name">&nbsp;</h1>
                    <h1 className="text-midnight-blue" id="gd-name">&nbsp;</h1>
                    <h1 className="" id="gd-match">&nbsp;</h1>
                  </div>

                </div>
              </header>
            </div>
            <div className="score-gd-area">
              <div className="red-score-refereeSc gdp">
                <div className="add-score one red" onClick={() => this.redAddition(1)}>
                  <span className="info-text">
                    1
                  </span>
                </div>
                <div className="add-score two red" onClick={() => this.redAddition(2)}>
                  <span className="info-text">
                    2
                  </span>
                </div>
              </div>
              <div className="blue-score-refereeSc gdp">
                <div className="add-score one blue" onClick={() => this.blueAddition(1)}>
                  <span className="info-text">
                    1
                  </span>
                </div>
                <div className="add-score two blue" onClick={() => this.blueAddition(2)}>
                  <span className="info-text">
                    2
                  </span>
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

            <div className="modal display-none" id="chooseRefereeNoModal" tabIndex="-1" role="dialog">
              <div className="modal-dialog" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-id-badge"></i> Chọn thông tin
                    </h5>
                    <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideChooseRefereeNoModal}></button>
                  </div>

                  <div className="modal-body">
                    <form className="form-style-7 mt-3">
                      <div className="row">
                        <div className="col mb-2">
                          <section>
                            {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                              <div className='mb-2' key={i} onClick={() => this.chooseTournament(i)}>
                                <input type="radio" className="btn-check" name="tournamentRadio" onClick={() => this.chooseTournament(i)} id={`tournamentRadio-${tournament[0]}`} value={tournament[1]} defaultChecked={i === 0} />
                                <label className="btn btn-outline-secondary" htmlFor={`tournamentRadio-${tournament[0]}`}><i className="fas fa-caret-right"></i> {tournament[1]}</label>
                              </div>
                            )) : (
                              <div></div>
                            )}
                          </section>
                        </div>
                      </div>

                      <hr className="mt-2 mb-2" />
                      <div className="arenaChooseBox">
                        <div className="category-buttons">
                          <section className="btn-group arenaChoose">
                            <input type="radio" className="btn-check" name="optionsArena" id="optionsArena0" value="0" defaultChecked />
                            <label className="btn btn-outline-secondary" htmlFor="optionsArena0"> <i className="fa-solid fa-chess-board"></i> <br />Sân A </label>
                            <input type="radio" className="btn-check" name="optionsArena" id="optionsArena1" value="1" />
                            <label className="btn btn-outline-secondary" htmlFor="optionsArena1"> <i className="fa-solid fa-chess-board"></i> <br />Sân B </label>
                          </section>
                        </div>
                      </div>

                      <hr className="mt-2 mb-2" />
                      <div className="refereeChooseBox" >
                        <div className="category-buttons">
                          <section className="btn-group refereeChoose">
                            {/* <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee1" value="1" defaultChecked />
                        <label className="btn btn-outline-secondary" htmlFor="optionsReferee1"> <i className="fa-solid fa-user"></i> <br/>Giám định 1 </label>
                        <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee2" value="2" />
                        <label className="btn btn-outline-secondary" htmlFor="optionsReferee2"> <i className="fa-solid fa-user"></i> <br/>Giám định 2 </label>
                        <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee3" value="3" />
                        <label className="btn btn-outline-secondary" htmlFor="optionsReferee3"> <i className="fa-solid fa-user"></i> <br/>Giám định 3 </label>
                        <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee4" value="4" />
                        <label className="btn btn-outline-secondary" htmlFor="optionsReferee4"> <i className="fa-solid fa-user"></i> <br/>Giám định 4 </label>
                        <input type="radio" className="btn-check" name="optionsReferee" id="optionsReferee5" value="5" />
                        <label className="btn btn-outline-secondary" htmlFor="optionsReferee5"> <i className="fa-solid fa-user"></i> <br/>Giám định 5 </label> */}
                          </section>
                        </div>
                      </div>
                    </form>
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
                    <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hideChooseRefereeNoModal}></button>
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
                          <td>+2 Đỏ</td>
                          <td></td>
                        </tr>
                        <tr>
                          <th scope="row">↑</th>
                          <td>Lên</td>
                          <td>+1 Đỏ</td>
                          <td></td>
                        </tr>
                        <tr>
                          <th scope="row">→</th>
                          <td>Phải</td>
                          <td>+2 Xanh</td>
                          <td></td>
                        </tr>
                        <tr>
                          <th scope="row">↓</th>
                          <td>Xuống</td>
                          <td>+1 Xanh</td>
                          <td></td>
                        </tr>
                        <tr>
                          <th scope="row">—</th>
                          <td>Space</td>
                          <td>Hủy điểm vừa chấm</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideChooseRefereeNoModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ToastContainer />

      </div>
    );
  }
}

export default GiamDinhDoiKhangContainer;
