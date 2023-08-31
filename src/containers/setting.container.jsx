import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { read, write, utils } from 'xlsx';
import FileSaver from "file-saver";
import { NavLink } from "react-router-dom";
import mauchuandoikhang from '../assets/template/1-Mau_Chuan_Doi_Khang.xlsx';
import mauchuanthiquyen from '../assets/template/2-Mau-Chuan_Thi_Quyen.xlsx';
import mauthodoikhang from '../assets/template/3-Mau_Tho_Doi_Khang.xlsx';
import mauthothiquyen from '../assets/template/4-Mau_Tho_Thi_Quyen.xlsx';

class SettingContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.state = {
      data: [],
    };

    this.db = Firebase();
    this.settingObj;
    this.tournamentObj;
    this.tournamentMartialObj;
    this.tournamentStandardArray = [];
    this.tournamentArray = [];
    this.tournamentMartialArray = [];
    this.tournamentMartialStandardArray = [];

    this.settingConst = { "setting": { "timeRound": 90, "timeBreak": 30, "timeExtra": 60, "timeExtraBreak": 15, "tournamentName": "Cóc Vương", "isShowCountryFlag": false, "isShowFiveReferee": false, "password": 1 } };
    this.matchObj = {"match":{"no":1,"type":"","category":"","win":""},"fighters":{"redFighter":{"result":"","name":"Đỏ","code":"","caution":{"remind":0,"warning":0,"medical":0},"score":0},"blueFighter":{"result":"","name":"Xanh","code":"","caution":{"remind":0,"warning":0,"medical":0},"score":0}}}
    this.tournamentConst = {"arena":[{"arenaName":"Sân A","lastMatch":{"no":1},"referee":[{"blueScore":0,"redScore":0},{"blueScore":0,"redScore":0},{"blueScore":0,"redScore":0},{"blueScore":0,"redScore":0},{"blueScore":0,"redScore":0}]},{"arenaName":"Sân B","lastMatch":{"no":1},"referee":[{"blueScore":0,"redScore":0},{"blueScore":1,"redScore":0},{"blueScore":0,"redScore":0},{"blueScore":0,"redScore":0},{"blueScore":0,"redScore":0}]}],"tournament":[]};
    this.matchMartialObj = { "match": { "name": "" }, "team": [] };
    this.tournamentMartialConst = { "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 }, "tournamentMartial": [] };
    this.fightersMartialObj = { "fighters": [], "no": 0, "score": 0, "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }] };
    this.fighterMartialObj = { "fighter": { "code": "", "name": "", "country": "" } }

    this.schemaFighters = [];
    this.schemaFighters.push('[]');//0
    this.schemaFighters.push('[]');//1
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Chung Kết","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}}]'); //2
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":2,"weight":1,"type":"Chung Kết","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":"W.1","code":"","country":""}}]');//3
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":3,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":"W.2","code":"","country":""}}]');//4
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":5,"code":5,"country":5}},{"match":4,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":"W.3","code":"","country":""}}]'); //5
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2,"country":2},"blueFighter":{"name":3,"code":3,"country":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4,"country":4},"blueFighter":{"name":5,"code":5,"country":5}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":6,"code":6,"country":6}},{"match":5,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":"W.4","code":"","country":""}}]');//6
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2,"country":2},"blueFighter":{"name":3,"code":3,"country":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4,"country":4},"blueFighter":{"name":5,"code":5,"country":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":7,"code":7,"country":7}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":6,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}}]');//7
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5,"country":5},"blueFighter":{"name":6,"code":6,"country":6}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":7,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":"W.6","code":"","country":""}}]');//8
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":7,"code":7,"country":7}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5,"country":5},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8,"country":8},"blueFighter":{"name":9,"code":9,"country":9}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}},{"match":8,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}}]');//9
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":5,"code":5,"country":5}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":"W.6","code":"","country":""}},{"match":9,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.8","code":"","country":""}}]');//10
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":5,"code":5,"country":5}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":11,"code":11,"country":11}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":10,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.8","code":"","country":""},"blueFighter":{"name":"W.9","code":"","country":""}}]');//11
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2,"country":2},"blueFighter":{"name":3,"code":3,"country":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4,"country":4},"blueFighter":{"name":5,"code":5,"country":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8,"country":8},"blueFighter":{"name":9,"code":9,"country":9}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10,"country":10},"blueFighter":{"name":11,"code":11,"country":11}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":6,"code":6,"country":6}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":12,"code":12,"country":12}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":"W.6","code":"","country":""}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":11,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.9","code":"","country":""},"blueFighter":{"name":"W.10","code":"","country":""}}]');//12
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2,"country":2},"blueFighter":{"name":3,"code":3,"country":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4,"country":4},"blueFighter":{"name":5,"code":5,"country":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":11,"code":11,"country":11},"blueFighter":{"name":12,"code":12,"country":12}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":6,"code":6,"country":6}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":13,"code":13,"country":13}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":"","country":""},"blueFighter":{"name":"W.9","code":"","country":""}},{"match":12,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.10","code":"","country":""},"blueFighter":{"name":"W.11","code":"","country":""}}]');//13
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2,"country":2},"blueFighter":{"name":3,"code":3,"country":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4,"country":4},"blueFighter":{"name":5,"code":5,"country":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":7,"code":7,"country":7}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8,"country":8},"blueFighter":{"name":9,"code":9,"country":9}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10,"country":10},"blueFighter":{"name":11,"code":11,"country":11}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12,"country":12},"blueFighter":{"name":13,"code":13,"country":13}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":14,"code":14,"country":14}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.8","code":"","country":""}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":"","country":""},"blueFighter":{"name":"W.10","code":"","country":""}},{"match":13,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.11","code":"","country":""},"blueFighter":{"name":"W.12","code":"","country":""}}]');//14
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":2,"code":2,"country":2},"blueFighter":{"name":3,"code":3,"country":3}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":4,"code":4,"country":4},"blueFighter":{"name":5,"code":5,"country":5}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":7,"code":7,"country":7}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8,"country":8},"blueFighter":{"name":9,"code":9,"country":9}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10,"country":10},"blueFighter":{"name":11,"code":11,"country":11}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12,"country":12},"blueFighter":{"name":13,"code":13,"country":13}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":14,"code":14,"country":14},"blueFighter":{"name":15,"code":15,"country":15}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":"","country":""},"blueFighter":{"name":"W.9","code":"","country":""}},{"match":13,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.10","code":"","country":""},"blueFighter":{"name":"W.11","code":"","country":""}},{"match":14,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.12","code":"","country":""},"blueFighter":{"name":"W.13","code":"","country":""}}]');//15
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5,"country":5},"blueFighter":{"name":6,"code":6,"country":6}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":11,"code":11,"country":11},"blueFighter":{"name":12,"code":12,"country":12}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":13,"code":13,"country":13},"blueFighter":{"name":14,"code":14,"country":14}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":15,"code":15,"country":15},"blueFighter":{"name":16,"code":16,"country":16}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":"W.6","code":"","country":""}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.8","code":"","country":""}},{"match":13,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":"","country":""},"blueFighter":{"name":"W.10","code":"","country":""}},{"match":14,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.11","code":"","country":""},"blueFighter":{"name":"W.12","code":"","country":""}},{"match":15,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.13","code":"","country":""},"blueFighter":{"name":"W.14","code":"","country":""}}]');//16
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10,"country":10},"blueFighter":{"name":11,"code":11,"country":11}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5,"country":5},"blueFighter":{"name":6,"code":6,"country":6}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12,"country":12},"blueFighter":{"name":13,"code":13,"country":13}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":14,"code":14,"country":14},"blueFighter":{"name":15,"code":15,"country":15}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":16,"code":16,"country":16},"blueFighter":{"name":17,"code":17,"country":17}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":13,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.8","code":"","country":""},"blueFighter":{"name":"W.9","code":"","country":""}},{"match":14,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.10","code":"","country":""},"blueFighter":{"name":"W.11","code":"","country":""}},{"match":15,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.12","code":"","country":""},"blueFighter":{"name":"W.13","code":"","country":""}},{"match":16,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.14","code":"","country":""},"blueFighter":{"name":"W.15","code":"","country":""}}]');//17
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":7,"code":7,"country":7}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":11,"code":11,"country":11},"blueFighter":{"name":12,"code":12,"country":12}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5,"country":5},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8,"country":8},"blueFighter":{"name":9,"code":9,"country":9}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10,"country":10},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":13,"code":13,"country":13},"blueFighter":{"name":14,"code":14,"country":14}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":15,"code":15,"country":15},"blueFighter":{"name":16,"code":16,"country":16}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":17,"code":17,"country":17},"blueFighter":{"name":18,"code":18,"country":18}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":"W.6","code":"","country":""}},{"match":13,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.8","code":"","country":""}},{"match":14,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.9","code":"","country":""},"blueFighter":{"name":"W.10","code":"","country":""}},{"match":15,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.11","code":"","country":""},"blueFighter":{"name":"W.12","code":"","country":""}},{"match":16,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.13","code":"","country":""},"blueFighter":{"name":"W.14","code":"","country":""}},{"match":17,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.15","code":"","country":""},"blueFighter":{"name":"W.16","code":"","country":""}}]');//18
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":7,"code":7,"country":7}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12,"country":12},"blueFighter":{"name":13,"code":13,"country":13}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":16,"code":16,"country":16},"blueFighter":{"name":17,"code":17,"country":17}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":5,"code":5,"country":5},"blueFighter":{"name":"W.1","code":"","country":""}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":8,"code":8,"country":8},"blueFighter":{"name":9,"code":9,"country":9}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":10,"code":10,"country":10},"blueFighter":{"name":11,"code":11,"country":11}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.2","code":"","country":""},"blueFighter":{"name":14,"code":14,"country":14}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":15,"code":15,"country":15},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":18,"code":18,"country":18},"blueFighter":{"name":19,"code":19,"country":19}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":"W.5","code":"","country":""}},{"match":13,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":14,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.8","code":"","country":""},"blueFighter":{"name":"W.9","code":"","country":""}},{"match":15,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.10","code":"","country":""},"blueFighter":{"name":"W.11","code":"","country":""}},{"match":16,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.12","code":"","country":""},"blueFighter":{"name":"W.13","code":"","country":""}},{"match":17,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.14","code":"","country":""},"blueFighter":{"name":"W.15","code":"","country":""}},{"match":18,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.16","code":"","country":""},"blueFighter":{"name":"W.17","code":"","country":""}}]');//19
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":13,"code":13,"country":13},"blueFighter":{"name":14,"code":14,"country":14}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":17,"code":17,"country":17},"blueFighter":{"name":18,"code":18,"country":18}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":5,"code":5,"country":5}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":11,"code":11,"country":11},"blueFighter":{"name":12,"code":12,"country":12}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.13","code":"","country":""},"blueFighter":{"name":15,"code":15,"country":15}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":16,"code":16,"country":16},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":19,"code":19,"country":19},"blueFighter":{"name":20,"code":20,"country":20}},{"match":13,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":"W.6","code":"","country":""}},{"match":14,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.8","code":"","country":""}},{"match":15,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.9","code":"","country":""},"blueFighter":{"name":"W.10","code":"","country":""}},{"match":16,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.11","code":"","country":""},"blueFighter":{"name":"W.12","code":"","country":""}},{"match":17,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.13","code":"","country":""},"blueFighter":{"name":"W.14","code":"","country":""}},{"match":18,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":""},"blueFighter":{"name":"W.16","code":"","country":""}},{"match":19,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.17","code":"","country":""},"blueFighter":{"name":"W.18","code":"","country":""}}]');//20
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12,"country":12},"blueFighter":{"name":14,"code":14,"country":14}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":14,"code":14,"country":14},"blueFighter":{"name":15,"code":15,"country":15}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":19,"code":19,"country":19},"blueFighter":{"name":20,"code":20,"country":20}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":5,"code":5,"country":5}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":11,"code":11,"country":11},"blueFighter":{"name":"W.3","code":"","country":""}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.4","code":"","country":""},"blueFighter":{"name":16,"code":16,"country":16}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":17,"code":17,"country":17},"blueFighter":{"name":18,"code":18,"country":18}},{"match":13,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":21,"code":21,"country":21}},{"match":14,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":"W.7","code":"","country":""}},{"match":15,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.8","code":"","country":""},"blueFighter":{"name":"W.9","code":"","country":""}},{"match":16,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.10","code":"","country":""},"blueFighter":{"name":"W.11","code":"","country":""}},{"match":17,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.12","code":"","country":""},"blueFighter":{"name":"W.13","code":"","country":""}},{"match":18,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":""},"blueFighter":{"name":"W.16","code":"","country":""}},{"match":19,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.16","code":"","country":""},"blueFighter":{"name":"W.17","code":"","country":""}},{"match":20,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.18","code":"","country":""},"blueFighter":{"name":"W.19","code":"","country":""}}]');//21
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại","redFighter":{"name":3,"code":3,"country":3},"blueFighter":{"name":4,"code":4,"country":4}},{"match":2,"weight":1,"type":"Vòng loại","redFighter":{"name":7,"code":7,"country":7},"blueFighter":{"name":8,"code":8,"country":8}},{"match":3,"weight":1,"type":"Vòng loại","redFighter":{"name":9,"code":9,"country":9},"blueFighter":{"name":10,"code":10,"country":10}},{"match":4,"weight":1,"type":"Vòng loại","redFighter":{"name":13,"code":13,"country":13},"blueFighter":{"name":14,"code":14,"country":14}},{"match":5,"weight":1,"type":"Vòng loại","redFighter":{"name":15,"code":15,"country":15},"blueFighter":{"name":16,"code":16,"country":16}},{"match":6,"weight":1,"type":"Vòng loại","redFighter":{"name":20,"code":20,"country":20},"blueFighter":{"name":21,"code":21,"country":21}},{"match":7,"weight":1,"type":"Vòng loại","redFighter":{"name":1,"code":1,"country":1},"blueFighter":{"name":2,"code":2,"country":2}},{"match":8,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.1","code":"","country":""},"blueFighter":{"name":5,"code":5,"country":5}},{"match":9,"weight":1,"type":"Vòng loại","redFighter":{"name":6,"code":6,"country":6},"blueFighter":{"name":"W.2","code":"","country":""}},{"match":10,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.3","code":"","country":""},"blueFighter":{"name":11,"code":11,"country":11}},{"match":11,"weight":1,"type":"Vòng loại","redFighter":{"name":12,"code":12,"country":12},"blueFighter":{"name":"W.4","code":"","country":""}},{"match":12,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.5","code":"","country":""},"blueFighter":{"name":17,"code":17,"country":17}},{"match":13,"weight":1,"type":"Vòng loại","redFighter":{"name":18,"code":18,"country":18},"blueFighter":{"name":19,"code":19,"country":19}},{"match":14,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.6","code":"","country":""},"blueFighter":{"name":22,"code":22,"country":22}},{"match":15,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.7","code":"","country":""},"blueFighter":{"name":"W.8","code":"","country":""}},{"match":16,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.9","code":"","country":""},"blueFighter":{"name":"W.10","code":"","country":""}},{"match":17,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.11","code":"","country":""},"blueFighter":{"name":"W.12","code":"","country":""}},{"match":18,"weight":1,"type":"Vòng loại","redFighter":{"name":"W.13","code":"","country":""},"blueFighter":{"name":"W.14","code":"","country":""}},{"match":19,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":""},"blueFighter":{"name":"W.16","code":"","country":""}},{"match":20,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.17","code":"","country":""},"blueFighter":{"name":"W.18","code":"","country":""}},{"match":21,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.19","code":"","country":""},"blueFighter":{"name":"W.20","code":"","country":""}}]');//22
  }

  componentDidMount() {
    this.showPasswordModal();
    // this.main();
  }

  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      onValue(ref(this.db, 'setting/password'), (snapshot) => {
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
      $("input[name=password]").val(this.settingObj.password);
      $("#flexSwitchCountryFlag").prop("checked", this.settingObj.isShowCountryFlag);
      $("#quantityReferee").prop("checked", this.settingObj.isShowFiveReferee);
    })

    get(child(ref(this.db), 'setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
    })
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
        $("input[name=password]").val(this.settingObj.password);
        $("#flexSwitchCountryFlag").prop("checked", this.settingObj.isShowCountryFlag);
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
      "isShowFiveReferee": $("#quantityReferee").prop("checked"),
      "password": parseInt($("input[name=password]").val()),
    }
    update(ref(this.db, 'setting'), this.settingObj).then(() => {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("updateSetting End");
  }

  handleimportTournamentFile = (event) => {
    console.log("handleimportTournamentFile Start");
    this.tournamentObj = JSON.parse(JSON.stringify(this.tournamentConst));

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets['data'];
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
          matchObjTemp.fighters.redFighter.country = values[5] !== undefined ? values[5].trim() : '';
          matchObjTemp.fighters.blueFighter.name = values[6] !== undefined ? values[6].trim() : '';
          matchObjTemp.fighters.blueFighter.code = values[7] !== undefined ? values[7].trim() : '';
          matchObjTemp.fighters.blueFighter.country = values[8] !== undefined ? values[8].trim() : '';
          this.tournamentObj.tournament.push(matchObjTemp);
          this.tournamentArray.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? values[1].trim() : '',
            values[2] !== undefined ? values[2].trim() : '',
            values[3] !== undefined ? values[3].trim() : '',
            values[4] !== undefined ? values[4].trim() : '',
            values[5] !== undefined ? values[5].trim() : '',
            values[6] !== undefined ? values[6].trim() : '',
            values[7] !== undefined ? values[7].trim() : '',
            values[8] !== undefined ? values[8].trim() : '',
          ]);
        }
      }

      this.tournamentImportHeader = [excelData[0][0], excelData[0][1], excelData[0][2], excelData[0][3], excelData[0][4], excelData[0][5], excelData[0][6], excelData[0][7], excelData[0][8]];
      this.setState({ data: this.tournamentArray });

    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportTournamentFile End");
  };

  importTournament = () => {
    console.log("importTournament Start");
    update(ref(this.db), this.tournamentObj).then(() => {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("importTournament End");
  }

  downloadTournament = () => {
    console.log("downloadTournament Start");
    this.tournamentArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    this.exportExcel(this.tournamentArrangeHeader, this.state.data, "Thong tin DOI KHANG");
    console.log("downloadTournament End");
  }

  handleimportTournamentMartialFile = (event) => {
    console.log("handleimportTournamentMartialFile Start");
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
      const worksheet = workbook.Sheets['data'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 });
      this.tournamentMartialArray = [];

      for (let i = 0; i < excelData.length; i++) {
        let values = excelData[i];

        if (values.length !== 0) { //Dòng có nội dung
          if (values.length === 1 && values[0] !== " ") { //Dòng chứa tên nội dung
            matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
            this.tournamentMartialObj.tournamentMartial.push(matchMartialObjTemp);
            matchMartialObjTemp.match.name = values[0].trim();
            this.tournamentMartialArray.push([values[0].trim(), '', '', '']);
          } else { //Dòng chứa Title hoặc thông tin VDV
            if (!isNaN(parseFloat(values[0]))) { //Dòng chứa nội dung VDV
              fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
              fighterMartialObjTemp.fighter.name = values[1].trim();
              fighterMartialObjTemp.fighter.code = values[2].trim();
              fighterMartialObjTemp.fighter.country = values[3].trim();
              fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
              fightersMartialObjTemp.no = values[0];
              fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
              this.tournamentMartialObj.tournamentMartial.slice(-1)[0].team.push(fightersMartialObjTemp);
              this.tournamentMartialArray.push([values[0], values[1].trim(), values[2].trim(), values[3].trim()]);
            } else { //Dòng chứa nội dung VDV Đồng đội hoặc Title
              if (values[0] === undefined) { //Dòng VDV đồng đội thứ 2 trở đi
                fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
                fighterMartialObjTemp.fighter.name = values[1].trim();
                fighterMartialObjTemp.fighter.code = values[2].trim();
                fighterMartialObjTemp.fighter.country = values[3].trim();
                this.tournamentMartialObj.tournamentMartial.slice(-1)[0].team.slice(-1)[0].fighters.push(fighterMartialObjTemp);
                this.tournamentMartialArray.push(['', values[1].trim(), values[2].trim(), values[3].trim()]);
              }
            }
          }
        }
      }

      this.tournamentMartialImportHeader = ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.tournamentMartialArray });

    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportTournamentMartialFile End");
  }

  importTournamentMartial = () => {
    console.log("importTournamentMartial Start");
    update(ref(this.db), this.tournamentMartialObj).then(() => {
      toast.success("Cập nhập thông tin giải đấu thành công!");
    });
    console.log("importTournamentMartial End");
  }

  handleimportTournamentRawFile = (event) => {
    console.log("handleimportTournamentRawFile Start");
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets['data'];
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
            values[4] !== undefined ? values[4].trim() : '',
          ]);
        }
      }

      this.tournamentArrangeHeader = ['STT', 'HẠNG CÂN', 'TÊN VDV', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.tournamentArrayRaw });

    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportTournamentRawFile End");
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

    // Sắp xếp mảng theo thứ tự "Vòng loại", "Bán kết", "Chung kết"
    this.matchs.sort((a, b) => {
      const typeOrder = { 'Vòng loại': 0, 'Bán Kết': 1, 'Chung Kết': 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    //Tiến hành sắp xếp lại các trận đấu theo đúng thứ tự bằng cách đổi mã
    for (let i = 0; i < this.matchs.length; i++) {
      let oldMatchNo = this.matchs[i].match;
      let newMatchNo = i + 1;
      if (this.matchs[i].match !== newMatchNo) {
        this.matchs[i].match = newMatchNo;
        for (let j = 0; j < this.matchs.length; j++) {
          if (this.matchs[j].redFighter.name === "W." + oldMatchNo) {
            this.matchs[j].redFighter.name = "W.." + newMatchNo;
          }
          if (this.matchs[j].blueFighter.name === "W." + oldMatchNo) {
            this.matchs[j].blueFighter.name = "W.." + newMatchNo;
          }
        }
      }
    }
    for (let i = 0; i < this.matchs.length; i++) {
      this.matchs[i].redFighter.name = (this.matchs[i].redFighter.name).replace(/W\.\.(\d+)/g, "W.$1");
      this.matchs[i].blueFighter.name = (this.matchs[i].blueFighter.name).replace(/W\.\.(\d+)/g, "W.$1");
    }

    //Add to array to show in table and data import
    this.tournamentObj = JSON.parse(JSON.stringify(this.tournamentConst));
    this.matchs.forEach(value => {
      this.tournamentStandardArray.push([
        value.match, value.weight, value.type, value.redFighter.name, value.redFighter.code, value.redFighter.country, value.blueFighter.name, value.blueFighter.code, value.blueFighter.country
      ]);
      let matchObjTemp = JSON.parse(JSON.stringify(this.matchObj));
      matchObjTemp.match.no = value.match;
      matchObjTemp.match.category = value.weight;
      matchObjTemp.match.type = value.type;
      matchObjTemp.fighters.redFighter.name = value.redFighter.name;
      matchObjTemp.fighters.redFighter.code = value.redFighter.code;
      matchObjTemp.fighters.redFighter.country = value.redFighter.country;
      matchObjTemp.fighters.blueFighter.name = value.blueFighter.name;
      matchObjTemp.fighters.blueFighter.code = value.blueFighter.code;
      matchObjTemp.fighters.blueFighter.country = value.blueFighter.country;
      this.tournamentObj.tournament.push(matchObjTemp);
    })

    this.tournamentArrayRaw = [];
    this.tournamentArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
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
        match.redFighter.country = fighters[match.redFighter.country - 1][4];
      }
      if (!isNaN(parseFloat(match.blueFighter.name))) {
        match.blueFighter.name = fighters[match.blueFighter.name - 1][2];
        match.blueFighter.code = fighters[match.blueFighter.code - 1][3];
        match.blueFighter.country = fighters[match.blueFighter.country - 1][4];
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
        match.redFighter.name = 'W.' + (number + variance);
      }
      if (match.blueFighter.name.includes('W.')) {
        let number = parseFloat(match.blueFighter.name.split('.')[1]);
        match.blueFighter.name = 'W.' + (number + variance);
      }
    })
    return groupMatch;
  }

  exportExcel(header, rowData, fileName) {
    const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    const fileExtension = ".xlsx";
    let newRowData = rowData.slice();
    newRowData.unshift(header);
    const ws = utils.aoa_to_sheet(newRowData);
    // const ws = utils.json_to_sheet(rowData);
    utils.sheet_add_aoa(ws, [header], { origin: "A1" });
    const wb = { Sheets: { "data": ws }, SheetNames: ["data"] };
    const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: fileType });
    FileSaver.saveAs(data, fileName + fileExtension);
  };

  handleimportTournamentMartialRawFile = (event) => {
    console.log("handleimportTournamentMartialRawFile Start");
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, { type: 'array' });
      // const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets['data'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 });
      this.tournamentMartialArrayRaw = [];

      for (let i = 1; i < excelData.length; i++) {
        let values = excelData[i];

        if (values.length !== 0) { //Dòng có nội dung
          this.tournamentMartialArrayRaw.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? values[1].trim() : '',
            values[2] !== undefined ? values[2].trim() : '',
            values[3] !== undefined ? values[3].trim() : '',
            values[4] !== undefined ? values[4].trim() : '',
          ]);
        }
      }

      this.tournamentMartialArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.tournamentMartialArrayRaw });

    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportTournamentMartialRawFile End");
  }

  shuffleTournamentMartial = () => {
    console.log("shuffleTournamentMartial Start");


    this.setState({ data: this.tournamentArrayRaw });
    console.log("shuffleTournamentMartial End");
  }

  arrangeTournamentMartial = () => {
    console.log("arrangeTournamentMartial Start");

    this.tournamentMartialObj = JSON.parse(JSON.stringify(this.tournamentMartialConst));
    let matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
    let fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
    let fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
    this.tournamentMartialStandardArray = [];

    // Tạo đối tượng Map để gom nhóm các võ sĩ theo hạng cân
    let groupedData = new Map();
    let matchNo;
    let prevMatch;
    this.tournamentMartialArrayRaw.forEach(item => {
      let matchName = item[1].trim();
      if (groupedData.has(matchName)) {
        groupedData.get(matchName).push(item);

        if (prevMatch !== item[0] + item[1].trim()) {
          matchNo++;
          prevMatch = item[0] + item[1].trim();
        }
        fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
        fighterMartialObjTemp.fighter.name = item[2].trim();
        fighterMartialObjTemp.fighter.code = item[3].trim();
        fighterMartialObjTemp.fighter.country = item[4].trim();
        fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
        fightersMartialObjTemp.no = matchNo;
        fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
        this.tournamentMartialObj.tournamentMartial.slice(-1)[0].team.push(fightersMartialObjTemp);
        this.tournamentMartialStandardArray.push([matchNo, item[1].trim(), item[2].trim(), item[3].trim(), item[4].trim()]);

      } else {
        groupedData.set(matchName, [item]);
        matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
        this.tournamentMartialObj.tournamentMartial.push(matchMartialObjTemp);
        matchMartialObjTemp.match.name = matchName;
        this.tournamentMartialStandardArray.push([matchName, '', '', '', '']);
        matchNo = 1;
        prevMatch = item[0] + item[1].trim();

        fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
        fighterMartialObjTemp.fighter.name = item[2].trim();
        fighterMartialObjTemp.fighter.code = item[3].trim();
        fighterMartialObjTemp.fighter.country = item[4].trim();
        fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
        fightersMartialObjTemp.no = matchNo;
        fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
        this.tournamentMartialObj.tournamentMartial.slice(-1)[0].team.push(fightersMartialObjTemp);
        this.tournamentMartialStandardArray.push([matchNo, item[1].trim(), item[2].trim(), item[3].trim(), item[4].trim()]);
      }
    });

    // this.tournamentArrayRaw = [];
    this.tournamentArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.setState({ data: this.tournamentMartialStandardArray });

    console.log("arrangeTournamentMartial End");
  }

  downloadTournamentMartial = () => {
    console.log("downloadTournamentMartial Start");
    this.tournamentMartialArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.exportExcel(this.tournamentMartialArrangeHeader, this.state.data, "Thong tin THI QUYEN");
    console.log("downloadTournamentMartial End");
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
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="flexSwitchCountryFlag" />
                        <label className="form-check-label" htmlFor="flexSwitchCountryFlag">Hiển thị cờ quốc gia</label>
                      </div>
                    </div>
                    <div className="col">
                      <label>Đặt mật khẩu</label>
                      <div className="input-group mb-3">
                        <input type="number" className="form-control" placeholder="" name="password" />
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="quantityReferee" />
                        <label className="form-check-label" htmlFor="quantityReferee">Hiển thị 5 giám định</label>
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
                  <button type="button" className="btn btn-warning" style={{ marginRight: '5px' }} onClick={this.resetSetting}><i className="fa-solid fa-rotate-left"></i> Cài lại thiết đặt </button>
                  <button type="button" className="btn btn-danger" style={{ marginRight: '5px' }} onClick={this.updateSetting}><i className="fa-solid fa-pen"></i> Cập nhập</button>
                </form>

                <div className="tournament-text mb-5 mt-3">
                  <div className="form-title">
                    <h2><b>Nhập thông tin Đối Kháng CHUẨN</b></h2>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <a href={mauchuandoikhang} download="1-Mau_Chuan_Doi_Khang" target="_blank" rel="noreferrer" className="btn btn-outline-primary" role="button"><i className="fa-solid fa-file-download"></i> Download mẫu 1</a>
                      <input type="file" className="form-control" onChange={this.handleimportTournamentFile} />
                      <button className="btn btn-danger" type="button" onClick={this.importTournament}><i className="fa-solid fa-file-import"></i> Khởi tạo Đối Kháng</button>
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
                    <h2><b>Nhập thông tin Thi Quyền CHUẨN</b></h2>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <a href={mauchuanthiquyen} download="2-Mau_Chuan_Thi_Quyen" target="_blank" rel="noreferrer" className="btn btn-outline-primary" role="button"><i className="fa-solid fa-file-download"></i> Download mẫu 2</a>
                      <input type="file" className="form-control" onChange={this.handleimportTournamentMartialFile} />
                      <button className="btn btn-danger" type="button" onClick={this.importTournamentMartial}><i className="fa-solid fa-file-import"></i> Khởi tạo Thi Quyền</button>
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

                <div className="tournament-text mb-5 mt-3">
                  <div className="form-title">
                    <h2><b>Xử lý thông tin Đối Kháng THÔ</b></h2>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <a href={mauthodoikhang} download="3-Mau_Tho_Doi_Khang" target="_blank" rel="noreferrer" className="btn btn-outline-primary" role="button"><i className="fa-solid fa-file-download"></i> Download mẫu 3</a>
                      <input type="file" className="form-control" onChange={this.handleimportTournamentRawFile} />
                      <button className="btn btn-info" type="button" onClick={this.shuffle}><i className="fa-solid fa-shuffle"></i> Xáo trộn danh sách</button>
                      <button className="btn btn-warning" type="button" onClick={this.arrangeTournament}><i className="fa-solid fa-layer-group"></i> Sắp xếp Đối Kháng</button>
                      <button className="btn btn-danger" type="button" onClick={this.importTournament}><i className="fa-solid fa-file-import"></i> Khởi tạo Đối Kháng</button>
                      <button className="btn btn-primary" type="button" onClick={this.downloadTournament}><i className="fa-solid fa-file-download"></i> Download Danh sách</button>
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
                        <tr><td colSpan="5">Không có dữ liệu hiển thị</td></tr>
                      }
                      {this.tournamentArrayRaw ? this.tournamentArrayRaw.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      )) :
                        <tr><td colSpan="5">Không có dữ liệu hiển thị</td></tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div className="tournament-text mb-5 mt-3">
                  <div className="form-title">
                    <h2><b>Xử lý thông tin Thi Quyền THÔ</b></h2>
                  </div>
                  <div className="function-button">
                    <div className="input-group">
                      <a href={mauthothiquyen} download="4-Mau_Tho_Thi_Quyen" target="_blank" rel="noreferrer" className="btn btn-outline-primary" role="button"><i className="fa-solid fa-file-download"></i> Download mẫu 4</a>
                      <input type="file" className="form-control" onChange={this.handleimportTournamentMartialRawFile} />
                      {/* <button className="btn btn-info" type="button" onClick={this.shuffleTournamentMartial}><i className="fa-solid fa-shuffle"></i> Xáo trộn danh sách</button> */}
                      <button className="btn btn-warning" type="button" onClick={this.arrangeTournamentMartial}><i className="fa-solid fa-layer-group"></i> Sắp xếp Thi Quyền</button>
                      <button className="btn btn-danger" type="button" onClick={this.importTournamentMartial}><i className="fa-solid fa-file-import"></i> Khởi tạo Thi Quyền</button>
                      <button className="btn btn-primary" type="button" onClick={this.downloadTournamentMartial}><i className="fa-solid fa-file-download"></i> Download Danh sách</button>
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        {this.tournamentMartialArrangeHeader && this.tournamentMartialArrangeHeader.map((header) => <th key={header}>{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {this.tournamentMartialStandardArray ? this.tournamentMartialStandardArray.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      )) :
                        <tr><td colSpan="5">Không có dữ liệu hiển thị</td></tr>
                      }
                      {this.tournamentMartialArrayRaw ? this.tournamentMartialArrayRaw.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      )) :
                        <tr><td colSpan="5">Không có dữ liệu hiển thị</td></tr>
                      }
                    </tbody>
                  </table>
                </div>

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
