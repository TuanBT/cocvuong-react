import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { read, utils } from 'xlsx';
import MauDoiKhang from '../assets/template/1-Mau-Doi-Khang.xlsx';
import MauQuyen from '../assets/template/2-Mau-Quyen.xlsx';

class SettingContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.state = {
      data: [],
    };

    this.ref = database.ref();
    this.settingObj;
    this.tournamentObj;
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
    };
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
    };
    this.matchMartialObj = {
      "match": {
        "name": ""
      },
      "team": []
    };
    this.tournamentMartialConst = {
      "lastMatchMartial": {
        "matchMartialNo": 1,
        "teamMartialNo": 1
      },
      "tournamentMartial": [
      ]
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
    };
    this.fighterMartialObj = {
      "fighter":
      {
        "code": "",
        "name": "",
      }
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

  handleimportTournamentFile = (event) => {
    this.tournamentObj = JSON.parse(JSON.stringify(this.tournamentConst));

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets['DATA'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 });
      this.tournamentArray = [];

      for (let i = 1; i < excelData.length; i++) {
        let values = excelData[i];
        if (values.length >= 2) { //Dòng có nội dung
          let matchObjTemp = JSON.parse(JSON.stringify(this.matchObj));
          matchObjTemp.match.no = values[0] !== undefined ? values[0] : '';
          matchObjTemp.match.category = values[1] !== undefined ? values[1].trim() : '';
          matchObjTemp.match.type = values[2] !== undefined ? values[2].trim() : '';
          matchObjTemp.fighters.redFighter.name = values[3] !== undefined ? values[3].trim() : '';
          matchObjTemp.fighters.redFighter.code = values[4] !== undefined ? values[4].trim() : '';
          matchObjTemp.fighters.blueFighter.name = values[5] !== undefined ? values[5].trim() : '';
          matchObjTemp.fighters.blueFighter.code = values[6] !== undefined ? values[6].trim() : '';
          this.tournamentObj.tournament.push(matchObjTemp);
          this.tournamentArray.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? values[1].trim() : '',
            values[2] !== undefined ? values[2].trim() : '',
            values[3] !== undefined ? values[3].trim() : '',
            values[4] !== undefined ? values[4].trim() : '',
            values[5] !== undefined ? values[5].trim() : '',
            values[6] !== undefined ? values[6].trim() : '',
          ]);
        }
      }

      this.tournamentArrayHeader = [excelData[0][0], excelData[0][1], excelData[0][2], excelData[0][3], excelData[0][4], excelData[0][5], excelData[0][6]];

      this.setState({ data: this.tournamentArray });

    };
    reader.readAsArrayBuffer(file);
  };

  importTournament = () => {
    console.log("importTournament Start");
    this.ref.update(this.tournamentObj, function () {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("importTournament End");
  }



  handleimportTournamentMartialFile = (event) => {
    this.tournamentMartialObj = JSON.parse(JSON.stringify(this.tournamentMartialConst));
    let matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
    let fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
    let fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets['DATA'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 });
      this.tournamentMartialArray = [];

      for (let i = 0; i < excelData.length; i++) {
        let values = excelData[i];

        if (values.length !== 0) { //Dòng có nội dung
          if (values.length === 1 && values[0] !== " ") { //Dòng chứa tên nội dung
            matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
            this.tournamentMartialObj.tournamentMartial.push(matchMartialObjTemp);
            matchMartialObjTemp.match.name = values[0].trim();
            this.tournamentMartialArray.push([values[0].trim(), '', '']);
          } else { //Dòng chứa Title hoặc thông tin VDV
            if (!isNaN(parseFloat(values[0]))) { //Dòng chứa nội dung VDV
              fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
              fighterMartialObjTemp.fighter.name = values[1].trim();
              fighterMartialObjTemp.fighter.code = values[2].trim();
              fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
              fightersMartialObjTemp.no = values[0];
              fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
              this.tournamentMartialObj.tournamentMartial.slice(-1)[0].team.push(fightersMartialObjTemp);
              this.tournamentMartialArray.push([values[0], values[1].trim(), values[2].trim()]);
            } else { //Dòng chứa nội dung VDV Đồng đội hoặc Title
              if (values[0] === undefined) { //Dòng VDV đồng đội thứ 2 trở đi
                fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
                fighterMartialObjTemp.fighter.name = values[1].trim();
                fighterMartialObjTemp.fighter.code = values[2].trim();
                this.tournamentMartialObj.tournamentMartial.slice(-1)[0].team.slice(-1)[0].fighters.push(fighterMartialObjTemp);
                this.tournamentMartialArray.push(['', values[1].trim(), values[2].trim()]);
              }
            }
          }
        }
      }

      this.tournamentMartialArrayHeader = ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ'];
      this.setState({ data: this.tournamentMartialArray });

    };
    reader.readAsArrayBuffer(file);
  }

  importTournamentMartial = () => {
    console.log("importTournamentMartial Start");
    this.ref.update(this.tournamentMartialObj, function () {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("importTournamentMartial End");
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
                  <label htmlFor="basic-url">Tên giải đấu</label>
                  <div className="input-group mb-3">
                    <input type="text" className="form-control" placeholder="" name="tournamentName" />
                  </div>
                  <label htmlFor="basic-url">Thời gian hiệp đấu</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeRound" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <label htmlFor="basic-url">Thời gian nghỉ giữa hiệp</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeBreak" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <label htmlFor="basic-url">Thời gian nghỉ giữa hiệp hiệp phụ</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeExtraBreak" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <label htmlFor="basic-url">Thời gian hiệp phụ</label>
                  <div className="input-group mb-3">
                    <input type="number" className="form-control" placeholder="" name="timeExtra" />
                    <div className="input-group-append">
                      <span className="input-group-text">giây</span>
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginRight: '5px' }} onClick={this.resetSetting}><i className="fa-solid fa-rotate-left"></i> Reset</button>
                  <button type="button" className="btn btn-primary" style={{ marginRight: '5px' }} onClick={this.updateSetting}><i className="fa-solid fa-pen"></i> Cập nhập</button>
                </form>

                <div className="tournament-text mb-5 mt-3">
                  <div className="form-title">
                    <h2>Nhập thông tin thi đấu Đối Kháng <a href={MauDoiKhang} download="1-Mau-Doi-Khang.xlsx" target="_blank" rel="noreferrer" >
                      1-Mau-Doi-Khang.xlsx
                    </a></h2>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <div className="custom-file">
                        <input type="file" className="custom-file-input" onChange={this.handleimportTournamentFile} />
                        <label className="custom-file-label" htmlFor="inputGroupFile04">Chọn file: 1-Mau-Doi-Khang.xlsx</label>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-primary" type="button" onClick={this.importTournament}><i className="fa-solid fa-file-import"></i> Import Đối Kháng</button>
                      </div>
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        {this.tournamentArrayHeader &&
                          this.tournamentArrayHeader.map((header) => <th key={header}>{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {this.tournamentArray ? this.tournamentArray.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      )) :
                        <tr><td colSpan="2">Không có dữ liệu hiển thị</td></tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div className="tournament-text mb-5 mt-3">
                  <div className="form-title">
                    <h2>Nhập thông tin thi quyền <a href={MauQuyen} download="2-Mau-Quyen.xlsx" target="_blank" rel="noreferrer" >
                    2-Mau-Quyen.xlsx
                    </a></h2>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <div className="custom-file">
                        <input type="file" className="custom-file-input" onChange={this.handleimportTournamentMartialFile} />
                        <label className="custom-file-label" htmlFor="inputGroupFile04">Chọn file: 2-Mau-Quyen.xlsx</label>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-primary" type="button" onClick={this.importTournamentMartial}><i className="fa-solid fa-file-import"></i> Import Thi
                          Quyền</button>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            {this.tournamentMartialArrayHeader &&
                              this.tournamentMartialArrayHeader.map((header) => <th key={header}>{header}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {this.tournamentMartialArray ? this.tournamentMartialArray.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, i) => (
                                <td key={i}>{cell}</td>
                              ))}
                            </tr>
                          )) :
                            <tr><td colSpan="2">Không có dữ liệu hiển thị</td></tr>
                          }
                        </tbody>
                      </table>
                    </div>
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
