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
    super(props);
    const me = this;
    this.state = {
      data: [],
    };

    this.db = Firebase();
    this.settingObj;

    this.settingConst = { "setting": { "timeRound": 90, "timeBreak": 30, "timeExtra": 60, "timeExtraBreak": 15, "tournamentName": "Cóc Vương", "isShowCountryFlag": false, "isShowFiveReferee": false, "isShowCautionBox": false, "isShowArenaB": false, "passwordSetting": 1, "passwordGiamSat": 1, "passwordGiamDinh": 1 } };
  }

  componentDidMount() {
    this.showPasswordModal();
    // this.main();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'setting/passwordSetting'), (snapshot) => {
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
    get(ref(this.db, 'setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $("input[name=timeRound]").val(this.settingObj.timeRound);
      $("input[name=timeBreak]").val(this.settingObj.timeBreak);
      $("input[name=timeExtra]").val(this.settingObj.timeExtra);
      $("input[name=timeExtraBreak]").val(this.settingObj.timeExtraBreak);
      $("input[name=tournamentName]").val(this.settingObj.tournamentName);
      $("input[name=passwordSetting]").val(this.settingObj.passwordSetting);
      $("input[name=passwordGiamDinh]").val(this.settingObj.passwordGiamDinh);
      $("input[name=passwordGiamSat]").val(this.settingObj.passwordGiamSat);
      $("#flexSwitchCountryFlag").prop("checked", this.settingObj.isShowCountryFlag);
      $("#showCautionBox").prop("checked", this.settingObj.isShowCautionBox);
      $("#showArenaB").prop("checked", this.settingObj.isShowArenaB);
      $("#quantityReferee").prop("checked", this.settingObj.isShowFiveReferee);
    })

    get(child(ref(this.db), 'setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
    })
  }

  resetTournament = () => {
    console.log("resetSetting Start");
    toast.success("Cài đặt lại trận đấu thành công - Ảo");
    console.log("resetSetting End");
  }

  resetSetting = () => {
    console.log("resetSetting Start");
    this.settingObj = JSON.parse(JSON.stringify(this.settingConst));

    update(ref(this.db, 'setting'), this.settingObj.setting).then(() => {
      get(ref(this.db, 'setting')).then((snapshot) => {
        this.settingObj = snapshot.val();
        $("input[name=timeRound]").val(this.settingObj.timeRound);
        $("input[name=timeBreak]").val(this.settingObj.timeBreak);
        $("input[name=timeExtra]").val(this.settingObj.timeExtra);
        $("input[name=timeExtraBreak]").val(this.settingObj.timeExtraBreak);
        $("input[name=tournamentName]").val(this.settingObj.tournamentName);
        $("input[name=passwordSetting]").val(this.settingObj.passwordSetting);
        $("input[name=passwordGiamDinh]").val(this.settingObj.passwordGiamDinh);
        $("input[name=passwordGiamSat]").val(this.settingObj.passwordGiamSat);
        $("#flexSwitchCountryFlag").prop("checked", this.settingObj.isShowCountryFlag);
        $("#showCautionBox").prop("checked", this.settingObj.isShowCautionBox);
        $("#showArenaB").prop("checked", this.settingObj.isShowArenaB);
        $("#quantityReferee").prop("checked", this.settingObj.isShowFiveReferee);
      })

      toast.success("Cài lại thiết đặt thành công!");
    });
    console.log("resetSetting End");
  }

  updateSetting = () => {
    console.log("updateSetting Start");
    this.settingObj = {
      "timeRound": parseInt($("input[name=timeRound]").val()),
      "timeBreak": parseInt($("input[name=timeBreak]").val()),
      "timeExtra": parseInt($("input[name=timeExtra]").val()),
      "timeExtraBreak": parseInt($("input[name=timeExtraBreak]").val()),
      "tournamentName": $("input[name=tournamentName]").val(),
      "isShowCountryFlag": $("#flexSwitchCountryFlag").prop("checked"),
      "isShowCautionBox": $("#showCautionBox").prop("checked"),
      "isShowArenaB": $("#showArenaB").prop("checked"),
      "isShowFiveReferee": $("#quantityReferee").prop("checked"),
      "passwordSetting": parseInt($("input[name=passwordSetting]").val()),
      "passwordGiamDinh": parseInt($("input[name=passwordGiamDinh]").val()),
      "passwordGiamSat": parseInt($("input[name=passwordGiamSat]").val()),
    }
    update(ref(this.db, 'setting'), this.settingObj).then(() => {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("updateSetting End");
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

                  <div className="row">
                    <div className="col">
                      <label>Đặt mật khẩu THIẾT ĐẶT</label>
                      <div className="input-group mb-3">
                        <input type="number" className="form-control" placeholder="" name="passwordSetting" />
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="flexSwitchCountryFlag" />
                        <label className="form-check-label" htmlFor="flexSwitchCountryFlag">Hiển thị cờ quốc gia</label>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="showCautionBox" />
                        <label className="form-check-label" htmlFor="showCautionBox">Hiển thị bảng nhắc nhở</label>
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
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="quantityReferee" />
                        <label className="form-check-label" htmlFor="quantityReferee">Hiển thị 5 giám định</label>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="showArenaB" />
                        <label className="form-check-label" htmlFor="showArenaB">Hiển thị thêm Sân B</label>
                      </div>
                    </div>
                  </div>

                  <hr className="mt-4 mb-4" />
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
                    {/* <hr className="mt-4 mb-4" /> */}
                  </div>
                  <button type="button" className="btn btn-danger" style={{ marginRight: '5px' }} onClick={this.resetTournament}><i className="fa-solid fa-arrows-rotate"></i> Cài lại trận đấu </button>
                  <button type="button" className="btn btn-warning" style={{ marginRight: '5px' }} onClick={this.resetSetting}><i className="fa-solid fa-rotate-left"></i> Cài lại thiết đặt </button>
                  <button type="button" className="btn btn-success" style={{ marginRight: '5px' }} onClick={this.updateSetting}><i className="fa-solid fa-floppy-disk"></i> Cập nhập</button>
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
