import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class SettingContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();

    this.settingObj;
    this.tournamentMartialObj;

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

    this.ref.child('setting').once('value', (snapshot) => {
      me.settingObj = snapshot.val();
      $("input[name=timeRound]").val(me.settingObj.timeRound);
      $("input[name=timeBreak]").val(me.settingObj.timeBreak);
      $("input[name=timeExtra]").val(me.settingObj.timeExtra);
      $("input[name=timeExtraBreak]").val(me.settingObj.timeExtraBreak);
      $("input[name=tournamentName]").val(me.settingObj.tournamentName);
    })

    this.ref.child('setting').on('value', (snapshot) => {
      me.settingObj = snapshot.val();
      $('#tournamentName').html(me.settingObj.tournamentName);
    })
  }

  resetSetting = () => {
    this.settingObj = JSON.parse(JSON.stringify(this.settingConst));

    this.ref.child('setting').update(this.settingObj.setting, function () {
      this.ref.child('setting').once('value', (snapshot) => {
        this.settingObj = snapshot.val();
        $("input[name=timeRound]").val(this.settingObj.timeRound);
        $("input[name=timeBreak]").val(this.settingObj.timeBreak);
        $("input[name=timeExtra]").val(this.settingObj.timeExtra);
        $("input[name=timeExtraBreak]").val(this.settingObj.timeExtraBreak);
        $("input[name=tournamentName]").val(this.settingObj.tournamentName);
      })

      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
  }

  updateSetting = () => {
    this.settingObj = {
      "timeRound": parseInt($("input[name=timeRound]").val()),
      "timeBreak": parseInt($("input[name=timeBreak]").val()),
      "timeExtra": parseInt($("input[name=timeExtra]").val()),
      "timeExtraBreak": parseInt($("input[name=timeExtraBreak]").val()),
      "tournamentName": $("input[name=tournamentName]").val(),
    }
    this.ref.child('setting').update(this.settingObj, function () {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });

  }

  importTournament = () => {
    this.tournamentObj = JSON.parse(JSON.stringify(this.tournamentConst));
    this.convertTournamnet($("textarea[name=tournamentText]").val());
    this.ref.update(this.tournamentObj, function () {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
  }

  convertTournamnet(tournamentText) {
    let lines = tournamentText.match(/[^\r\n]+/g);
    for (let i = 0; i < lines.length; i++) {
      let values = lines[i].split("\t");
      if (values != null && values[0].trim() != "" && $.isNumeric(values[0].trim())) {
        let matchObjTemp = JSON.parse(JSON.stringify(this.matchObj));
        matchObjTemp.match.no = +values[0].trim();
        matchObjTemp.match.category = values[1].trim();
        matchObjTemp.match.type = values[2].trim();
        matchObjTemp.fighters.redFighter.name = values[3].trim();
        matchObjTemp.fighters.redFighter.code = values[4].trim();
        matchObjTemp.fighters.blueFighter.name = values[5].trim();
        matchObjTemp.fighters.blueFighter.code = values[6].trim();

        this.tournamentObj.tournament.push(matchObjTemp);
      }
    }
  }

  importTournamentMartial = () => {
    this.tournamentMartialObj = JSON.parse(JSON.stringify(this.tournamentMartialConst));
    this.convertTournamnetMartial($("textarea[name=tournamentMartialText]").val());
    this.ref.update(this.tournamentMartialObj, function () {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
  }

  convertTournamnetMartial(tournamentMartialText) {
    let lines = tournamentMartialText.match(/[^\r\n]+/g);

    let matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
    let fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
    let fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));

    for (let i = 0; i < lines.length; i++) {
      let values = lines[i].split("\t");
      if (values != null) {
        if (values[0] != "" && values[1] == "") {
          matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
          this.tournamentMartialObj.tournamentMartial.push(matchMartialObjTemp);
          matchMartialObjTemp.match.name = values[0].trim();
        } else {
          if ($.isNumeric(values[0].trim())) {
            fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
            fighterMartialObjTemp.fighter.code = values[1].trim();
            fighterMartialObjTemp.fighter.name = values[2].trim();

            fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
            fightersMartialObjTemp.no = values[0].trim();
            fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
            matchMartialObjTemp.team.push(fightersMartialObjTemp);
          } else if (values[0].trim().length > 3 && values[1].trim().length > 4) {
            fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
            fighterMartialObjTemp.fighter.code = values[0].trim();
            fighterMartialObjTemp.fighter.name = values[1].trim();

            fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
          }
        }
      }
    }
    console.log(this.tournamentMartialObj);
  }

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
                <form className="form-style-7 mb-5 mt-3">
                  <div className="form-title">
                    <h2>Thiết đặt thông tin giải đấu</h2>
                  </div>
                  <label for="basic-url">Tên giải đấu</label>
                  <div className="input-group mb-3">
                    <input type="text" className="form-control" placeholder="" name="tournamentName" />
                  </div>
                  <label for="basic-url">Thời gian hiệp đấu</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeRound" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <label for="basic-url">Thời gian nghỉ giữa hiệp</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeBreak" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <label for="basic-url">Thời gian nghỉ giữa hiệp hiệp phụ</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeExtraBreak" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <label for="basic-url">Thời gian hiệp phụ</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeExtra" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginRight: '5px' }} onClick={this.resetSetting}><i className="fa-solid fa-rotate-left"></i> Reset</button>
                  <button type="button" className="btn btn-primary" style={{ marginRight: '5px' }} onClick={this.updateSetting}><i className="fa-solid fa-pen"></i> Cập nhập</button>
                </form>

                <div className="tournament-text">
                  <div className="form-title">
                    <h2>Danh sách đối kháng</h2>
                  </div>
                  <textarea name="tournamentText">

                  </textarea>
                  <div className="function-button">
                    <button type="button" className="btn btn-primary" onClick={this.importTournament}><i className="fa-solid fa-file-import"></i> Import Đối Kháng</button>
                  </div>
                </div>



                <div className="tournament-text">
                  <div className="form-title">
                    <h2>Danh sách thi quyền</h2>
                  </div>
                  <textarea name="tournamentMartialText">


                  </textarea>
                  <div className="function-button">
                    <button type="button" className="btn btn-primary" onClick={this.importTournamentMartial}><i className="fa-solid fa-file-import"></i> Import Thi
                      Quyền</button>
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

export default SettingContainer;
