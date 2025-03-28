import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavLink } from "react-router-dom";

class SettingContainer extends Component {
  constructor(props) {
    document.title = 'Thiết Đặt';
    super(props);
    const me = this;
    this.state = {
      data: []
    };


    this.db = Firebase();
    this.settingObj;
    this.tournamentObj;

    this.tournamentNoIndex = 0;

    this.settingConst = { "setting": { "combat": { "isShowArenaB": true, "isShowCautionBox": true, "isShowCountryFlag": true, "isShowFiveReferee": false, "timeBreak": 60, "timeExtra": 120, "timeExtraBreak": 60, "timeRound": 120 }, "martial": { "isShowArenaB": true, "isShowCountryFlag": true, "isShowFiveReferee": false }, "tournamentName": "Cóc Vương" } };
    this.commonSettingConst = { "passwordSetting": 1, "passwordGiamSat": 1, "passwordGiamDinh": 1 };
  }

  componentDidMount() {
    this.showPasswordModal();
    // this.main();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'commonSetting/passwordSetting'), (snapshot) => {
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

    get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $("input[name=timeRound]").val(this.settingObj.combat.timeRound);
      $("input[name=timeBreak]").val(this.settingObj.combat.timeBreak);
      $("input[name=timeExtra]").val(this.settingObj.combat.timeExtra);
      $("input[name=timeExtraBreak]").val(this.settingObj.combat.timeExtraBreak);
      $("input[name=tournamentName]").val(this.settingObj.tournamentName);
      $("#flexSwitchCountryFlagCombat").prop("checked", this.settingObj.combat.isShowCountryFlag);
      $("#showCautionBoxCombat").prop("checked", this.settingObj.combat.isShowCautionBox);
      $("#quantityRefereeCombat").prop("checked", this.settingObj.combat.isShowFiveReferee);
      $("#flexSwitchCountryFlagMartial").prop("checked", this.settingObj.martial.isShowCountryFlag);
      $("#quantityRefereeMartial").prop("checked", this.settingObj.martial.isShowFiveReferee);
    })

    get(ref(this.db, 'commonSetting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $("input[name=passwordSetting]").val(this.settingObj.passwordSetting);
      $("input[name=passwordGiamDinh]").val(this.settingObj.passwordGiamDinh);
      $("input[name=passwordGiamSat]").val(this.settingObj.passwordGiamSat);
    })

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
    })
  }

  resetTournament = () => {
    console.log("resetSetting Start");
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      console.log(this.tournamentObj);
      for (let i = 0; i < this.tournamentObj.combat.length; i++) {
        this.tournamentObj.combat[i].fighters.redFighter.caution.bound = 0;
        this.tournamentObj.combat[i].fighters.redFighter.caution.fall = 0;
        this.tournamentObj.combat[i].fighters.redFighter.caution.medical = 0;
        this.tournamentObj.combat[i].fighters.redFighter.caution.remind = 0;
        this.tournamentObj.combat[i].fighters.redFighter.caution.warning = 0;
        this.tournamentObj.combat[i].fighters.redFighter.result = "";
        this.tournamentObj.combat[i].fighters.redFighter.score = 0;

        this.tournamentObj.combat[i].fighters.blueFighter.caution.bound = 0;
        this.tournamentObj.combat[i].fighters.blueFighter.caution.fall = 0;
        this.tournamentObj.combat[i].fighters.blueFighter.caution.medical = 0;
        this.tournamentObj.combat[i].fighters.blueFighter.caution.remind = 0;
        this.tournamentObj.combat[i].fighters.blueFighter.caution.warning = 0;
        this.tournamentObj.combat[i].fighters.blueFighter.result = "";
        this.tournamentObj.combat[i].fighters.blueFighter.score = 0;

        this.tournamentObj.combat[i].match.win = "";
      }
      for (let i = 0; i < this.tournamentObj.combatArena.length; i++) {
        this.tournamentObj.combatArena[i].lastMatch.no = 1;
        for (let j = 0; j < this.tournamentObj.combatArena[i].referee.length; j++) {
          this.tournamentObj.combatArena[i].referee[j].redScore = 0;
          this.tournamentObj.combatArena[i].referee[j].blueScore = 0;
        }
      }
      for (let i = 0; i < this.tournamentObj.martial.length; i++) {
        for (let j = 0; j < this.tournamentObj.martial[i].team.length; j++) {
          this.tournamentObj.martial[i].team[j].finalScore = 0;
          for (let k = 0; k < this.tournamentObj.martial[i].team[j].refereeMartial.length; k++) {
            this.tournamentObj.martial[i].team[j].refereeMartial[k].score = 0;
          }
        }
      }
      for (let i = 0; i < this.tournamentObj.martialArena.length; i++) {
        this.tournamentObj.martialArena[i].lastMatchMartial.matchMartialNo = 1;
        this.tournamentObj.martialArena[i].lastMatchMartial.teamMartialNo = 1;
      }
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.tournamentObj).then(() => {
        toast.success("Cài đặt trận đấu thành công!");
      })
    })
    console.log("resetSetting End");
  }

  resetSetting = () => {
    console.log("resetSetting Start");
    this.settingObj = JSON.parse(JSON.stringify(this.settingConst));

    update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting'), this.settingObj.setting).then(() => {
      get(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
        this.settingObj = snapshot.val();
        $("input[name=timeRound]").val(this.settingObj.combat.timeRound);
        $("input[name=timeBreak]").val(this.settingObj.combat.timeBreak);
        $("input[name=timeExtra]").val(this.settingObj.combat.timeExtra);
        $("input[name=timeExtraBreak]").val(this.settingObj.combat.timeExtraBreak);
        $("#flexSwitchCountryFlagCombat").prop("checked", this.settingObj.combat.isShowCountryFlag);
        $("#showCautionBoxCombat").prop("checked", this.settingObj.combat.isShowCautionBox);
        $("#quantityRefereeCombat").prop("checked", this.settingObj.combat.isShowFiveReferee);
        $("#flexSwitchCountryFlagMartial").prop("checked", this.settingObj.martial.isShowCountryFlag);
        $("#quantityRefereeMartial").prop("checked", this.settingObj.martial.isShowFiveReferee);
      })

      toast.success("Cài lại thiết đặt thành công!");
    });
    console.log("resetSetting End");
  }

  resetPassword = () => {
    console.log("resetPassword Start");
    this.commonSettingObj = JSON.parse(JSON.stringify(this.commonSettingConst));
    update(ref(this.db, 'commonSetting'), this.commonSettingObj).then(() => {
      get(ref(this.db, 'commonSetting')).then((snapshot) => {
        this.commonSettingObj = snapshot.val();
        $("input[name=passwordSetting]").val(this.commonSettingObj.passwordSetting);
        $("input[name=passwordGiamDinh]").val(this.commonSettingObj.passwordGiamDinh);
        $("input[name=passwordGiamSat]").val(this.commonSettingObj.passwordGiamSat);
      })

      toast.success("Cài lại thiết đặt mật khẩu thành công!");
    });
    console.log("resetPassword End");
  }

  updateSetting = () => {
    console.log("updateSetting Start");
    this.settingObj = {
      "combat/timeRound": parseInt($("input[name=timeRound]").val()),
      "combat/timeBreak": parseInt($("input[name=timeBreak]").val()),
      "combat/timeExtra": parseInt($("input[name=timeExtra]").val()),
      "combat/timeExtraBreak": parseInt($("input[name=timeExtraBreak]").val()),
      "tournamentName": $("input[name=tournamentName]").val(),
      "combat/isShowCountryFlag": $("#flexSwitchCountryFlagCombat").prop("checked"),
      "combat/isShowCautionBox": $("#showCautionBoxCombat").prop("checked"),
      "combat/isShowFiveReferee": $("#quantityRefereeCombat").prop("checked"),
      "martial/isShowCountryFlag": $("#flexSwitchCountryFlagMartial").prop("checked"),
      "martial/isShowFiveReferee": $("#quantityRefereeMartial").prop("checked"),
    }
    update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/setting'), this.settingObj).then(() => {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("updateSetting End");
  }

  updatePassword = () => {
    console.log("updatePassword Start");
    this.commonSettingObj = {
      "passwordSetting": parseInt($("input[name=passwordSetting]").val()),
      "passwordGiamDinh": parseInt($("input[name=passwordGiamDinh]").val()),
      "passwordGiamSat": parseInt($("input[name=passwordGiamSat]").val()),
    }
    update(ref(this.db, 'commonSetting'), this.commonSettingObj).then(() => {
      toast.success("Cập nhập thông tin mật khẩu thành công!");
    });
    console.log("updatePassword End");
  }

  chooseTournament = (tournamentNoIndex) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.main();
  }

  addTournament = () => {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournamentNoIndex = this.tournamentObj.length;
      this.resetSetting();
      this.main();
    })
  }

  deleteTournament = () => {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournamentNoIndex = this.tournamentObj.length - 1;
      if (this.tournamentObj.length > 1) {
        remove(ref(this.db, 'tournament/' + this.tournamentNoIndex)).then(() => {
          this.tournamentNoIndex--;
          this.main();
          toast.success("Xoá giải đấu thành công!");
        })
      } else {
        toast.error("Không thể xoá giải đấu duy nhất!");
      }

    })
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

  render() {
    return (
      <div>
        <div className="body" style={{ height: '100vh' }}>
          <div className="vsc-initialized">
            <div className="container-fluit">
              <header className="blog-header p-3 box-shadow">
                <div className="row flex-nowrap justify-content-between align-items-center">
                  <div className="col-4 pt-1 text-center">
                    <span className="text-pomegrante" id="tournamentName"></span>
                  </div>
                  <div className="col-4 text-center">
                    <h2 className="blog-header-logo text-midnight-blue">
                      <i className="fa-solid fa-gear"></i> Thiết đặt</h2>
                  </div>
                  <div className="col-4 d-flex justify-content-end align-items-center">
                    <span className="text-muted">
                      <img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân" className="img-fluid" style={{ width: '38vh' }} />
                    </span>
                  </div>
                </div>
              </header>

              <div className="container">
                <form className="form-style-7 mb-5 mt-3 setting-form">
                  <div className="form-title">
                    <h2><b>Thiết đặt giải đấu</b></h2>
                  </div>

                  <div className="row">
                    <div className="col mb-3">
                      {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                        <div className="form-check" key={i} onClick={() => this.chooseTournament(i)}>
                          <input className="form-check-input" type="radio" name="tournamentRadio" id={`tournamentRadio-${tournament[0]}`} defaultChecked={i === this.tournamentNoIndex} />
                          <label className="form-check-label" htmlFor={`tournamentRadio-${tournament[0]}`}>
                            {tournament[0]} - {tournament[1]}
                          </label>
                        </div>
                      )) : (
                        <div></div>
                      )}
                      {/* <div className="form-check">
                        <input className="form-check-input" type="radio" name="tournamentRadio10" id="tournamentRadio10"/>
                          <label className="form-check-label" htmlFor="tournamentRadio10">
                          Cóc Vương
                          </label>
                      </div> */}
                    </div>
                  </div>

                  <button className="btn btn-success" style={{ marginRight: '5px' }} type="button" onClick={this.addTournament}><i className="fas fa-plus"></i> Thêm giải đấu</button>
                  <button className="btn btn-danger" style={{ marginRight: '5px' }} type="button" onClick={this.deleteTournament}><i className="fas fa-trash-alt"></i> Xoá giải đấu cuối cùng</button>
                </form>

                <form className="form-style-7 mb-5 mt-3 setting-form">
                  <div className="form-title">
                    <h2><b>Thiết đặt thông tin giải đấu</b></h2>
                  </div>

                  <div className="row">
                    <div className="col">
                      <label>Tên giải đấu</label>
                      <div className="input-group mb-3">
                        <input type="text" className="form-control" placeholder="" name="tournamentName" />
                      </div>
                    </div>
                  </div>

                  <hr className="mt-4 mb-4" />
                  <div className="row mb-4">
                    <label className="fw-bold mb-1">Thiết đặt đối kháng</label>
                    <div className="col">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="flexSwitchCountryFlagCombat" />
                        <label className="form-check-label" htmlFor="flexSwitchCountryFlagCombat">Hiển thị cờ quốc gia</label>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="showCautionBoxCombat" />
                        <label className="form-check-label" htmlFor="showCautionBoxCombat">Hiển thị bảng nhắc nhở</label>
                      </div>
                    </div>
                    <div className="col">

                    </div>
                    <div className="col">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="quantityRefereeCombat" />
                        <label className="form-check-label" htmlFor="quantityRefereeCombat">Hiển thị 5 giám định</label>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col">
                      <label>Thời gian hiệp đấu</label>
                      <div className="input-group mb-3">
                        <input type="number" className="form-control" placeholder="" name="timeRound" />
                        <span className="input-group-text">giây</span>
                      </div>
                      <label>Thời gian nghỉ giữa hiệp</label>
                      <div className="input-group mb-3">
                        <input type="number" className="form-control" placeholder="" name="timeBreak" />
                        <span className="input-group-text">giây</span>
                      </div>
                    </div>
                    <div className="col">
                      <label>Thời gian nghỉ giữa hiệp hiệp phụ</label>
                      <div className="input-group mb-3">
                        <input type="number" className="form-control" placeholder="" name="timeExtraBreak" />
                        <span className="input-group-text">giây</span>
                      </div>
                      <label>Thời gian hiệp phụ</label>
                      <div className="input-group mb-3">
                        <input type="number" className="form-control" placeholder="" name="timeExtra" />
                        <span className="input-group-text">giây</span>
                      </div>
                    </div>

                  </div>

                  <hr className="mt-4 mb-4" />
                  <div className="row mb-4">
                    <label className="fw-bold mb-1">Thiết đặt thi quyền</label>
                    <div className="col">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="flexSwitchCountryFlagMartial" />
                        <label className="form-check-label" htmlFor="flexSwitchCountryFlagMartial">Hiển thị cờ quốc gia</label>
                      </div>
                    </div>
                    <div className="col">

                    </div>
                    <div className="col">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="quantityRefereeMartial" />
                        <label className="form-check-label" htmlFor="quantityRefereeMartial">Hiển thị 5 giám định</label>
                      </div>
                    </div>
                  </div>

                  <button type="button" className="btn btn-danger" style={{ marginRight: '5px' }} onClick={this.resetTournament}><i className="fa-solid fa-arrows-rotate"></i> Cài lại trận đấu </button>
                  <button type="button" className="btn btn-warning" style={{ marginRight: '5px' }} onClick={this.resetSetting}><i className="fa-solid fa-rotate-left"></i> Cài lại thiết đặt </button>
                  <button type="button" className="btn btn-success" style={{ marginRight: '5px' }} onClick={this.updateSetting}><i className="fa-solid fa-floppy-disk"></i> Cập nhập</button>
                </form>

                <form className="form-style-7 mb-5 mt-3 setting-form">
                  <div className="form-title">
                    <h2><b>Thiết đặt thông tin mật khẩu</b></h2>
                  </div>

                  <div className="row">
                    <div className="row">
                      <div className="col">
                        <label>Đặt mật khẩu THIẾT ĐẶT</label>
                        <div className="input-group mb-3">
                          <input type="number" className="form-control" placeholder="" name="passwordSetting" />
                        </div>
                      </div>
                      <div className="col">
                        <label>Đặt mật khẩu GIÁM SÁT</label>
                        <div className="input-group mb-3">
                          <input type="number" className="form-control" placeholder="" name="passwordGiamSat" />
                        </div>
                      </div>
                      <div className="col">
                        <label>Đặt mật khẩu GIÁM ĐỊNH</label>
                        <div className="input-group mb-3">
                          <input type="number" className="form-control" placeholder="" name="passwordGiamDinh" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn btn-warning" style={{ marginRight: '5px' }} onClick={this.resetPassword}><i className="fa-solid fa-rotate-left"></i> Cài lại mật khẩu </button>
                  <button type="button" className="btn btn-success" style={{ marginRight: '5px' }} onClick={this.updatePassword}><i className="fa-solid fa-floppy-disk"></i> Cập nhập mật khẩu</button>
                </form>

                <div className="container">
                  <footer className="py-3 my-4">
                    <ul className="nav justify-content-center border-bottom pb-3 mb-3">
                      <li className="nav-item"><NavLink className="nav-link px-2 text-muted" to="/">Home</NavLink></li>
                      <li className="nav-item"><NavLink className="nav-link px-2 text-muted" to="giam-sat-doi-khang">Giám sát đối kháng</NavLink></li>
                      <li className="nav-item"><NavLink className="nav-link px-2 text-muted" to="giam-dinh-doi-khang">Giám định đối kháng</NavLink></li>
                      <li className="nav-item"><NavLink className="nav-link px-2 text-muted" to="giam-sat-thi-quyen">Giám sát thi quyền</NavLink></li>
                      <li className="nav-item"><NavLink className="nav-link px-2 text-muted" to="giam-dinh-thi-quyen">Giám định thi quyền</NavLink></li>
                      <li className="nav-item"><NavLink className="nav-link px-2 text-muted" to="thong-tin-doi-khang">Thông tin đối kháng</NavLink></li>
                    </ul>
                    <p className="text-center text-muted">©Tuân 2022</p>
                  </footer>
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

        </div>
        <ToastContainer />


      </div>
    );
  }
}

export default SettingContainer;
