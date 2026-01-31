import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, set, get, update, remove, child, onValue, Database } from "firebase/database";
import logo from '../assets/img/logo.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { read, write, utils } from 'xlsx';
import FileSaver from "file-saver";
import { NavLink } from "react-router-dom";
import mauchuandoikhang from '../assets/template/1-Mau_Chuan_Doi_Khang.xlsx';
import mauchuanthiquyen from '../assets/template/2-Mau_Chuan_Thi_Quyen.xlsx';
import mauthodoikhang from '../assets/template/3-Mau_Tho_Doi_Khang.xlsx';
import mauthothiquyen from '../assets/template/4-Mau_Tho_Thi_Quyen.xlsx';

interface CreateTournamentContainerProps {}

interface CreateTournamentContainerState {
  data: any[];
  password: string;
  tournamentName: string;
  showPasswordModal: boolean;
  showChooseArenaNoModal: boolean;
}

interface Fighter {
  name: string;
  code: string;
  country: string;
  result: string;
}

interface MatchSchema {
  match: number;
  weight: number | string;
  type: string;
  redFighter: Fighter;
  blueFighter: Fighter;
}

interface MatchObj {
  match: { no: number; type: string; category: string; win: string };
  fighters: {
    redFighter: {
      result: string;
      name: string;
      code: string;
      country: string;
      caution: { remind: number; warning: number; medical: number; fall: number; bound: number };
      legStrike: boolean;
      score: number;
    };
    blueFighter: {
      result: string;
      name: string;
      code: string;
      country: string;
      caution: { remind: number; warning: number; medical: number; fall: number; bound: number };
      legStrike: boolean;
      score: number;
    };
  };
}

interface FighterMartialObj {
  fighter: { code: string; name: string; country: string };
}

interface FightersMartialObj {
  fighters: FighterMartialObj[];
  no: number;
  finalScore: number;
  refereeMartial: { score: number }[];
}

interface MatchMartialObj {
  match: { name: string };
  team: FightersMartialObj[];
}

interface CombatArena {
  combatArenaName: string;
  lastMatch: { no: number };
  referee: { blueScore: number; redScore: number }[];
}

interface CombatConst {
  combatArena: CombatArena[];
  combat: MatchObj[];
}

interface MartialArena {
  martialArenaName: string;
  lastMatchMartial: { matchMartialNo: number; teamMartialNo: number };
}

interface MartialConst {
  martialArena: MartialArena[];
  martial: MatchMartialObj[];
}

class CreateTournamentContainer extends Component<CreateTournamentContainerProps, CreateTournamentContainerState> {
  db: Database;
  settingObj: any;
  combatObj: CombatConst | null = null;
  martialObj: MartialConst | null = null;
  combatStandardArray: any[][] = [];
  combatArray: any[] = [];
  martialArray: any[] = [];
  martialStandardArray: any[][] = [];
  tournamentNoIndex = 0;
  martialArenaNoIndex = 0;
  tournamentObj: any[] | null = null;
  tournaments: [number, string][] = [];

  combatArrangeHeader: string[] = [];
  martialArrangeHeader: string[] = [];
  tournamentImportHeader: string[] = [];
  combatArrayRaw: any[][] = [];
  martialArrayRaw: any[][] = [];
  matchs: MatchSchema[] = [];
  groupMatch: MatchSchema[] = [];

  matchObj: MatchObj = {
    "match": { "no": 1, "type": "", "category": "", "win": "" },
    "fighters": {
      "redFighter": {
        "result": "",
        "name": "Đỏ",
        "code": "",
        "country": "",
        "caution": { "remind": 0, "warning": 0, "medical": 0, "fall": 0, "bound": 0 },
        "legStrike": false,
        "score": 0
      },
      "blueFighter": {
        "result": "",
        "name": "Xanh",
        "code": "",
        "country": "",
        "caution": { "remind": 0, "warning": 0, "medical": 0, "fall": 0, "bound": 0 },
        "legStrike": false,
        "score": 0
      }
    }
  };

  combatConst: CombatConst = {
    "combatArena": [{
      "combatArenaName": "Sân A",
      "lastMatch": { "no": 1 },
      "referee": [{ "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }]
    }, {
      "combatArenaName": "Sân B",
      "lastMatch": { "no": 1 },
      "referee": [{ "blueScore": 0, "redScore": 0 }, { "blueScore": 1, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }]
    }], "combat": []
  };

  matchMartialObj: MatchMartialObj = { "match": { "name": "" }, "team": [] };

  martialConst: MartialConst = {
    "martialArena": [{
      "martialArenaName": "Sân A",
      "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 }
    }, { "martialArenaName": "Sân B", "lastMatchMartial": { "matchMartialNo": 1, "teamMartialNo": 1 } }],
    "martial": []
  };

  fightersMartialObj: FightersMartialObj = {
    "fighters": [],
    "no": 0,
    "finalScore": 0,
    "refereeMartial": [{ "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }, { "score": 0 }]
  };

  fighterMartialObj: FighterMartialObj = { "fighter": { "code": "", "name": "", "country": "" } };

  schemaFighters: string[] = [];

  constructor(props: CreateTournamentContainerProps) {
    super(props);
    document.title = 'Tạo Giải';
    
    this.state = {
      data: [],
      password: '',
      tournamentName: '',
      showPasswordModal: true,
      showChooseArenaNoModal: false,
    };

    this.db = database;
    this.initSchemaFighters();
  }

  initSchemaFighters() {
    this.schemaFighters.push('[]');//0
    this.schemaFighters.push('[]');//1
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Chung Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}}]'); //2
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Chung Kết","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}}]');//3
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}}]');//4
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}}]'); //5
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}}]');//6
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Bán Kết","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":6,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}}]');//7
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":7,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}}]');//8
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":8,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}}]');//9
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":9,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}}]');//10
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":10,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}}]');//11
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":11,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}}]');//12
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":12,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}}]');//13
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":13,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}}]');//14
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-1","redFighter":{"name":14,"code":"","country":"","result":""},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":12,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":13,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":14,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}}]');//15
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-1","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-1","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":13,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":14,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":15,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}}]');//16
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":14,"code":"","country":"","result":""},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":16,"code":"","country":"","result":""},"blueFighter":{"name":17,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":11,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":12,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":14,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":15,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}},{"match":16,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.14","code":"","country":"","result":"W.14"},"blueFighter":{"name":"W.15","code":"","country":"","result":"W.15"}}]');//17
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-3","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":17,"code":"","country":"","result":""},"blueFighter":{"name":18,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":12,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":15,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":16,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}},{"match":17,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}}]');//18
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":7,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":13,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":16,"code":"","country":"","result":""},"blueFighter":{"name":17,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":5,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":18,"code":"","country":"","result":""},"blueFighter":{"name":19,"code":"","country":"","result":""}},{"match":12,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":"W.5","code":"","country":"","result":"W.5"}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":16,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}},{"match":17,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.14","code":"","country":"","result":"W.14"},"blueFighter":{"name":"W.15","code":"","country":"","result":"W.15"}},{"match":18,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.16","code":"","country":"","result":"W.16"},"blueFighter":{"name":"W.17","code":"","country":"","result":"W.17"}}]');//19
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":17,"code":"","country":"","result":""},"blueFighter":{"name":18,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":16,"code":"","country":"","result":""},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":19,"code":"","country":"","result":""},"blueFighter":{"name":20,"code":"","country":"","result":""}},{"match":13,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":16,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":17,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}},{"match":18,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}},{"match":19,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.17","code":"","country":"","result":"W.17"},"blueFighter":{"name":"W.18","code":"","country":"","result":"W.18"}}]');//20
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":14,"code":"","country":"","result":""},"blueFighter":{"name":15,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":19,"code":"","country":"","result":""},"blueFighter":{"name":20,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":11,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":17,"code":"","country":"","result":""},"blueFighter":{"name":18,"code":"","country":"","result":""}},{"match":13,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":21,"code":"","country":"","result":""}},{"match":14,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":"W.7","code":"","country":"","result":"W.7"}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.8","code":"","country":"","result":"W.8"},"blueFighter":{"name":"W.9","code":"","country":"","result":"W.9"}},{"match":16,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.10","code":"","country":"","result":"W.10"},"blueFighter":{"name":"W.11","code":"","country":"","result":"W.11"}},{"match":17,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.12","code":"","country":"","result":"W.12"},"blueFighter":{"name":"W.13","code":"","country":"","result":"W.13"}},{"match":18,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}},{"match":19,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.16","code":"","country":"","result":"W.16"},"blueFighter":{"name":"W.17","code":"","country":"","result":"W.17"}},{"match":20,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.18","code":"","country":"","result":"W.18"},"blueFighter":{"name":"W.19","code":"","country":"","result":"W.19"}}]');//21
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":3,"code":"","country":"","result":""},"blueFighter":{"name":4,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":8,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":9,"code":"","country":"","result":""},"blueFighter":{"name":10,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":13,"code":"","country":"","result":""},"blueFighter":{"name":14,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-1","redFighter":{"name":15,"code":"","country":"","result":""},"blueFighter":{"name":16,"code":"","country":"","result":""}},{"match":6,"weight":1,"type":"Vòng loại-1","redFighter":{"name":20,"code":"","country":"","result":""},"blueFighter":{"name":21,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":2,"code":"","country":"","result":""}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.1","code":"","country":"","result":"W.1"},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Vòng loại-2","redFighter":{"name":6,"code":"","country":"","result":""},"blueFighter":{"name":"W.2","code":"","country":"","result":"W.2"}},{"match":10,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.3","code":"","country":"","result":"W.3"},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":11,"weight":1,"type":"Vòng loại-2","redFighter":{"name":12,"code":"","country":"","result":""},"blueFighter":{"name":"W.4","code":"","country":"","result":"W.4"}},{"match":12,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":17,"code":"","country":"","result":""}},{"match":13,"weight":1,"type":"Vòng loại-2","redFighter":{"name":18,"code":"","country":"","result":""},"blueFighter":{"name":19,"code":"","country":"","result":""}},{"match":14,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.6","code":"","country":"","result":"W.6"},"blueFighter":{"name":22,"code":"","country":"","result":""}},{"match":15,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":16,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}},{"match":17,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.11","code":"","country":"","result":"W.11"},"blueFighter":{"name":"W.12","code":"","country":"","result":"W.12"}},{"match":18,"weight":1,"type":"Vòng loại-3","redFighter":{"name":"W.13","code":"","country":"","result":"W.13"},"blueFighter":{"name":"W.14","code":"","country":"","result":"W.14"}},{"match":19,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.15","code":"","country":"","result":"W.15"},"blueFighter":{"name":"W.16","code":"","country":"","result":"W.16"}},{"match":20,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.17","code":"","country":"","result":"W.17"},"blueFighter":{"name":"W.18","code":"","country":"","result":"W.18"}},{"match":21,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.19","code":"","country":"","result":"W.19"},"blueFighter":{"name":"W.20","code":"","country":"","result":"W.20"}}]');//22
  }

  componentDidMount() {
    // Check for cached password
    this.checkCachedPassword();
  }

  checkCachedPassword = () => {
    const cachedValid = localStorage.getItem('createTournament_password_valid');
    const cachedTime = localStorage.getItem('createTournament_password_timestamp');
    
    if (cachedValid === 'true' && cachedTime) {
      const timestamp = parseInt(cachedTime, 10);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - timestamp < sixHours) {
        // Password still valid, skip modal and show arena selection
        this.setState({ showPasswordModal: false, showChooseArenaNoModal: true });
        this.main();
        return;
      }
    }
    // Show password modal if cache invalid
    this.setState({ showPasswordModal: true });
  }

  cachePassword = () => {
    localStorage.setItem('createTournament_password_valid', 'true');
    localStorage.setItem('createTournament_password_timestamp', Date.now().toString());
  }

  verifyPassword = () => {
    const password = this.state.password;

    if (password != null && password !== "") {
      onValue(ref(this.db, 'commonSetting/passwordSetting'), (snapshot) => {
        if (password === String(snapshot.val())) {
          this.cachePassword();
          this.setState({ showPasswordModal: false, showChooseArenaNoModal: true });
          this.main();
        } else {
          toast.error("Sai mật khẩu!");
          window.location.reload();
        }
      }, { onlyOnce: true });
    } else {
      toast.error("Sai mật khẩu!");
    }
  }

  main() {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournaments = [];

      if (this.tournamentObj) {
        for (let i = 0; i < this.tournamentObj.length; i++) {
          this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
        }
      }
      this.setState({ data: this.tournaments });
    });

    get(ref(this.db, 'commonSetting')).then((snapshot) => {
      this.settingObj = snapshot.val();
    });

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      this.setState({ tournamentName: this.settingObj?.tournamentName || '' });
    });
  }

  chooseTournament = (tournamentNoIndex: number) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.martialArenaNoIndex = tournamentNoIndex;
  }

  chooseInfoNo = () => {
    this.setState({ showChooseArenaNoModal: false });
    this.main();
  }

  importCombat = () => {
    console.log("importCombat Start");
    this.arrangeCombat();
    if (this.combatObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.combatObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
      });
    }
    console.log("importCombat End");
  }

  downloadCombat = () => {
    console.log("downloadCombat Start");
    this.combatArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    this.exportExcel(this.combatArrangeHeader, this.state.data, "Thong tin DOI KHANG");
    console.log("downloadCombat End");
  }

  downloadCombatOrigin = () => {
    console.log("downloadCombat Start");
    this.combatArrangeHeader = ["STT", "HẠNG CÂN", "TÊN VẬN ĐỘNG VIÊN", "CODE/ĐƠN VỊ", "QUỐC GIA"];
    this.exportExcel(this.combatArrangeHeader, this.state.data, "Thong tin DOI KHANG");
    console.log("downloadCombat End");
  }

  importMartial = () => {
    console.log("importMartial Start");
    this.arrangeMartial();
    if (this.martialObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.martialObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
      });
    }
    console.log("importMartial End");
  }

  handleimportCombatRawFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleimportCombatRawFile Start");
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: 'array' });
      const worksheet = workbook.Sheets['data'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      this.combatArrayRaw = [];

      for (let i = 1; i < excelData.length; i++) {
        const values = excelData[i];

        if (values.length !== 0) {
          this.combatArrayRaw.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? String(values[1]).trim() : '',
            values[2] !== undefined ? String(values[2]).trim() : '',
            values[3] !== undefined ? String(values[3]).trim() : '',
            values[4] !== undefined ? String(values[4]).trim() : '',
          ]);
        }
      }

      this.combatArrangeHeader = ['STT', 'HẠNG CÂN', 'TÊN VDV', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.combatArrayRaw });
    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportCombatRawFile End");
  }

  shuffle = () => {
    console.log("shuffle Start");
    let currentIndex = this.combatArrayRaw.length;

    while (0 !== currentIndex) {
      const randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      const temporaryValue = this.combatArrayRaw[currentIndex];
      this.combatArrayRaw[currentIndex] = this.combatArrayRaw[randomIndex];
      this.combatArrayRaw[randomIndex] = temporaryValue;
    }

    this.grouping();
    this.setState({ data: this.combatArrayRaw });
    console.log("shuffle End");
  }

  grouping = () => {
    console.log("grouping Start");
    const weightCount: { [key: string]: number } = {};
    this.combatArrayRaw.forEach((fighter) => {
      const weight = fighter[1];
      weightCount[weight] = (weightCount[weight] || 0) + 1;
    });

    this.combatArrayRaw.sort((a, b) => {
      const weightA = a[1];
      const weightB = b[1];
      const countA = weightCount[weightA];
      const countB = weightCount[weightB];

      if (countB !== countA) {
        return countB - countA;
      }

      if (weightA !== weightB) {
        if (weightA.includes('>') && !weightB.includes('>')) {
          return 1;
        } else if (!weightA.includes('>') && weightB.includes('>')) {
          return -1;
        }
        return weightA.localeCompare(weightB);
      }

      return this.combatArrayRaw.indexOf(a) - this.combatArrayRaw.indexOf(b);
    });

    let countId = 1;
    for (let i = 0; i < this.combatArrayRaw.length; i++) {
      const weightA = this.combatArrayRaw[i][1];
      const weightB = this.combatArrayRaw[i + 1] ? this.combatArrayRaw[i + 1][1] : null;

      this.combatArrayRaw[i][0] = countId;

      if (weightA !== weightB) {
        countId = 1;
      } else {
        countId++;
      }
    }

    this.setState({ data: this.combatArrayRaw });
    console.log("grouping End");
  }

  arrangeCombat = () => {
    console.log("arrangeCombat Start");

    const weightCount: { [key: string]: number } = {};
    this.combatArrayRaw.forEach((fighter) => {
      const weight = fighter[1];
      weightCount[weight] = (weightCount[weight] || 0) + 1;
    });

    this.combatArrayRaw.sort((a, b) => {
      const weightA = a[1];
      const weightB = b[1];
      const countA = weightCount[weightA];
      const countB = weightCount[weightB];

      if (countB !== countA) {
        return countB - countA;
      }

      if (weightA !== weightB) {
        if (weightA.includes('>') && !weightB.includes('>')) {
          return 1;
        } else if (!weightA.includes('>') && weightB.includes('>')) {
          return -1;
        }
        return weightA.localeCompare(weightB);
      }

      return this.combatArrayRaw.indexOf(a) - this.combatArrayRaw.indexOf(b);
    });

    const groupedData = new Map<string, any[][]>();
    this.combatArrayRaw.forEach(item => {
      const weight = String(item[1]).trim();
      if (groupedData.has(weight)) {
        groupedData.get(weight)!.push(item);
      } else {
        groupedData.set(weight, [item]);
      }
    });

    this.matchs = [];
    let matchCount = 1;
    for (const [key, value] of groupedData.entries()) {
      this.groupMatch = this.getschedule(value);
      this.changeMatchNumber(this.groupMatch, matchCount);

      this.groupMatch.forEach(match => {
        this.matchs.push(match);
      });
      matchCount += this.groupMatch.length;
    }

    this.matchs.sort((a, b) => {
      const typeOrder: { [key: string]: number } = { 'Vòng loại-1': 0, 'Vòng loại-2': 1, 'Vòng loại-3': 2, 'Bán Kết': 3, 'Chung Kết': 4 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    for (let i = 0; i < this.matchs.length; i++) {
      const oldMatchNo = this.matchs[i].match;
      const newMatchNo = i + 1;
      if (this.matchs[i].match !== newMatchNo) {
        this.matchs[i].match = newMatchNo;
        for (let j = 0; j < this.matchs.length; j++) {
          if (this.matchs[j].redFighter.name === "W." + oldMatchNo) {
            this.matchs[j].redFighter.name = "W.." + newMatchNo;
            this.matchs[j].redFighter.result = "W.." + newMatchNo;
          }
          if (this.matchs[j].blueFighter.name === "W." + oldMatchNo) {
            this.matchs[j].blueFighter.name = "W.." + newMatchNo;
            this.matchs[j].blueFighter.result = "W.." + newMatchNo;
          }
        }
      }
    }
    for (let i = 0; i < this.matchs.length; i++) {
      this.matchs[i].redFighter.name = this.matchs[i].redFighter.name.replace(/W\.\.(\d+)/g, "W.$1");
      this.matchs[i].blueFighter.name = this.matchs[i].blueFighter.name.replace(/W\.\.(\d+)/g, "W.$1");
      this.matchs[i].redFighter.result = this.matchs[i].redFighter.result.replace(/W\.\.(\d+)/g, "W.$1");
      this.matchs[i].blueFighter.result = this.matchs[i].blueFighter.result.replace(/W\.\.(\d+)/g, "W.$1");
    }

    this.combatObj = JSON.parse(JSON.stringify(this.combatConst));
    this.combatStandardArray = [];
    this.matchs.forEach(value => {
      this.combatStandardArray.push([
        value.match, value.weight, String(value.type).split('-')[0], value.redFighter.name, value.redFighter.code, value.redFighter.country, value.blueFighter.name, value.blueFighter.code, value.blueFighter.country
      ]);
      const matchObjTemp = JSON.parse(JSON.stringify(this.matchObj)) as MatchObj;
      matchObjTemp.match.no = value.match;
      matchObjTemp.match.category = String(value.weight);
      matchObjTemp.match.type = String(value.type).split('-')[0];
      matchObjTemp.fighters.redFighter.name = value.redFighter.name;
      matchObjTemp.fighters.redFighter.code = value.redFighter.code;
      matchObjTemp.fighters.redFighter.country = value.redFighter.country;
      matchObjTemp.fighters.redFighter.result = value.redFighter.result;
      matchObjTemp.fighters.blueFighter.name = value.blueFighter.name;
      matchObjTemp.fighters.blueFighter.code = value.blueFighter.code;
      matchObjTemp.fighters.blueFighter.country = value.blueFighter.country;
      matchObjTemp.fighters.blueFighter.result = value.blueFighter.result;
      this.combatObj!.combat.push(matchObjTemp);
    });

    this.combatArrayRaw = [];
    this.combatArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    this.setState({ data: this.combatStandardArray });

    console.log("arrangeCombat End");
  }

  getschedule(fighters: any[][]): MatchSchema[] {
    const schemaFighter = JSON.parse(this.schemaFighters[fighters.length]) as MatchSchema[];
    const matchs: MatchSchema[] = [];
    for (let i = 0; i < schemaFighter.length; i++) {
      const match = schemaFighter[i];
      if (!isNaN(parseFloat(String(match.weight)))) {
        match.weight = fighters[Number(match.weight) - 1][1];
      }

      if (!isNaN(parseFloat(String(match.redFighter.name)))) {
        const index = Number(match.redFighter.name);
        match.redFighter.name = fighters[index - 1][2];
        match.redFighter.code = fighters[index - 1][3];
        match.redFighter.country = fighters[index - 1][4];
      }
      if (!isNaN(parseFloat(String(match.blueFighter.name)))) {
        const index = Number(match.blueFighter.name);
        match.blueFighter.name = fighters[index - 1][2];
        match.blueFighter.code = fighters[index - 1][3];
        match.blueFighter.country = fighters[index - 1][4];
      }
      matchs.push(match);
    }

    return matchs;
  }

  changeMatchNumber(groupMatch: MatchSchema[], newMatchNumber: number): MatchSchema[] {
    const variance = newMatchNumber - groupMatch[0].match;
    groupMatch.forEach(match => {
      match.match += variance;
      if (String(match.redFighter.name).includes('W.')) {
        const number = parseFloat(String(match.redFighter.name).split('.')[1]);
        match.redFighter.name = 'W.' + (number + variance);
      }
      if (String(match.blueFighter.name).includes('W.')) {
        const number = parseFloat(String(match.blueFighter.name).split('.')[1]);
        match.blueFighter.name = 'W.' + (number + variance);
      }
    });
    return groupMatch;
  }

  exportExcel(header: string[], rowData: any[], fileName: string) {
    const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    const fileExtension = ".xlsx";
    const newRowData = rowData.slice();
    newRowData.unshift(header);
    const ws = utils.aoa_to_sheet(newRowData);
    utils.sheet_add_aoa(ws, [header], { origin: "A1" });
    const wb = { Sheets: { "data": ws }, SheetNames: ["data"] };
    const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: fileType });
    FileSaver.saveAs(data, fileName + fileExtension);
  }

  handleimportMartialRawFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleimportMartialRawFile Start");
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: 'array' });
      const worksheet = workbook.Sheets['data'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      this.martialArrayRaw = [];

      for (let i = 1; i < excelData.length; i++) {
        const values = excelData[i];

        if (values.length !== 0) {
          this.martialArrayRaw.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? String(values[1]).trim() : '',
            values[2] !== undefined ? String(values[2]).trim() : '',
            values[3] !== undefined ? String(values[3]).trim() : '',
            values[4] !== undefined ? String(values[4]).trim() : '',
          ]);
        }
      }

      this.martialArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.martialArrayRaw });
    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportMartialRawFile End");
  }

  shuffleMartial = () => {
    console.log("shuffleMartial Start");
    this.setState({ data: this.combatArrayRaw });
    console.log("shuffleMartial End");
  }

  arrangeMartial = () => {
    console.log("arrangeMartial Start");

    this.martialObj = JSON.parse(JSON.stringify(this.martialConst));
    let matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj)) as MatchMartialObj;
    let fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj)) as FighterMartialObj;
    let fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj)) as FightersMartialObj;
    this.martialStandardArray = [];

    const groupedData = new Map<string, any[][]>();
    let matchNo = 0;
    let prevMatch = '';
    this.martialArrayRaw.forEach(item => {
      const matchName = String(item[1]).trim();
      if (groupedData.has(matchName)) {
        groupedData.get(matchName)!.push(item);
        if (prevMatch !== item[0] + String(item[1]).trim()) {
          matchNo++;
        }
        fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
        fighterMartialObjTemp.fighter.name = String(item[2]).trim();
        fighterMartialObjTemp.fighter.code = String(item[3]).trim();
        fighterMartialObjTemp.fighter.country = String(item[4]).trim();
        fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
        fightersMartialObjTemp.no = matchNo;
        fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
        if (prevMatch !== item[0] + String(item[1]).trim()) {
          this.martialObj!.martial.slice(-1)[0].team.push(fightersMartialObjTemp);
        } else {
          this.martialObj!.martial.slice(-1)[0].team.slice(-1)[0].fighters.push(fighterMartialObjTemp);
        }
        this.martialStandardArray.push([matchNo, String(item[1]).trim(), String(item[2]).trim(), String(item[3]).trim(), String(item[4]).trim()]);

      } else {
        groupedData.set(matchName, [item]);
        matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
        this.martialObj!.martial.push(matchMartialObjTemp);
        matchMartialObjTemp.match.name = matchName;
        this.martialStandardArray.push([matchName, '', '', '', '']);
        matchNo = 1;
        fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
        fighterMartialObjTemp.fighter.name = String(item[2]).trim();
        fighterMartialObjTemp.fighter.code = String(item[3]).trim();
        fighterMartialObjTemp.fighter.country = String(item[4]).trim();
        fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
        fightersMartialObjTemp.no = matchNo;
        fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
        this.martialObj!.martial.slice(-1)[0].team.push(fightersMartialObjTemp);
        this.martialStandardArray.push([matchNo, String(item[1]).trim(), String(item[2]).trim(), String(item[3]).trim(), String(item[4]).trim()]);
      }
      prevMatch = item[0] + String(item[1]).trim();
    });

    this.martialArrayRaw = [];
    this.combatArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.setState({ data: this.martialStandardArray });

    console.log("arrangeMartial End");
  }

  downloadMartial = () => {
    console.log("downloadMartial Start");
    this.martialArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.exportExcel(this.martialArrangeHeader, this.state.data, "Thong tin THI QUYEN");
    console.log("downloadMartial End");
  }

  inputPw = (value: string) => {
    if (value === "-1") {
      this.setState({ password: '' });
    } else {
      this.setState(prevState => ({ password: prevState.password + value }));
    }
  }

  handleimportMartialStandardFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleimportMartialStandardFile Start");
    this.martialObj = JSON.parse(JSON.stringify(this.martialConst));
    let matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj)) as MatchMartialObj;
    let fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj)) as FighterMartialObj;
    let fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj)) as FightersMartialObj;

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: 'array' });
      const worksheet = workbook.Sheets['data'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      this.martialStandardArray = [];

      for (let i = 0; i < excelData.length; i++) {
        const values = excelData[i];

        if (values.length !== 0) {
          if (values.length === 1 && values[0] !== " ") {
            matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
            this.martialObj!.martial.push(matchMartialObjTemp);
            matchMartialObjTemp.match.name = String(values[0]).trim();
            this.martialStandardArray.push([String(values[0]).trim(), '', '', '']);
          } else {
            if (!isNaN(parseFloat(values[0]))) {
              fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
              fighterMartialObjTemp.fighter.name = String(values[1]).trim();
              fighterMartialObjTemp.fighter.code = String(values[2]).trim();
              fighterMartialObjTemp.fighter.country = String(values[3]).trim();
              fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
              fightersMartialObjTemp.no = values[0];
              fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
              this.martialObj!.martial.slice(-1)[0].team.push(fightersMartialObjTemp);
              this.martialStandardArray.push([values[0], String(values[1]).trim(), String(values[2]).trim(), String(values[3]).trim()]);
            } else {
              if (values[0] === undefined) {
                fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
                fighterMartialObjTemp.fighter.name = String(values[1]).trim();
                fighterMartialObjTemp.fighter.code = String(values[2]).trim();
                fighterMartialObjTemp.fighter.country = String(values[3]).trim();
                this.martialObj!.martial.slice(-1)[0].team.slice(-1)[0].fighters.push(fighterMartialObjTemp);
                this.martialStandardArray.push(['', String(values[1]).trim(), String(values[2]).trim(), String(values[3]).trim()]);
              }
            }
          }
        }
      }

      this.combatArrangeHeader = ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.martialStandardArray });
    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportMartialStandardFile End");
  }

  handleimportCombatStandFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleimportCombatStandFile Start");
    this.combatObj = JSON.parse(JSON.stringify(this.combatConst));

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: 'array' });
      const worksheet = workbook.Sheets['data'];
      const excelData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      this.combatStandardArray = [];

      for (let i = 1; i < excelData.length; i++) {
        const values = excelData[i];
        if (values.length >= 2) {
          const matchObjTemp = JSON.parse(JSON.stringify(this.matchObj)) as MatchObj;
          matchObjTemp.match.no = values[0] !== undefined ? values[0] : '';
          matchObjTemp.match.category = values[1] !== undefined ? String(values[1]).trim() : '';
          matchObjTemp.match.type = values[2] !== undefined ? String(values[2]).trim() : '';
          matchObjTemp.fighters.redFighter.name = values[3] !== undefined ? String(values[3]).trim() : '';
          matchObjTemp.fighters.redFighter.result = values[3] && String(values[3]).includes("W.") ? String(values[3]).trim() : '';
          matchObjTemp.fighters.redFighter.code = values[4] !== undefined ? String(values[4]).trim() : '';
          matchObjTemp.fighters.redFighter.country = values[5] !== undefined ? String(values[5]).trim() : '';
          matchObjTemp.fighters.blueFighter.name = values[6] !== undefined ? String(values[6]).trim() : '';
          matchObjTemp.fighters.blueFighter.result = values[6] && String(values[6]).includes("W.") ? String(values[6]).trim() : '';
          matchObjTemp.fighters.blueFighter.code = values[7] !== undefined ? String(values[7]).trim() : '';
          matchObjTemp.fighters.blueFighter.country = values[8] !== undefined ? String(values[8]).trim() : '';
          this.combatObj!.combat.push(matchObjTemp);
          this.combatStandardArray.push([
            values[0] !== undefined ? values[0] : '',
            values[1] !== undefined ? String(values[1]).trim() : '',
            values[2] !== undefined ? String(values[2]).trim() : '',
            values[3] !== undefined ? String(values[3]).trim() : '',
            values[4] !== undefined ? String(values[4]).trim() : '',
            values[5] !== undefined ? String(values[5]).trim() : '',
            values[6] !== undefined ? String(values[6]).trim() : '',
            values[7] !== undefined ? String(values[7]).trim() : '',
            values[8] !== undefined ? String(values[8]).trim() : '',
          ]);
        }
      }

      this.combatArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
      this.setState({ data: this.combatStandardArray });
    };
    reader.readAsArrayBuffer(file);
    console.log("handleimportCombatStandFile End");
  }

  importCombatStandard = () => {
    console.log("importCombatStandard Start");
    if (this.combatObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.combatObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
      });
    }
    console.log("importCombatStandard End");
  }

  importMartialStandard = () => {
    console.log("importMartialStandard Start");
    if (this.martialObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.martialObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
      });
    }
    console.log("importMartialStandard End");
  }

  showPasswordModal = () => {
    this.setState({ showPasswordModal: true });
  };
  hidePasswordModal = () => {
    this.setState({ showPasswordModal: false });
  };
  showChooseArenaNoModal = () => {
    this.setState({ showChooseArenaNoModal: true });
  };
  hideChooseInfoNoModal = () => {
    this.setState({ showChooseArenaNoModal: false });
  };

  render() {
    const { showPasswordModal, showChooseArenaNoModal, password, tournamentName } = this.state;

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
                  <i className="fas fa-file-upload text-white text-sm"></i>
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-800">Tạo giải đấu</h1>
                  {tournamentName && (
                    <p className="text-xs text-violet-600 whitespace-pre-line break-words max-w-[250px] leading-tight">{tournamentName}</p>
                  )}
                </div>
              </div>
                            <div className="flex items-center gap-3">
                <a 
                  href="/" 
                  title="Về Trang chủ" 
                  className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-violet-500 hover:to-purple-600 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all group"
                >
                  <i className="fa-solid fa-home text-slate-500 group-hover:text-white text-sm"></i>
                </a>
                <img src={logo} alt="Logo" className="h-8 opacity-70" />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {/* Section 1: Sắp xếp Đối Kháng */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-sort"></i>
                Sắp xếp thông tin Đối Kháng
              </h2>
              <p className="text-emerald-100 text-sm mt-1">Sắp xếp và bốc thăm ngẫu nhiên dựa vào danh sách đăng ký</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <a href={mauthodoikhang} download="3-Mau_Tho_Doi_Khang" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-violet-500 text-violet-600 rounded-xl font-medium hover:bg-violet-50 transition-colors">
                  <i className="fa-solid fa-file-download"></i> Mẫu 3
                </a>
                <label className="flex-1 min-w-[200px]">
                  <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-medium file:bg-violet-50 file:text-violet-600 hover:file:bg-violet-100 cursor-pointer" 
                    onChange={this.handleimportCombatRawFile} />
                </label>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors" onClick={this.grouping}>
                  <i className="fas fa-sort-amount-down"></i> Nhóm hạng cân
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors" onClick={this.shuffle}>
                  <i className="fa-solid fa-shuffle"></i> Xáo trộn
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors" onClick={this.downloadCombatOrigin}>
                  <i className="fa-solid fa-file-download"></i> Download
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {this.combatArrangeHeader && this.combatArrangeHeader.map((header) => 
                        <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600 border-b">{header}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {this.combatStandardArray && this.combatStandardArray.length > 0 ? this.combatStandardArray.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : null}
                    {this.combatArrayRaw && this.combatArrayRaw.length > 0 ? this.combatArrayRaw.map((row, i) => (
                      <tr key={`raw-${i}`} className="border-b hover:bg-slate-50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : null}
                    {(!this.combatStandardArray || this.combatStandardArray.length === 0) && (!this.combatArrayRaw || this.combatArrayRaw.length === 0) && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Không có dữ liệu hiển thị</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Nhập Đối Kháng */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-hand-fist"></i>
                Nhập thông tin Đối Kháng
              </h2>
              <p className="text-emerald-100 text-sm mt-1">Tạo giải đấu đối kháng với danh sách VĐV và hạng cân đã sắp xếp</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <a href={mauthodoikhang} download="3-Mau_Tho_Doi_Khang" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-500 text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors">
                  <i className="fa-solid fa-file-download"></i> Mẫu 3
                </a>
                <label className="flex-1 min-w-[200px]">
                  <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-medium file:bg-emerald-50 file:text-emerald-600 hover:file:bg-emerald-100 cursor-pointer" 
                    onChange={this.handleimportCombatRawFile} />
                </label>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md" onClick={this.importCombat}>
                  <i className="fa-solid fa-file-import"></i> Khởi tạo
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors" onClick={this.downloadCombat}>
                  <i className="fa-solid fa-file-download"></i> Download
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-50">
                    <tr>
                      {this.combatArrangeHeader && this.combatArrangeHeader.map((header) => 
                        <th key={header} className="px-4 py-3 text-left font-semibold text-emerald-700 border-b">{header}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {this.combatStandardArray && this.combatStandardArray.length > 0 ? this.combatStandardArray.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-emerald-50/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : null}
                    {this.combatArrayRaw && this.combatArrayRaw.length > 0 ? this.combatArrayRaw.map((row, i) => (
                      <tr key={`raw-${i}`} className="border-b hover:bg-emerald-50/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : null}
                    {(!this.combatStandardArray || this.combatStandardArray.length === 0) && (!this.combatArrayRaw || this.combatArrayRaw.length === 0) && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Không có dữ liệu hiển thị</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Nhập Thi Quyền */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-person-running"></i>
                Nhập thông tin Thi Quyền
              </h2>
              <p className="text-amber-100 text-sm mt-1">Tạo giải đấu thi quyền với danh sách VĐV theo từng nội dung</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <a href={mauthothiquyen} download="4-Mau_Tho_Thi_Quyen" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-amber-500 text-amber-600 rounded-xl font-medium hover:bg-amber-50 transition-colors">
                  <i className="fa-solid fa-file-download"></i> Mẫu 4
                </a>
                <label className="flex-1 min-w-[200px]">
                  <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-medium file:bg-amber-50 file:text-amber-600 hover:file:bg-amber-100 cursor-pointer" 
                    onChange={this.handleimportMartialRawFile} />
                </label>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md" onClick={this.importMartial}>
                  <i className="fa-solid fa-file-import"></i> Khởi tạo
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors" onClick={this.downloadMartial}>
                  <i className="fa-solid fa-file-download"></i> Download
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50">
                    <tr>
                      {this.martialArrangeHeader && this.martialArrangeHeader.map((header) => 
                        <th key={header} className="px-4 py-3 text-left font-semibold text-amber-700 border-b">{header}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {this.martialStandardArray && this.martialStandardArray.length > 0 ? this.martialStandardArray.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-amber-50/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : null}
                    {this.martialArrayRaw && this.martialArrayRaw.length > 0 ? this.martialArrayRaw.map((row, i) => (
                      <tr key={`raw-${i}`} className="border-b hover:bg-amber-50/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : null}
                    {(!this.martialStandardArray || this.martialStandardArray.length === 0) && (!this.martialArrayRaw || this.martialArrayRaw.length === 0) && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Không có dữ liệu hiển thị</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4: Đối Kháng CHUẨN */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-check-double"></i>
                Nhập thông tin Đối Kháng CHUẨN
              </h2>
              <p className="text-blue-100 text-sm mt-1">Tạo giải với thông tin đã được chuẩn hoá theo từng cặp đấu cố định</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <a href={mauchuandoikhang} download="1-Mau_Chuan_Doi_Khang" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors">
                  <i className="fa-solid fa-file-download"></i> Mẫu 1
                </a>
                <label className="flex-1 min-w-[200px]">
                  <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" 
                    onChange={this.handleimportCombatStandFile} />
                </label>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md" onClick={this.importCombatStandard}>
                  <i className="fa-solid fa-file-import"></i> Khởi tạo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      {this.tournamentImportHeader && this.tournamentImportHeader.map((header) => 
                        <th key={header} className="px-4 py-3 text-left font-semibold text-blue-700 border-b">{header}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {this.combatStandardArray && this.combatStandardArray.length > 0 ? this.combatStandardArray.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-blue-50/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 italic">Không có dữ liệu hiển thị</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 5: Thi Quyền CHUẨN */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-check-double"></i>
                Nhập thông tin Thi Quyền CHUẨN
              </h2>
              <p className="text-purple-100 text-sm mt-1">Tạo giải với thông tin đã được chuẩn hoá theo từng trận đấu cố định</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <a href={mauchuanthiquyen} download="2-Mau_Chuan_Thi_Quyen" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-purple-500 text-purple-600 rounded-xl font-medium hover:bg-purple-50 transition-colors">
                  <i className="fa-solid fa-file-download"></i> Mẫu 2
                </a>
                <label className="flex-1 min-w-[200px]">
                  <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100 cursor-pointer" 
                    onChange={this.handleimportMartialStandardFile} />
                </label>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md" onClick={this.importMartialStandard}>
                  <i className="fa-solid fa-file-import"></i> Khởi tạo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-purple-50">
                    <tr>
                      {this.combatArrangeHeader && this.combatArrangeHeader.map((header) => 
                        <th key={header} className="px-4 py-3 text-left font-semibold text-purple-700 border-b">{header}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {this.martialStandardArray && this.martialStandardArray.length > 0 ? this.martialStandardArray.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-purple-50/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    )) : (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 italic">Không có dữ liệu hiển thị</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-8 pb-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm border-t border-slate-200 pt-6">
              <NavLink to="/" className="text-slate-500 hover:text-blue-600 transition-colors">
                <i className="fa-solid fa-home mr-1"></i> Home
              </NavLink>
              <NavLink to="giam-sat-doi-khang" className="text-slate-500 hover:text-emerald-600 transition-colors">Giám sát đối kháng</NavLink>
              <NavLink to="giam-dinh-doi-khang" className="text-slate-500 hover:text-emerald-600 transition-colors">Giám định đối kháng</NavLink>
              <NavLink to="giam-sat-thi-quyen" className="text-slate-500 hover:text-amber-600 transition-colors">Giám sát thi quyền</NavLink>
              <NavLink to="giam-dinh-thi-quyen" className="text-slate-500 hover:text-amber-600 transition-colors">Giám định thi quyền</NavLink>
              <NavLink to="thong-tin-doi-khang" className="text-slate-500 hover:text-blue-600 transition-colors">Thông tin đối kháng</NavLink>
            </div>
            <p className="text-center text-slate-400 text-sm mt-4">©Tuân 2022</p>
          </footer>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-lock"></i>
                    Vui lòng nhập mật khẩu
                  </h5>
                  <button onClick={this.hidePasswordModal} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 relative">
                    <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="••••••" value={password} readOnly />
                  </div>
                  <button onClick={() => this.inputPw('-1')} className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {['1','2','3','4','5'].map(num => (
                    <button key={num} onClick={() => this.inputPw(num)} className="p-4 text-xl font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{num}</button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {['6','7','8','9','0'].map(num => (
                    <button key={num} onClick={() => this.inputPw(num)} className="p-4 text-xl font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{num}</button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={this.hidePasswordModal} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors">Hủy</button>
                <button onClick={this.verifyPassword} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-colors shadow-lg">Xác nhận</button>
              </div>
            </div>
          </div>
        )}

        {/* Choose Arena Modal */}
        {showChooseArenaNoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-id-badge"></i>
                    Chọn thông tin
                  </h5>
                  <button onClick={this.hideChooseInfoNoModal} className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <h6 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Chọn giải đấu</h6>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                    <label key={i} onClick={() => this.chooseTournament(i)}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-colors">
                      <input type="radio" name="tournamentRadio" id={`tournamentRadio-${tournament[0]}`} value={tournament[1]} defaultChecked={i === 0} className="w-4 h-4 text-violet-500" />
                      <span className="font-medium text-slate-700">{tournament[1]}</span>
                    </label>
                  )) : (
                    <p className="text-slate-400 italic">Không có giải đấu</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={this.hideChooseInfoNoModal} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors">Hủy</button>
                <button onClick={this.chooseInfoNo} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-colors shadow-lg">Xác nhận</button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    );
  }
}

export default CreateTournamentContainer;
