import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { read, utils } from 'xlsx';
import MauDuLieuChuan from '../assets/template/1-Mau-Du-Lieu-Chuan.xlsx';
import MauDuLieuTho from '../assets/template/2-Mau-Du-Lieu-Tho.xlsx';

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
    this.tournamentStandardArray = [];

    this.matchObj = { "match": { "no": 1, "type": "", "category": "", "win": "" }, "fighters": { "redFighter": { "name": "Đỏ", "code": "", "score": 0 }, "blueFighter": { "name": "Xanh", "code": "", "score": 0 } } };
    this.fightersMartialObj = { "fighters": [], "no": 0, "score": 0, "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }], };
    this.tournamentConst = { "lastMatch": { "no": 1 }, "referee": [{ "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }, { "redScore": 0, "blueScore": 0 }], "tournament": [] };
    this.matchMartialObj = { "match": { "name": "" }, "team": [] };
    this.tournamentMartialConst = { "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 }, "tournamentMartial": [] };
    this.fightersMartialObj = { "fighters": [], "no": 0, "score": 0, "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }], };
    this.fighterMartialObj = { "fighter": { "code": "", "name": "", } }

    this.schemaFighters = [];
    this.schemaFighters.push('[]');//0
    this.schemaFighters.push('[]');//1
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Chung Kết","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}}]'); //2
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":2,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.1","code":""},"blueFighter":{"name":3,"code":3}}]');//3
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":3,"code":3},"blueFighter":{"name":4,"code":4}},{"match":3,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.1","code":""},"blueFighter":{"name":"W.2","code":""}}]');//4
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3},"blueFighter":{"name":4,"code":4}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":""},"blueFighter":{"name":5,"code":5}},{"match":4,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":"W.3","code":""}}]'); //5
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2},"blueFighter":{"name":3,"code":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4},"blueFighter":{"name":5,"code":5}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1},"blueFighter":{"name":"W.1","code":""}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":6,"code":6}},{"match":5,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.3","code":""},"blueFighter":{"name":"W.4","code":""}}]');//6
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2},"blueFighter":{"name":3,"code":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4},"blueFighter":{"name":5,"code":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6},"blueFighter":{"name":7,"code":7}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1},"blueFighter":{"name":"W.1","code":""}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":"W.3","code":""}},{"match":6,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.4","code":""},"blueFighter":{"name":"W.5","code":""}}]');//7
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3},"blueFighter":{"name":4,"code":4}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5},"blueFighter":{"name":6,"code":6}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7},"blueFighter":{"name":8,"code":8}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":""},"blueFighter":{"name":"W.2","code":""}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":""},"blueFighter":{"name":"W.4","code":""}},{"match":7,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.5","code":""},"blueFighter":{"name":"W.6","code":""}}]');//8
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6},"blueFighter":{"name":7,"code":7}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3},"blueFighter":{"name":4,"code":4}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5},"blueFighter":{"name":"W.1","code":""}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8},"blueFighter":{"name":9,"code":9}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":"W.3","code":""}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":""},"blueFighter":{"name":"W.5","code":""}},{"match":8,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.6","code":""},"blueFighter":{"name":"W.7","code":""}}]');//9
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3},"blueFighter":{"name":4,"code":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7},"blueFighter":{"name":8,"code":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":""},"blueFighter":{"name":5,"code":5}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6},"blueFighter":{"name":"W.2","code":""}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9},"blueFighter":{"name":10,"code":10}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":""},"blueFighter":{"name":"W.4","code":""}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":""},"blueFighter":{"name":"W.6","code":""}},{"match":9,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.7","code":""},"blueFighter":{"name":"W.8","code":""}}]');//10
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3},"blueFighter":{"name":4,"code":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7},"blueFighter":{"name":8,"code":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9},"blueFighter":{"name":10,"code":10}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":2,"code":2}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":""},"blueFighter":{"name":5,"code":5}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6},"blueFighter":{"name":"W.2","code":""}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":""},"blueFighter":{"name":11,"code":11}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":""},"blueFighter":{"name":"W.5","code":""}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":""},"blueFighter":{"name":"W.7","code":""}},{"match":10,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.8","code":""},"blueFighter":{"name":"W.9","code":""}}]');//11
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2},"blueFighter":{"name":3,"code":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4},"blueFighter":{"name":5,"code":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8},"blueFighter":{"name":9,"code":9}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10},"blueFighter":{"name":11,"code":11}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":"W.1","code":""}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":6,"code":6}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7},"blueFighter":{"name":"W.3","code":""}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":""},"blueFighter":{"name":12,"code":12}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":""},"blueFighter":{"name":"W.6","code":""}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":""},"blueFighter":{"name":"W.7","code":""}},{"match":11,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.9","code":""},"blueFighter":{"name":"W.10","code":""}}]');//12
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2},"blueFighter":{"name":3,"code":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4},"blueFighter":{"name":5,"code":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7},"blueFighter":{"name":8,"code":8}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9},"blueFighter":{"name":10,"code":10}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":11,"code":11},"blueFighter":{"name":12,"code":12}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":"W.1","code":""}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":6,"code":6}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":""},"blueFighter":{"name":"W.4","code":""}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":""},"blueFighter":{"name":13,"code":13}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":""},"blueFighter":{"name":"W.7","code":""}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":""},"blueFighter":{"name":"W.9","code":""}},{"match":12,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.10","code":""},"blueFighter":{"name":"W.11","code":""}}]');//13
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2},"blueFighter":{"name":3,"code":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4},"blueFighter":{"name":5,"code":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6},"blueFighter":{"name":7,"code":7}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8},"blueFighter":{"name":9,"code":9}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10},"blueFighter":{"name":11,"code":11}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12},"blueFighter":{"name":13,"code":13}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1},"blueFighter":{"name":"W.1","code":""}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":""},"blueFighter":{"name":"W.3","code":""}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":""},"blueFighter":{"name":"W.5","code":""}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":""},"blueFighter":{"name":14,"code":14}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":""},"blueFighter":{"name":"W.8","code":""}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":""},"blueFighter":{"name":"W.10","code":""}},{"match":13,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.11","code":""},"blueFighter":{"name":"W.12","code":""}}]');//14


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
      const worksheet = workbook.Sheets['DOI KHANG'];
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

      this.tournamentImportHeader = [excelData[0][0], excelData[0][1], excelData[0][2], excelData[0][3], excelData[0][4], excelData[0][5], excelData[0][6]];
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
      const worksheet = workbook.Sheets['QUYEN'];
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

      this.tournamentMartialImportHeader = ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ'];
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

  handleimportTournamentRawFile = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets['DOI KHANG THO'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 });
      this.tournamentArrayRaw = [];

      for (let i = 1; i < excelData.length; i++) {
        let values = excelData[i];

        if (values.length !== 0) { //Dòng có nội dung
          this.tournamentArrayRaw.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? values[1].trim() : '',
            values[2] !== undefined ? values[2].trim() : '',
            values[3] !== undefined ? values[3].trim() : '',
          ]);
        }
      }

      this.tournamentArrangeHeader = ['STT', 'HẠNG CÂN', 'TÊN VDV', 'MSSV/ĐƠN VỊ'];
      this.setState({ data: this.tournamentArrayRaw });

    };
    reader.readAsArrayBuffer(file);
  }

  shuffle = () => {
    console.log("shuffle Start");
    let currentIndex = this.tournamentArrayRaw.length;
    let temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = this.tournamentArrayRaw[currentIndex];
      this.tournamentArrayRaw[currentIndex] = this.tournamentArrayRaw[randomIndex];
      this.tournamentArrayRaw[randomIndex] = temporaryValue;
    }

    this.tournamentArrayRaw.sort((a, b) => {
      const weightA = a[1];
      const weightB = b[1];
    
      if (weightA < weightB) {
        return -1;
      } else if (weightA > weightB) {
        return 1;
      } else {
        return 0;
      }
    });

    this.setState({ data: this.tournamentArrayRaw });
    console.log("shuffle End");
  }

  arrangeTournament = () => {
    console.log("arrangeTournament Start");

    // Tạo đối tượng Map để gom nhóm các võ sĩ theo hạng cân
    let groupedData = new Map();
    this.tournamentArrayRaw.forEach(item => {
      let weight = item[1].trim();
      if (groupedData.has(weight)) {
        groupedData.get(weight).push(item);
      } else {
        groupedData.set(weight, [item]);
      }
    });

    // Gộp các nhóm vào mảng chung đã điền nội dung
    this.matchs = [];
    let matchCount = 1;
    this.groupMatch = [];
    for (const [key, value] of groupedData.entries()) {
      this.groupMatch = this.getschedule(value);
      this.changeMatchNumber(this.groupMatch, matchCount);

      this.groupMatch.forEach(match => {
        this.matchs.push(match);
      })
      matchCount += this.groupMatch.length;
    }

    let tournamentStandard = this.matchs.slice();

    // Sắp xếp mảng theo thứ tự "Vòng loại", "Bán kết", "Chung kết"
    this.matchs.sort((a, b) => {
      const typeOrder = { 'Vòng loại': 0, 'Bán Kết': 1, 'Chung Kết': 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    // Tiến hành sắp xếp lại các trận đấu theo đúng thứ tự bằng cách đổi chỗ
    for (let i = 0; i < this.matchs.length; i++) {
      if (this.matchs[i].match !== tournamentStandard[i].match) {
        this.swapRowsName(tournamentStandard, tournamentStandard[i].match, this.matchs[i].match)
      }
    }

    //Add to array to show in table
    tournamentStandard.forEach(value => {
      this.tournamentStandardArray.push([
        value.match, value.weight, value.type, value.redFighter.name, value.redFighter.code, value.blueFighter.name, value.blueFighter.code
      ]);
    })

    this.tournamentArrayRaw = [];
    this.tournamentArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH"];
    this.setState({ data: this.tournamentStandardArray });

    console.log("arrangeTournament End");
  }

  getschedule(fighters) {
    const schemaFighter = JSON.parse(this.schemaFighters[fighters.length]);
    let matchs = [];
    for (let i = 0; i < schemaFighter.length; i++) {
      let match = schemaFighter[i];
      if (!isNaN(parseFloat(match.weight))) {
        match.weight = fighters[match.weight - 1][1];
      }
      if (!isNaN(parseFloat(match.redFighter.name))) {
        match.redFighter.name = fighters[match.redFighter.name - 1][2];
        match.redFighter.code = fighters[match.redFighter.code - 1][3];
      }
      if (!isNaN(parseFloat(match.blueFighter.name))) {
        match.blueFighter.name = fighters[match.blueFighter.name - 1][2];
        match.blueFighter.code = fighters[match.blueFighter.code - 1][3];
      }
      matchs.push(match);
    }

    return matchs;
  }

  changeMatchNumber(groupMatch, newMatchNumber) {
    const variance = newMatchNumber - groupMatch[0].match;
    groupMatch.forEach(match => {
      match.match += variance;
      if (match.redFighter.name.includes('W.')) {
        let number = parseFloat(match.redFighter.name.split('.')[1]);
        if (newMatchNumber > number) {
          match.redFighter.name = 'W.' + (number + variance);
        }
      }
      if (match.blueFighter.name.includes('W.')) {
        let number = parseFloat(match.blueFighter.name.split('.')[1]);
        if (newMatchNumber > number) {
          match.blueFighter.name = 'W.' + (number + variance);
        }
      }
    })
    return groupMatch;
  }

  swapRowsName(arr, match1, match2) {
    // Tìm vị trí của 2 row cần đổi chỗ trong mảng
    let index1 = arr.findIndex((el) => el.match === match1);
    let index2 = arr.findIndex((el) => el.match === match2);

    // Nếu không tìm thấy row tương ứng thì trả về mảng ban đầu
    if (index1 === -1 || index2 === -1) {
      return arr;
    }

    //Đổi match
    let matchTemp = arr[index1].match;
    arr[index1].match = arr[index2].match;
    arr[index2].match = matchTemp;

    //Đổi row
    let temp = arr[index1];
    arr[index1] = arr[index2];
    arr[index2] = temp;

    // //Đổi W. tương ứng
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].redFighter.name === "W." + match1) {
        arr[i].redFighter.name = "W." + match2;
      }
      if (arr[i].blueFighter.name === "W." + match1) {
        arr[i].blueFighter.name = "W." + match2;
      }
      if (arr[i].redFighter.name === "W." + match2) {
        arr[i].redFighter.name = "W." + match1;
      }
      if (arr[i].blueFighter.name === "W." + match2) {
        arr[i].blueFighter.name = "W." + match1;
      }
    }

    return arr;
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
                    <h2>Nhập thông tin thi đấu Đối Kháng CHUẨN</h2>
                    <a href={MauDuLieuChuan} download="1-Mau-Du-Lieu-Chuan.xlsx" target="_blank" rel="noreferrer" >
                      <span>Download Mau-Du-Lieu-Chuan.xlsx</span>
                    </a>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <div className="custom-file">
                        <input type="file" className="custom-file-input" onChange={this.handleimportTournamentFile} />
                        <label className="custom-file-label" htmlFor="inputGroupFile04">Chọn file</label>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-primary" type="button" onClick={this.importTournament}><i className="fa-solid fa-file-upload"></i> Import Đối Kháng</button>
                      </div>
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        {this.tournamentImportHeader && this.tournamentImportHeader.map((header) => <th key={header}>{header}</th>)}
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
                    <h2>Nhập thông tin thi Quyền CHUẨN</h2>
                  </div>
                  <a href={MauDuLieuChuan} download="1-Mau-Du-Lieu-Chuan.xlsx" target="_blank" rel="noreferrer" >
                    <span>Download Mau-Du-Lieu-Chuan.xlsx</span>
                  </a>
                  <div className="function-button">
                    <div className="input-group">
                      <div className="custom-file">
                        <input type="file" className="custom-file-input" onChange={this.handleimportTournamentMartialFile} />
                        <label className="custom-file-label" htmlFor="inputGroupFile04">Chọn file</label>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-primary" type="button" onClick={this.importTournamentMartial}><i className="fa-solid fa-file-upload"></i> Import Thi
                          Quyền</button>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            {this.tournamentMartialImportHeader && this.tournamentMartialImportHeader.map((header) => <th key={header}>{header}</th>)}
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

                <div className="tournament-text mb-5 mt-3">
                  <div className="form-title">
                    <h2>Xử lý thông tin thi đấu Đối Kháng THÔ</h2>
                    <a href={MauDuLieuTho} download="2-Mau-Du-Lieu-Tho.xlsx" target="_blank" rel="noreferrer" >
                      <span>Download Mau-Du-Lieu-Tho.xlsx</span>
                    </a>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <div className="custom-file">
                        <input type="file" className="custom-file-input" onChange={this.handleimportTournamentRawFile} />
                        <label className="custom-file-label" htmlFor="inputGroupFile04">Chọn file</label>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-info" type="button" onClick={this.shuffle}><i className="fa-solid fa-shuffle"></i> Xáo trộn danh sách</button>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-warning" type="button" onClick={this.arrangeTournament}><i className="fa-solid fa-layer-group"></i> Sắp xếp Đối Kháng</button>
                      </div>
                      <div className="input-group-append">
                        <button className="btn btn-success" type="button" ><i className="fa-solid fa-file-download"></i> Download Đối Kháng</button>
                      </div>
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        {this.tournamentArrangeHeader && this.tournamentArrangeHeader.map((header) => <th key={header}>{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {this.tournamentStandardArray ? this.tournamentStandardArray.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      )) :
                        <tr><td colSpan="2">Không có dữ liệu hiển thị</td></tr>
                      }
                      {this.tournamentArrayRaw ? this.tournamentArrayRaw.map((row, i) => (
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
        <ToastContainer />


      </div>
    );
  }
}

export default SettingContainer;
