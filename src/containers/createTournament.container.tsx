import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, onValue, Database } from "firebase/database";
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
  // UI State
  collapsedSections: {[key: string]: boolean};
  isLoading: boolean;
  loadingMessage: string;
  showConfirmModal: boolean;
  confirmAction: (() => void) | null;
  confirmMessage: string;
  confirmTitle: string;
  dragOver: string | null;
  tournamentsLoading: boolean; // Đang load danh sách giải đấu
  tournamentCreated: boolean; // Đã tạo giải đấu (lưu Firebase) hay chưa
  // Wizard State
  wizardType: 'doikhang' | 'thiquyen';
  wizardStep: number;
  wizardImportType: 'raw' | 'standard'; // Kiểu import: file thô hoặc file chuẩn
  // Wizard Data
  wizardDkSeeding: {[key: string]: number}; // key = "weight-index", value = seed number (1, 2)
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
  // true: martialStandardArray đọc trực tiếp từ file chuẩn (4 cột: STT, Tên, Code, Quốc gia)
  // false: do arrangeMartial sinh ra từ file thô (5 cột: STT, Nội dung, Tên, Code, Quốc gia)
  martialStandardFromFile = false;
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
      "referee": [{ "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }, { "blueScore": 0, "redScore": 0 }]
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
      // UI State
      collapsedSections: {},
      isLoading: false,
      loadingMessage: '',
      showConfirmModal: false,
      confirmAction: null,
      confirmMessage: '',
      confirmTitle: '',
      dragOver: null,
      tournamentsLoading: true, // Mặc định đang load
      tournamentCreated: false,
      // Wizard State
      wizardType: 'doikhang',
      wizardStep: 1,
      wizardImportType: 'raw',
      // Wizard Data
      wizardDkSeeding: {},
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
    this.schemaFighters.push('[{"match":1,"weight":1,"type":"Vòng loại-1","redFighter":{"name":2,"code":"","country":"","result":""},"blueFighter":{"name":3,"code":"","country":"","result":""}},{"match":2,"weight":1,"type":"Vòng loại-1","redFighter":{"name":4,"code":"","country":"","result":""},"blueFighter":{"name":5,"code":"","country":"","result":""}},{"match":3,"weight":1,"type":"Vòng loại-1","redFighter":{"name":8,"code":"","country":"","result":""},"blueFighter":{"name":9,"code":"","country":"","result":""}},{"match":4,"weight":1,"type":"Vòng loại-1","redFighter":{"name":10,"code":"","country":"","result":""},"blueFighter":{"name":11,"code":"","country":"","result":""}},{"match":5,"weight":1,"type":"Vòng loại-2","redFighter":{"name":1,"code":"","country":"","result":""},"blueFighter":{"name":"W.1","code":"","country":"","result":"W.1"}},{"match":6,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.2","code":"","country":"","result":"W.2"},"blueFighter":{"name":6,"code":"","country":"","result":""}},{"match":7,"weight":1,"type":"Vòng loại-2","redFighter":{"name":7,"code":"","country":"","result":""},"blueFighter":{"name":"W.3","code":"","country":"","result":"W.3"}},{"match":8,"weight":1,"type":"Vòng loại-2","redFighter":{"name":"W.4","code":"","country":"","result":"W.4"},"blueFighter":{"name":12,"code":"","country":"","result":""}},{"match":9,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.5","code":"","country":"","result":"W.5"},"blueFighter":{"name":"W.6","code":"","country":"","result":"W.6"}},{"match":10,"weight":1,"type":"Bán Kết","redFighter":{"name":"W.7","code":"","country":"","result":"W.7"},"blueFighter":{"name":"W.8","code":"","country":"","result":"W.8"}},{"match":11,"weight":1,"type":"Chung Kết","redFighter":{"name":"W.9","code":"","country":"","result":"W.9"},"blueFighter":{"name":"W.10","code":"","country":"","result":"W.10"}}]');//12
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
    this.setState({ tournamentsLoading: true });
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournaments = [];

      if (this.tournamentObj) {
        for (let i = 0; i < this.tournamentObj.length; i++) {
          this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
        }
      }
      this.setState({ data: this.tournaments, tournamentsLoading: false });
    }).catch(() => {
      this.setState({ tournamentsLoading: false });
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
    // Chỉ arrange nếu chưa arrange
    if (!this.combatStandardArray?.length) {
      this.arrangeCombat();
    }
    if (!this.combatObj?.combat?.length) {
      toast.error("Chưa có dữ liệu Đối Kháng để tạo giải. Vui lòng import file ở Bước 2.");
      return;
    }
    if (this.combatObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.combatObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
        this.setState({ tournamentCreated: true }); // Mark as created
      });
    }
  }

  downloadCombat = () => {
    this.combatArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    this.exportExcel(this.combatArrangeHeader, this.state.data, "Thong tin DOI KHANG");
  }

  downloadCombatOrigin = () => {
    this.combatArrangeHeader = ["STT", "HẠNG CÂN", "TÊN VẬN ĐỘNG VIÊN", "CODE/ĐƠN VỊ", "QUỐC GIA"];
    this.exportExcel(this.combatArrangeHeader, this.state.data, "Thong tin DOI KHANG");
  }

  importMartial = () => {
    // Chỉ arrange nếu chưa arrange
    if (!this.martialStandardArray?.length) {
      this.arrangeMartial();
    }
    if (!this.martialObj?.martial?.length) {
      toast.error("Chưa có dữ liệu Thi Quyền để tạo giải. Vui lòng import file ở Bước 2.");
      return;
    }
    if (this.martialObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.martialObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
        this.setState({ tournamentCreated: true }); // Mark as created
      });
    }
  }

  // Đọc sheet 'data' của file Excel. Mọi lỗi đều báo bằng toast thay vì chết im lặng trong reader.onload
  readDataSheet = (file: File, onRows: (rows: any[][]) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const worksheet = workbook.Sheets['data'];
        if (!worksheet) {
          toast.error(`File thiếu sheet tên "data". Sheet đang có: ${workbook.SheetNames.join(', ') || '(không có)'}`);
          return;
        }
        onRows(utils.sheet_to_json(worksheet, { header: 1 }) as any[][]);
      } catch (err: any) {
        toast.error('Không đọc được file Excel: ' + (err?.message || err));
      }
    };
    reader.onerror = () => toast.error('Không đọc được file.');
    reader.readAsArrayBuffer(file);
  }

  handleimportCombatRawFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    this.readDataSheet(file, (excelData) => {
      this.combatArrayRaw = [];
      // File mới => bỏ lịch đã sắp trước đó, nếu không sẽ ghi đè bằng dữ liệu cũ
      this.combatStandardArray = [];
      this.combatObj = null;
      this.matchs = [];
      this.setState({ wizardDkSeeding: {}, tournamentCreated: false });

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
    });
  }

  shuffle = () => {
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
  }

  grouping = () => {
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
  }

  arrangeCombat = () => {

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

  }

  // Wizard version - sắp lịch mà không reset combatArrayRaw và không setState về data
  arrangeCombatForWizard = () => {
    if (!this.combatArrayRaw || this.combatArrayRaw.length === 0) return;

    // Lưu lại bản copy của combatArrayRaw
    const combatArrayRawBackup = JSON.parse(JSON.stringify(this.combatArrayRaw));

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

    // Áp dụng hạt giống: đưa seed #1 lên đầu, seed #2 xuống cuối mỗi hạng cân
    const { wizardDkSeeding } = this.state;
    for (const [weight, fighters] of groupedData.entries()) {
      const seedKeys = Object.keys(wizardDkSeeding).filter(k => k.startsWith(`${weight}-`));
      if (seedKeys.length > 0) {
        let seed1Index = -1;
        let seed2Index = -1;
        
        fighters.forEach((_, i) => {
          const key = this.getSeedingKey(weight, i);
          if (wizardDkSeeding[key] === 1) seed1Index = i;
          if (wizardDkSeeding[key] === 2) seed2Index = i;
        });
        
        // Đưa seed #1 lên đầu
        if (seed1Index > 0) {
          const seed1 = fighters.splice(seed1Index, 1)[0];
          fighters.unshift(seed1);
          if (seed2Index > seed1Index) seed2Index--;
        }
        
        // Đưa seed #2 xuống cuối
        if (seed2Index !== -1 && seed2Index < fighters.length - 1) {
          const seed2 = fighters.splice(seed2Index, 1)[0];
          fighters.push(seed2);
        }
      }
    }

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

    // Khôi phục combatArrayRaw
    this.combatArrayRaw = combatArrayRawBackup;
    this.combatArrangeHeader = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    
    // forceUpdate thay vì setState để không reset wizard
    this.forceUpdate();

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
    const file = event.target.files?.[0];
    if (!file) return;

    this.readDataSheet(file, (excelData) => {
      this.martialArrayRaw = [];
      // File mới => bỏ lịch đã sắp trước đó, nếu không sẽ ghi đè bằng dữ liệu cũ
      this.martialStandardArray = [];
      this.martialStandardFromFile = false;
      this.martialObj = null;
      this.setState({ tournamentCreated: false });

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
    });
  }

  arrangeMartial = () => {

    this.martialObj = JSON.parse(JSON.stringify(this.martialConst));
    let matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj)) as MatchMartialObj;
    let fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj)) as FighterMartialObj;
    let fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj)) as FightersMartialObj;
    this.martialStandardArray = [];
    this.martialStandardFromFile = false;

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
    this.martialArrangeHeader = ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.setState({ data: this.martialStandardArray });

  }

  downloadMartial = () => {
    this.martialArrangeHeader = this.martialStandardFromFile
      ? ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA']
      : ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.exportExcel(this.martialArrangeHeader, this.state.data, "Thong tin THI QUYEN");
  }

  inputPw = (value: string) => {
    if (value === "-1") {
      this.setState({ password: '' });
    } else {
      this.setState(prevState => ({ password: prevState.password + value }));
    }
  }

  // Ô trống trong Excel là undefined => String(undefined) sẽ ra chuỗi "undefined" ghi thẳng vào DB
  cell = (value: any) => (value !== undefined && value !== null ? String(value).trim() : '')

  // Dòng tên nội dung: cột A là chữ (không phải số thứ tự) và cột B trống.
  // Không dùng values.length === 1 vì Excel có thể để lại ô trống ở B/C/D làm dòng dài hơn 1.
  isMartialContentRow = (values: any[]) => {
    const first = this.cell(values[0]);
    return first !== '' && isNaN(parseFloat(first)) && this.cell(values[1]) === '';
  }

  handleimportMartialStandardFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    this.readDataSheet(file, (excelData) => {
      this.martialObj = JSON.parse(JSON.stringify(this.martialConst));
      this.martialStandardArray = [];
      this.martialStandardFromFile = true;
      // File mới => bỏ dữ liệu file thô cũ và cho phép tạo giải lại
      this.martialArrayRaw = [];
      this.setState({ tournamentCreated: false });

      let orphanFighters = 0;

      // Đảm bảo luôn có nội dung để gắn VĐV vào, kể cả khi file thiếu dòng tên nội dung đầu tiên
      const currentMatch = (): MatchMartialObj => {
        if (this.martialObj!.martial.length === 0) {
          const implicitMatch = JSON.parse(JSON.stringify(this.matchMartialObj)) as MatchMartialObj;
          implicitMatch.match.name = 'Nội dung chưa đặt tên';
          this.martialObj!.martial.push(implicitMatch);
          this.martialStandardArray.push([implicitMatch.match.name, '', '', '']);
          orphanFighters++;
        }
        return this.martialObj!.martial[this.martialObj!.martial.length - 1];
      };

      const makeFighter = (values: any[]): FighterMartialObj => {
        const fighter = JSON.parse(JSON.stringify(this.fighterMartialObj)) as FighterMartialObj;
        fighter.fighter.name = this.cell(values[1]);
        fighter.fighter.code = this.cell(values[2]);
        fighter.fighter.country = this.cell(values[3]);
        return fighter;
      };

      for (let i = 0; i < excelData.length; i++) {
        const values = excelData[i];
        if (values.length === 0) continue;

        if (this.isMartialContentRow(values)) {
          const matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj)) as MatchMartialObj;
          matchMartialObjTemp.match.name = this.cell(values[0]);
          this.martialObj!.martial.push(matchMartialObjTemp);
          this.martialStandardArray.push([matchMartialObjTemp.match.name, '', '', '']);
        } else if (!isNaN(parseFloat(values[0]))) {
          // Dòng có STT => mở một lượt biểu diễn mới
          const fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj)) as FightersMartialObj;
          fightersMartialObjTemp.no = values[0];
          fightersMartialObjTemp.fighters.push(makeFighter(values));
          currentMatch().team.push(fightersMartialObjTemp);
          this.martialStandardArray.push([values[0], this.cell(values[1]), this.cell(values[2]), this.cell(values[3])]);
        } else if (this.cell(values[0]) === '' && this.cell(values[1]) !== '') {
          // Dòng không có STT => VĐV tiếp theo của lượt đồng đội phía trên
          const match = currentMatch();
          if (match.team.length === 0) {
            const fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj)) as FightersMartialObj;
            fightersMartialObjTemp.no = 1;
            match.team.push(fightersMartialObjTemp);
            orphanFighters++;
          }
          match.team[match.team.length - 1].fighters.push(makeFighter(values));
          this.martialStandardArray.push(['', this.cell(values[1]), this.cell(values[2]), this.cell(values[3])]);
        }
        // Còn lại là dòng tiêu đề cột (STT / HỌ VÀ TÊN / ...) hoặc dòng rác => bỏ qua
      }

      const totalFighters = this.martialObj!.martial.reduce(
        (sum, m) => sum + (m.team || []).reduce((s, t) => s + t.fighters.length, 0), 0);

      if (totalFighters === 0) {
        toast.error('Không đọc được VĐV nào từ file. Kiểm tra lại định dạng: cột A = STT, B = Họ tên, C = MSSV/Đơn vị, D = Quốc gia.');
        this.martialObj = null;
        this.martialStandardArray = [];
        this.martialStandardFromFile = false;
      } else {
        if (orphanFighters > 0) {
          toast.warn('File thiếu dòng tên nội dung ở một số chỗ, hệ thống đã tự gom vào "Nội dung chưa đặt tên".');
        }
        toast.success(`Đã đọc ${this.martialObj!.martial.length} nội dung / ${totalFighters} VĐV.`);
      }

      this.martialArrangeHeader = ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
      this.setState({ data: this.martialStandardArray });
    });
  }

  handleimportCombatStandFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.combatObj = JSON.parse(JSON.stringify(this.combatConst));

    const file = event.target.files?.[0];
    if (!file) return;

    this.readDataSheet(file, (excelData) => {
      this.combatStandardArray = [];
      this.setState({ tournamentCreated: false });

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
    });
  }

  importCombatStandard = () => {
    if (this.combatObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.combatObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
      });
    }
  }

  importMartialStandard = () => {
    if (this.martialObj) {
      update(ref(this.db, 'tournament/' + this.tournamentNoIndex + '/'), this.martialObj as any).then(() => {
        toast.success("Cập nhập thông tin giải đấu thành công!");
      });
    }
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

  // UI Helper Functions
  toggleSection = (sectionKey: string) => {
    this.setState(prevState => ({
      collapsedSections: {
        ...prevState.collapsedSections,
        [sectionKey]: !prevState.collapsedSections[sectionKey]
      }
    }));
  };

  isSectionCollapsed = (sectionKey: string) => {
    return this.state.collapsedSections[sectionKey] || false;
  };

  setLoading = (isLoading: boolean, message: string = '') => {
    this.setState({ isLoading, loadingMessage: message });
  };

  showConfirm = (title: string, message: string, action: () => void) => {
    this.setState({
      showConfirmModal: true,
      confirmTitle: title,
      confirmMessage: message,
      confirmAction: action
    });
  };

  hideConfirm = () => {
    this.setState({
      showConfirmModal: false,
      confirmAction: null,
      confirmMessage: '',
      confirmTitle: ''
    });
  };

  handleConfirm = () => {
    const { confirmAction } = this.state;
    if (confirmAction) {
      confirmAction();
    }
    this.hideConfirm();
  };

  handleDragOver = (e: React.DragEvent, sectionKey: string) => {
    e.preventDefault();
    this.setState({ dragOver: sectionKey });
  };

  handleDragLeave = () => {
    this.setState({ dragOver: null });
  };

  handleDrop = (e: React.DragEvent, handler: (e: any) => void, sectionKey: string) => {
    e.preventDefault();
    this.setState({ dragOver: null });
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = { target: { files } };
      handler(fakeEvent as any);
    }
  };

  // Wrapped import functions with confirmation
  confirmImportCombat = () => {
    this.showConfirm(
      'Khởi tạo Đối Kháng',
      'Việc này sẽ ghi đè toàn bộ thông tin Đối Kháng hiện có. Bạn có chắc chắn muốn tiếp tục?',
      () => {
        this.setLoading(true, 'Đang khởi tạo Đối Kháng...');
        setTimeout(() => {
          this.importCombat();
          this.setLoading(false);
        }, 500);
      }
    );
  };

  confirmImportMartial = () => {
    this.showConfirm(
      'Khởi tạo Thi Quyền',
      'Việc này sẽ ghi đè toàn bộ thông tin Thi Quyền hiện có. Bạn có chắc chắn muốn tiếp tục?',
      () => {
        this.setLoading(true, 'Đang khởi tạo Thi Quyền...');
        setTimeout(() => {
          this.importMartial();
          this.setLoading(false);
        }, 500);
      }
    );
  };

  confirmImportCombatStandard = () => {
    this.showConfirm(
      'Khởi tạo Đối Kháng Chuẩn',
      'Việc này sẽ ghi đè toàn bộ thông tin Đối Kháng hiện có. Bạn có chắc chắn muốn tiếp tục?',
      () => {
        this.setLoading(true, 'Đang khởi tạo Đối Kháng Chuẩn...');
        setTimeout(() => {
          this.importCombatStandard();
          this.setLoading(false);
        }, 500);
      }
    );
  };

  confirmImportMartialStandard = () => {
    this.showConfirm(
      'Khởi tạo Thi Quyền Chuẩn',
      'Việc này sẽ ghi đè toàn bộ thông tin Thi Quyền hiện có. Bạn có chắc chắn muốn tiếp tục?',
      () => {
        this.setLoading(true, 'Đang khởi tạo Thi Quyền Chuẩn...');
        setTimeout(() => {
          this.importMartialStandard();
          this.setLoading(false);
        }, 500);
      }
    );
  };

  // Wizard Navigation
  setWizardStep = (step: number) => {
    this.setState({ wizardStep: step });
  };

  nextWizardStep = () => {
    const { wizardStep, wizardType } = this.state;
    const maxStep = wizardType === 'doikhang' ? 4 : 4; // Cả 2 loại đều có 4 bước
    if (wizardStep < maxStep) {
      this.setState({ wizardStep: wizardStep + 1 });
    }
  };

  prevWizardStep = () => {
    const { wizardStep } = this.state;
    if (wizardStep > 1) {
      this.setState({ wizardStep: wizardStep - 1 });
    }
  };

  setWizardType = (type: 'doikhang' | 'thiquyen') => {
    this.setState({ wizardType: type, wizardStep: 1 });
  };

  // Seeding functions
  getSeedingKey = (weight: string, index: number) => `${weight}-${index}`;

  // Logic mới: Tối đa 2 sao mỗi hạng cân, chọn sao thứ 3 → sao cũ nhất mất
  toggleSeed = (weight: string, index: number) => {
    const key = this.getSeedingKey(weight, index);
    const { wizardDkSeeding } = this.state;
    const newSeeding = { ...wizardDkSeeding };
    
    // Nếu đã được đánh dấu → bỏ đánh dấu
    if (newSeeding[key]) {
      delete newSeeding[key];
    } else {
      // Tìm tất cả sao trong hạng cân này (theo thứ tự được chọn)
      const sameWeightKeys = Object.keys(newSeeding)
        .filter(k => k.startsWith(`${weight}-`))
        .sort((a, b) => {
          // Sắp xếp theo seed number (1 trước 2)
          return (newSeeding[a] || 0) - (newSeeding[b] || 0);
        });
      
      // Nếu đã có 2 sao → xóa sao cũ nhất (seed #1) trước khi thêm
      if (sameWeightKeys.length >= 2) {
        const oldestKey = sameWeightKeys[0]; // seed #1 là cũ nhất
        delete newSeeding[oldestKey];
        // Đổi seed #2 thành seed #1
        const secondKey = sameWeightKeys[1];
        newSeeding[secondKey] = 1;
      }
      
      // Thêm sao mới
      const currentSeedCount = Object.keys(newSeeding).filter(k => k.startsWith(`${weight}-`)).length;
      newSeeding[key] = currentSeedCount === 0 ? 1 : 2;
    }
    
    this.setState({ wizardDkSeeding: newSeeding });
  };

  // Wizard Step Definitions
  getWizardSteps = () => {
    const { wizardType } = this.state;
    if (wizardType === 'doikhang') {
      return [
        { step: 1, title: 'Thông tin giải', icon: 'fa-info-circle', description: 'Nhập thông tin cơ bản của giải đấu' },
        { step: 2, title: 'Import VĐV', icon: 'fa-users', description: 'Upload danh sách vận động viên theo hạng cân' },
        { step: 3, title: 'Sắp xếp thứ tự', icon: 'fa-sitemap', description: 'Sắp xếp và bốc thăm thứ tự thi đấu' },
        { step: 4, title: 'Xác nhận', icon: 'fa-check-circle', description: 'Xem lại và tạo giải đấu' },
      ];
    } else {
      return [
        { step: 1, title: 'Thông tin giải', icon: 'fa-info-circle', description: 'Nhập thông tin cơ bản của giải đấu' },
        { step: 2, title: 'Import VĐV', icon: 'fa-users', description: 'Upload danh sách VĐV theo nội dung thi quyền' },
        { step: 3, title: 'Sắp xếp thứ tự', icon: 'fa-sitemap', description: 'Sắp xếp thứ tự biểu diễn của VĐV' },
        { step: 4, title: 'Xác nhận', icon: 'fa-check-circle', description: 'Xem lại và tạo giải đấu' },
      ];
    }
  };

  // Render Wizard Mode
  renderWizardMode = () => {
    const { wizardType, wizardStep } = this.state;
    const steps = this.getWizardSteps();

    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Type Selector */}
        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => this.setWizardType('doikhang')}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-medium transition-all ${
              wizardType === 'doikhang' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg scale-105' 
                : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <i className="fa-solid fa-hand-fist text-xl"></i>
            <span>Đối Kháng</span>
          </button>
          <button 
            onClick={() => this.setWizardType('thiquyen')}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-medium transition-all ${
              wizardType === 'thiquyen' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg scale-105' 
                : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-amber-300'
            }`}
          >
            <i className="fa-solid fa-person-running text-xl"></i>
            <span>Thi Quyền</span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s.step}>
              <div 
                onClick={() => s.step <= wizardStep && this.setWizardStep(s.step)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  wizardStep === s.step 
                    ? wizardType === 'doikhang' 
                      ? 'bg-emerald-500 text-white shadow-lg' 
                      : 'bg-amber-500 text-white shadow-lg'
                    : wizardStep > s.step
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  wizardStep > s.step ? 'bg-green-500 text-white' : ''
                }`}>
                  {wizardStep > s.step ? <i className="fa-solid fa-check text-xs"></i> : s.step}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${wizardStep > s.step ? 'bg-green-500' : 'bg-slate-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Step Header */}
          <div className={`px-6 py-4 ${wizardType === 'doikhang' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className={`fa-solid ${steps[wizardStep - 1]?.icon} text-white text-lg`}></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Bước {wizardStep}: {steps[wizardStep - 1]?.title}
                </h2>
                <p className="text-white/80 text-sm">{steps[wizardStep - 1]?.description}</p>
              </div>
            </div>
          </div>

          {/* Step Body */}
          <div className="p-6">
            {this.renderWizardStepContent()}
          </div>

          {/* Step Footer */}
          <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button 
              onClick={this.prevWizardStep}
              disabled={wizardStep === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                wizardStep === 1 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className="fa-solid fa-arrow-left"></i>
              Quay lại
            </button>
            
            <div className="text-sm text-slate-500">
              Bước {wizardStep} / {steps.length}
            </div>

            {wizardStep < steps.length ? (
              <button 
                onClick={this.nextWizardStep}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-white transition-all ${
                  wizardType === 'doikhang' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                } shadow-lg`}
              >
                Tiếp tục
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            ) : this.state.tournamentCreated ? (
              <div className="flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-emerald-600 bg-emerald-100">
                <i className="fa-solid fa-check-circle"></i>
                Đã tạo giải
              </div>
            ) : (
              <button 
                onClick={() => wizardType === 'doikhang' ? this.confirmImportCombat() : this.confirmImportMartial()}
                className="flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg transition-all"
              >
                <i className="fa-solid fa-rocket"></i>
                Tạo giải đấu
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  renderWizardStepContent = () => {
    const { wizardType, wizardStep } = this.state;

    if (wizardType === 'doikhang') {
      switch (wizardStep) {
        case 1: return this.renderDkStep1();
        case 2: return this.renderDkStep2();
        case 3: return this.renderDkStep3();
        case 4: return this.renderDkStep4();
        default: return null;
      }
    } else {
      switch (wizardStep) {
        case 1: return this.renderTqStep1();
        case 2: return this.renderTqStep2();
        case 3: return this.renderTqStep3();
        case 4: return this.renderTqStep4();
        default: return null;
      }
    }
  };

  // Wizard: Set import type
  setWizardImportType = (type: 'raw' | 'standard') => {
    this.setState({ wizardImportType: type });
  };

  // Đối Kháng Steps
  renderDkStep1 = () => {
    const { wizardImportType } = this.state;
    
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-lightbulb text-emerald-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-emerald-800">Chọn kiểu nhập liệu</h4>
              <p className="text-sm text-emerald-700 mt-1">
                Bạn có 2 lựa chọn để nhập thông tin VĐV: Từ file danh sách đăng ký (thô) hoặc từ file đã sắp lịch sẵn (chuẩn).
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* File thô */}
          <button
            onClick={() => this.setWizardImportType('raw')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              wizardImportType === 'raw'
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                wizardImportType === 'raw' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-file-lines text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File thô</h3>
                <p className="text-sm text-slate-500">
                  Nhập danh sách VĐV đăng ký, hệ thống sẽ tự động sắp xếp và bốc thăm.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">STT</span>
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">Hạng cân</span>
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">Tên VĐV</span>
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">Đơn vị</span>
                </div>
              </div>
              {wizardImportType === 'raw' && (
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>

          {/* File chuẩn */}
          <button
            onClick={() => this.setWizardImportType('standard')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              wizardImportType === 'standard'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                wizardImportType === 'standard' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-table-cells text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File chuẩn</h3>
                <p className="text-sm text-slate-500">
                  Nhập file đã có sẵn lịch thi đấu, không cần sắp xếp lại.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">Trận</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">Hạng cân</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">VĐV Đỏ</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">VĐV Xanh</span>
                </div>
              </div>
              {wizardImportType === 'standard' && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Info box */}
        <div className={`p-4 rounded-xl border ${
          wizardImportType === 'raw' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <i className={`fa-solid fa-info-circle mt-0.5 ${
              wizardImportType === 'raw' ? 'text-emerald-500' : 'text-blue-500'
            }`}></i>
            <div className="text-sm">
              {wizardImportType === 'raw' ? (
                <>
                  <p className="font-medium text-emerald-800">Quy trình với file thô:</p>
                  <ol className="mt-2 space-y-1 text-emerald-700 list-decimal list-inside">
                    <li>Upload file Excel danh sách VĐV</li>
                    <li>Nhóm theo hạng cân + Xáo trộn bốc thăm</li>
                    <li>Điều chỉnh vị trí (tùy chọn)</li>
                    <li>Hệ thống tự động tạo lịch thi đấu</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-blue-800">Quy trình với file chuẩn:</p>
                  <ol className="mt-2 space-y-1 text-blue-700 list-decimal list-inside">
                    <li>Upload file Excel đã có lịch thi đấu</li>
                    <li>Xem trước và xác nhận</li>
                    <li>Tạo giải đấu</li>
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderDkStep2 = () => {
    const { wizardImportType } = this.state;
    
    // Nếu chọn file chuẩn
    if (wizardImportType === 'standard') {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-file-excel text-blue-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-blue-800">Import file đã sắp lịch</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Upload file Excel chứa lịch thi đấu đã được sắp sẵn. Format: Trận, Hạng cân, Loại trận, VĐV Đỏ, VĐV Xanh...
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={mauchuandoikhang} download="1-Mau_Chuan_Doi_Khang" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-xl font-medium hover:bg-blue-50">
              <i className="fa-solid fa-file-download"></i> Tải mẫu Excel chuẩn
            </a>
            <label className="flex-1 min-w-[200px] relative">
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                <i className="fa-solid fa-cloud-upload text-slate-400"></i>
                <span className="text-slate-500">Chọn hoặc kéo thả file Excel chuẩn...</span>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
                onChange={this.handleimportCombatStandFile} />
            </label>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {this.combatArrangeHeader && this.combatArrangeHeader.map((header) => 
                    <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600 border-b">{header}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {this.combatStandardArray && this.combatStandardArray.length > 0 ? this.combatStandardArray.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    {row.map((cell: any, j: number) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                  </tr>
                )) : (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">Chưa có dữ liệu - Vui lòng upload file Excel chuẩn</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // File thô (mặc định)
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-file-excel text-emerald-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-emerald-800">Import danh sách VĐV</h4>
              <p className="text-sm text-emerald-700 mt-1">
                Upload file Excel chứa danh sách VĐV theo format: STT, Hạng cân, Tên VĐV, Mã số/Đơn vị, Quốc gia. Hệ thống sẽ tự động nhóm theo hạng cân.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={mauthodoikhang} download="3-Mau_Tho_Doi_Khang" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-500 text-emerald-600 rounded-xl font-medium hover:bg-emerald-50">
            <i className="fa-solid fa-file-download"></i> Tải mẫu Excel
          </a>
          <label className="flex-1 min-w-[200px] relative">
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer">
              <i className="fa-solid fa-cloud-upload text-slate-400"></i>
              <span className="text-slate-500">Chọn hoặc kéo thả file Excel...</span>
            </div>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
              onChange={this.handleimportCombatRawFile} />
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={this.grouping} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium">
            <i className="fas fa-sort-amount-down"></i> Nhóm theo hạng cân
          </button>
          <button onClick={this.shuffle} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium">
            <i className="fa-solid fa-shuffle"></i> Xáo trộn ngẫu nhiên
          </button>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {this.combatArrangeHeader && this.combatArrangeHeader.map((header) => 
                  <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600 border-b">{header}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {this.combatArrayRaw && this.combatArrayRaw.length > 0 ? this.combatArrayRaw.map((row, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Chưa có dữ liệu - Vui lòng upload file Excel</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Bracket Builder State helpers
  getBracketDataByWeight = () => {
    const grouped: { [key: string]: any[] } = {};
    this.combatArrayRaw?.forEach((fighter) => {
      const weight = fighter[1];
      if (!grouped[weight]) grouped[weight] = [];
      grouped[weight].push({
        index: fighter[0],
        weight: fighter[1],
        name: fighter[2],
        code: fighter[3],
        country: fighter[4],
        seed: 0 // 0 = không phải hạt giống
      });
    });
    return grouped;
  };

  // Get bracket preview for a weight class
  getBracketPreview = (fighters: any[]) => {
    const n = fighters.length;
    if (n < 2) return null;
    
    const schema = this.schemaFighters[Math.min(n, 17)];
    if (!schema || schema === '[]') return null;
    
    try {
      const matches = JSON.parse(schema) as MatchSchema[];
      // Find first round matches (where redFighter.name and blueFighter.name are numbers)
      const firstRoundMatches = matches.filter(m => 
        !isNaN(Number(m.redFighter.name)) && !isNaN(Number(m.blueFighter.name))
      );
      return { matches, firstRoundMatches, total: matches.length };
    } catch {
      return null;
    }
  };

  renderDkStep3 = () => {
    const grouped = this.getBracketDataByWeight();
    const weights = Object.keys(grouped);
    const hasData = weights.length > 0;
    const { wizardDkSeeding } = this.state;

    return (
      <div className="space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-sitemap text-purple-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-purple-800">Sắp xếp thứ tự VĐV</h4>
              <p className="text-sm text-purple-700 mt-1">
                Sắp xếp thứ tự VĐV trong mỗi hạng cân. Dùng nút mũi tên để di chuyển hoặc nhấn "Xáo trộn" để bốc thăm ngẫu nhiên.
              </p>
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="text-center py-12 text-slate-400">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p>Chưa có dữ liệu VĐV</p>
            <p className="text-sm">Vui lòng quay lại Bước 2 để import file Excel</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={this.shuffle}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
              >
                <i className="fa-solid fa-shuffle"></i>
                Xáo trộn tất cả
              </button>
              <button 
                onClick={this.grouping}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all"
              >
                <i className="fas fa-sort-amount-down"></i>
                Sắp xếp lại
              </button>
            </div>

            {/* Hướng dẫn hạt giống */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <i className="fa-solid fa-star text-amber-500 mt-0.5"></i>
                <div>
                  <span className="font-medium">Hạt giống:</span> Nhấn vào ⭐ để đánh dấu tối đa 2 VĐV mạnh nhất trong mỗi hạng cân. 
                  Hệ thống sẽ tự động tách họ ra 2 nhánh khác nhau, chỉ gặp nhau ở Chung kết.
                </div>
              </div>
            </div>

            {/* Weight classes */}
            {weights.map((weight, wi) => {
              const fighters = grouped[weight];
              const bracketInfo = this.getBracketPreview(fighters);
              
              return (
                <div key={wi} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Weight header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-dumbbell text-white"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{weight}</h3>
                        <p className="text-emerald-100 text-sm">{fighters.length} VĐV • {bracketInfo?.total || 0} trận</p>
                      </div>
                    </div>
                    {bracketInfo && (
                      <div className="flex gap-1">
                        {bracketInfo.firstRoundMatches.slice(0, 4).map((m, i) => (
                          <div key={i} className="px-2 py-1 bg-white/20 rounded text-xs text-white">
                            T{m.match}
                          </div>
                        ))}
                        {bracketInfo.firstRoundMatches.length > 4 && (
                          <div className="px-2 py-1 bg-white/20 rounded text-xs text-white">
                            +{bracketInfo.firstRoundMatches.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fighters list */}
                  <div className="p-4">
                    <div className="grid gap-2">
                      {fighters.map((fighter, fi) => {
                        const seedKey = this.getSeedingKey(weight, fi);
                        const seedNum = wizardDkSeeding[seedKey] || 0;
                        
                        return (
                        <div 
                          key={fi}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            seedNum === 1 ? 'border-purple-300 bg-purple-50' :
                            seedNum === 2 ? 'border-orange-300 bg-orange-50' :
                            'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {/* Position indicator */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            seedNum === 1 ? 'bg-purple-500 text-white' :
                            seedNum === 2 ? 'bg-orange-500 text-white' :
                            'bg-slate-300 text-slate-600'
                          }`}>
                            {fi + 1}
                          </div>

                          {/* Seed button - luôn hiển thị */}
                          <button
                            onClick={() => this.toggleSeed(weight, fi)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                seedNum === 0 
                                  ? 'bg-slate-100 text-slate-300 hover:bg-amber-100 hover:text-amber-500' 
                                  : seedNum === 1
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-orange-500 text-white'
                              }`}
                              title={seedNum === 0 ? 'Đánh dấu hạt giống' : `Hạt giống #${seedNum}`}
                            >
                              <i className={`fa-solid fa-star text-xs`}></i>
                            </button>

                          {/* Fighter info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">{fighter.name}</div>
                            <div className="text-xs text-slate-500 truncate">{fighter.code} • {fighter.country}</div>
                          </div>

                          {/* Seed labels */}
                          {seedNum > 0 && (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                              seedNum === 1 ? 'bg-purple-500 text-white' : 'bg-orange-500 text-white'
                            }`}>
                              HG #{seedNum}
                            </span>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper: Count weight groups
  getWeightGroupStats = () => {
    const weightCount: { [key: string]: number } = {};
    this.combatArrayRaw?.forEach((fighter) => {
      const weight = fighter[1];
      weightCount[weight] = (weightCount[weight] || 0) + 1;
    });
    return weightCount;
  };

  // Helper: Danh sách VĐV thi quyền đã chuẩn hoá, lấy từ nguồn nào đang có dữ liệu.
  // Cần thiết vì import "file chuẩn" chỉ đổ vào martialStandardArray, còn "file thô" đổ vào martialArrayRaw.
  getMartialFlatData = (): { index: any; content: string; name: string; code: string; country: string }[] => {
    if (this.martialArrayRaw?.length) {
      return this.martialArrayRaw.map((item) => ({
        index: item[0],
        content: item[1],
        name: item[2],
        code: item[3],
        country: item[4],
      }));
    }

    const flat: { index: any; content: string; name: string; code: string; country: string }[] = [];
    let content = '';
    this.martialStandardArray?.forEach((row) => {
      if (this.isMartialContentRow(row)) {
        content = this.cell(row[0]);
        return;
      }
      flat.push(this.martialStandardFromFile
        // File chuẩn: [STT, Tên, Code, Quốc gia] - tên nội dung nằm ở dòng tiêu đề phía trên
        ? { index: row[0], content, name: row[1], code: row[2], country: row[3] }
        // arrangeMartial: [STT, Nội dung, Tên, Code, Quốc gia]
        : { index: row[0], content: row[1] || content, name: row[2], code: row[3], country: row[4] });
    });
    return flat;
  };

  // Helper: Count martial content groups
  getMartialContentStats = () => {
    const contentCount: { [key: string]: number } = {};
    this.getMartialFlatData().forEach((f) => {
      contentCount[f.content] = (contentCount[f.content] || 0) + 1;
    });
    return contentCount;
  };

  // Helper: Group martial data by content
  getMartialDataByContent = () => {
    const grouped: { [key: string]: { index: any; content: string; name: string; code: string; country: string }[] } = {};
    this.getMartialFlatData().forEach((f) => {
      if (!grouped[f.content]) {
        grouped[f.content] = [];
      }
      grouped[f.content].push(f);
    });
    return grouped;
  };

  // Shuffle fighters for a specific martial content
  shuffleMartialContent = (content: string) => {
    // Chỉ bốc thăm được với file thô; file chuẩn đã có sẵn thứ tự biểu diễn
    if (!this.martialArrayRaw?.length) return;
    const grouped = this.getMartialDataByContent();
    const fighters = grouped[content];
    if (!fighters || fighters.length < 2) return;

    // Fisher-Yates shuffle
    for (let i = fighters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fighters[i], fighters[j]] = [fighters[j], fighters[i]];
    }

    // Update martialArrayRaw with new order
    let arrIndex = 0;
    Object.keys(grouped).forEach((c) => {
      const items = c === content ? fighters : grouped[c];
      items.forEach((f) => {
        this.martialArrayRaw[arrIndex] = [f.index, f.content, f.name, f.code, f.country];
        arrIndex++;
      });
    });

    this.forceUpdate();
  };

  // Shuffle all martial fighters
  shuffleAllMartial = () => {
    // Chỉ bốc thăm được với file thô; file chuẩn đã có sẵn thứ tự biểu diễn
    if (!this.martialArrayRaw?.length) return;
    const grouped = this.getMartialDataByContent();
    
    // Shuffle each content group
    Object.keys(grouped).forEach((content) => {
      const fighters = grouped[content];
      // Fisher-Yates shuffle
      for (let i = fighters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fighters[i], fighters[j]] = [fighters[j], fighters[i]];
      }
    });

    // Update martialArrayRaw with new order
    let arrIndex = 0;
    Object.keys(grouped).forEach((content) => {
      grouped[content].forEach((f) => {
        this.martialArrayRaw[arrIndex] = [f.index, f.content, f.name, f.code, f.country];
        arrIndex++;
      });
    });

    this.forceUpdate();
  };

  renderDkStep4 = () => {
    const { tournamentCreated } = this.state;
    const weightStats = this.getWeightGroupStats();
    const weightKeys = Object.keys(weightStats);
    const totalFighters = this.combatArrayRaw?.length || 0;
    const hasData = totalFighters > 0;
    const hasArranged = this.combatStandardArray?.length > 0;

    return (
      <div className="space-y-6">
        {/* Status Banner */}
        {tournamentCreated ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-trophy text-emerald-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-emerald-800">Đã tạo giải đấu thành công!</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Giải đấu đã được lưu vào hệ thống. Bạn có thể tải file Excel bên dưới.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-check-circle text-green-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-green-800">Xác nhận và tạo giải</h4>
                <p className="text-sm text-green-700 mt-1">
                  {hasArranged 
                    ? 'Đã sắp lịch thi đấu. Kiểm tra lại trước khi tạo giải.'
                    : 'Nhấn "Sắp lịch" để hệ thống tự động tạo lịch thi đấu dựa trên thứ tự VĐV đã sắp xếp ở bước trước.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{totalFighters}</div>
            <div className="text-sm text-emerald-700 mt-1">VĐV</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{weightKeys.length}</div>
            <div className="text-sm text-blue-700 mt-1">Hạng cân</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{hasArranged ? this.combatStandardArray.length : '—'}</div>
            <div className="text-sm text-purple-700 mt-1">Trận đấu</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{this.combatObj?.combatArena?.length || 2}</div>
            <div className="text-sm text-amber-700 mt-1">Sân thi đấu</div>
          </div>
        </div>

        {/* Weight Groups Summary */}
        {weightKeys.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-layer-group"></i>
              Thống kê theo hạng cân
            </h4>
            <div className="flex flex-wrap gap-2">
              {weightKeys.map((weight, i) => (
                <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm border border-slate-200 shadow-sm">
                  <span className="font-medium text-slate-700">{weight}</span>
                  <span className="ml-2 text-emerald-600 font-semibold">{weightStats[weight]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!hasArranged && (
            <button 
              onClick={this.arrangeCombatForWizard}
              disabled={!hasData}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                hasData 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Sắp lịch thi đấu
            </button>
          )}
          <button 
            onClick={this.downloadCombatOrigin}
            disabled={!hasArranged}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              hasArranged
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fa-solid fa-download"></i>
            Tải file Excel đã sắp lịch
          </button>
        </div>

        {/* Preview Table - Full list with scroll */}
        {hasData && (
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="font-medium text-slate-700">
                <i className="fa-solid fa-table mr-2"></i>
                {hasArranged ? 'Xem trước lịch thi đấu' : 'Danh sách VĐV (chưa sắp lịch)'}
              </span>
              <span className="text-sm text-slate-500">
                Tổng {hasArranged ? this.combatStandardArray.length : this.combatArrayRaw?.length || 0} dòng
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {(hasArranged ? this.combatArrangeHeader : ['STT', 'Hạng cân', 'Tên VĐV', 'Code/Đơn vị', 'Quốc gia'])?.map((header, i) => 
                      <th key={i} className="px-3 py-2 text-left font-semibold text-slate-600 border-b whitespace-nowrap">{header}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(hasArranged ? this.combatStandardArray : this.combatArrayRaw)?.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50">
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!hasData && (
          <div className="text-center py-8 text-slate-400">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p>Chưa có dữ liệu VĐV</p>
            <p className="text-sm">Vui lòng quay lại Bước 2 để import file Excel</p>
          </div>
        )}
      </div>
    );
  };

  // Thi Quyền Steps
  renderTqStep1 = () => {
    const { wizardImportType } = this.state;
    
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-lightbulb text-amber-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-amber-800">Chọn kiểu nhập liệu</h4>
              <p className="text-sm text-amber-700 mt-1">
                Bạn có 2 lựa chọn để nhập thông tin VĐV Thi Quyền: Từ file danh sách đăng ký (thô) hoặc từ file đã sắp lịch sẵn (chuẩn).
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* File thô */}
          <button
            onClick={() => this.setWizardImportType('raw')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              wizardImportType === 'raw'
                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                wizardImportType === 'raw' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-file-lines text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File thô</h3>
                <p className="text-sm text-slate-500">
                  Nhập danh sách VĐV đăng ký theo từng nội dung thi quyền.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">STT</span>
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">Nội dung</span>
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">Họ tên</span>
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">Đơn vị</span>
                </div>
              </div>
              {wizardImportType === 'raw' && (
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>

          {/* File chuẩn */}
          <button
            onClick={() => this.setWizardImportType('standard')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              wizardImportType === 'standard'
                ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                wizardImportType === 'standard' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-table-cells text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File chuẩn</h3>
                <p className="text-sm text-slate-500">
                  Nhập file đã có sẵn lịch biểu diễn thi quyền.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">Lượt</span>
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">Nội dung</span>
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">VĐV</span>
                </div>
              </div>
              {wizardImportType === 'standard' && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Info box */}
        <div className={`p-4 rounded-xl border ${
          wizardImportType === 'raw' ? 'bg-amber-50 border-amber-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            <i className={`fa-solid fa-info-circle mt-0.5 ${
              wizardImportType === 'raw' ? 'text-amber-500' : 'text-orange-500'
            }`}></i>
            <div className="text-sm">
              {wizardImportType === 'raw' ? (
                <>
                  <p className="font-medium text-amber-800">Quy trình với file thô:</p>
                  <ol className="mt-2 space-y-1 text-amber-700 list-decimal list-inside">
                    <li>Upload file Excel danh sách VĐV</li>
                    <li>Hệ thống tự động sắp xếp theo nội dung</li>
                    <li>Xem trước và tạo giải</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-orange-800">Quy trình với file chuẩn:</p>
                  <ol className="mt-2 space-y-1 text-orange-700 list-decimal list-inside">
                    <li>Upload file Excel đã có lịch biểu diễn</li>
                    <li>Xem trước và xác nhận</li>
                    <li>Tạo giải đấu</li>
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderTqStep2 = () => {
    const { wizardImportType } = this.state;
    
    // Nếu chọn file chuẩn
    if (wizardImportType === 'standard') {
      return (
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-file-excel text-orange-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-orange-800">Import file đã sắp lịch</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Upload file Excel chứa lịch biểu diễn đã được sắp sẵn.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={mauchuanthiquyen} download="2-Mau_Chuan_Thi_Quyen" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-orange-500 text-orange-600 rounded-xl font-medium hover:bg-orange-50">
              <i className="fa-solid fa-file-download"></i> Tải mẫu Excel chuẩn
            </a>
            <label className="flex-1 min-w-[200px] relative">
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer">
                <i className="fa-solid fa-cloud-upload text-slate-400"></i>
                <span className="text-slate-500">Chọn hoặc kéo thả file Excel chuẩn...</span>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
                onChange={this.handleimportMartialStandardFile} />
            </label>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {this.martialArrangeHeader && this.martialArrangeHeader.map((header) => 
                    <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600 border-b">{header}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {this.martialStandardArray && this.martialStandardArray.length > 0 ? this.martialStandardArray.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    {row.map((cell: any, j: number) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Chưa có dữ liệu - Vui lòng upload file Excel chuẩn</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // File thô (mặc định)
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-file-excel text-amber-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-amber-800">Import danh sách VĐV</h4>
              <p className="text-sm text-amber-700 mt-1">
                Upload file Excel chứa danh sách VĐV theo format: STT, Nội dung, Họ và tên, Mã số/Đơn vị, Quốc gia.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={mauthothiquyen} download="4-Mau_Tho_Thi_Quyen" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-amber-500 text-amber-600 rounded-xl font-medium hover:bg-amber-50">
            <i className="fa-solid fa-file-download"></i> Tải mẫu Excel
          </a>
          <label className="flex-1 min-w-[200px] relative">
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all cursor-pointer">
              <i className="fa-solid fa-cloud-upload text-slate-400"></i>
              <span className="text-slate-500">Chọn hoặc kéo thả file Excel...</span>
            </div>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
              onChange={this.handleimportMartialRawFile} />
          </label>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {this.martialArrangeHeader && this.martialArrangeHeader.map((header) => 
                  <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600 border-b">{header}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {this.martialArrayRaw && this.martialArrayRaw.length > 0 ? this.martialArrayRaw.map((row, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>)}
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Chưa có dữ liệu - Vui lòng upload file Excel</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // TQ Step 3 - Sắp xếp thứ tự VĐV theo nội dung
  renderTqStep3 = () => {
    const groupedData = this.getMartialDataByContent();
    const contentKeys = Object.keys(groupedData);
    const hasData = contentKeys.length > 0;
    // File chuẩn đã có sẵn thứ tự biểu diễn nên không cho bốc thăm lại
    const canShuffle = this.martialArrayRaw?.length > 0;

    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-sitemap text-amber-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-amber-800">Sắp xếp thứ tự VĐV theo nội dung</h4>
              <p className="text-sm text-amber-700 mt-1">
                Xem danh sách VĐV theo từng nội dung. Có thể bốc thăm ngẫu nhiên thứ tự biểu diễn.
              </p>
            </div>
          </div>
        </div>

        {/* Shuffle All Button */}
        {canShuffle && (
          <div className="flex justify-end">
            <button
              onClick={this.shuffleAllMartial}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all"
            >
              <i className="fa-solid fa-shuffle"></i>
              Xáo trộn ngẫu nhiên tất cả
            </button>
          </div>
        )}

        {/* Content Groups */}
        {hasData && contentKeys.length > 0 && (
          <div className="space-y-6">
            {contentKeys.map((content) => {
              const fighters = groupedData[content];
              return (
                <div key={content} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold text-lg">{content}</span>
                      <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {fighters.length} VĐV
                      </span>
                    </div>
                    {canShuffle && (
                      <button
                        onClick={() => this.shuffleMartialContent(content)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all"
                        title={`Xáo trộn ngẫu nhiên nội dung ${content}`}
                      >
                        <i className="fa-solid fa-shuffle"></i>
                        Xáo trộn
                      </button>
                    )}
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {fighters.map((f, fi) => (
                        <div
                          key={fi}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-amber-100 text-amber-600 rounded-full">
                            {fi + 1}
                          </span>
                          <span className="font-medium text-slate-700">{f.name}</span>
                          <span className="text-slate-400 text-sm">({f.code})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!hasData && (
          <div className="text-center py-8 text-slate-400">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p>Chưa có dữ liệu VĐV</p>
            <p className="text-sm">Vui lòng quay lại Bước 2 để import file Excel</p>
          </div>
        )}
      </div>
    );
  };

  // TQ Step 4 - Xác nhận và tạo giải
  renderTqStep4 = () => {
    const { tournamentCreated } = this.state;
    const hasArranged = this.martialStandardArray?.length > 0;

    // getMartialFlatData đã bỏ các dòng tên nội dung nên không đếm nhầm chúng thành VĐV
    const contentStats = this.getMartialContentStats();
    const contentKeys = Object.keys(contentStats);
    const totalFighters = this.getMartialFlatData().length;
    const hasData = totalFighters > 0;
    const martialPreviewHeader = this.martialStandardFromFile
      ? ['STT', 'Họ tên', 'Code/Đơn vị', 'Quốc gia']
      : ['STT', 'Nội dung', 'Họ tên', 'Code/Đơn vị', 'Quốc gia'];

    return (
      <div className="space-y-6">
        {/* Status Banner */}
        {tournamentCreated ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-trophy text-emerald-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-emerald-800">Đã tạo giải đấu thành công!</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Giải đấu đã được lưu vào hệ thống. Bạn có thể tải file Excel bên dưới.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-check-circle text-green-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-green-800">Xác nhận và tạo giải</h4>
                <p className="text-sm text-green-700 mt-1">
                  {hasArranged 
                    ? 'Đã sắp lịch biểu diễn. Kiểm tra lại trước khi tạo giải.'
                    : 'Nhấn "Sắp lịch" để hệ thống tự động tạo lịch biểu diễn.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{totalFighters}</div>
            <div className="text-sm text-amber-700 mt-1">VĐV</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{contentKeys.length}</div>
            <div className="text-sm text-orange-700 mt-1">Nội dung</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-rose-600">{this.martialObj?.martialArena?.length || 2}</div>
            <div className="text-sm text-rose-700 mt-1">Sân thi đấu</div>
          </div>
        </div>

        {/* Content Groups Summary */}
        {contentKeys.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list"></i>
              Thống kê theo nội dung thi đấu
            </h4>
            <div className="flex flex-wrap gap-2">
              {contentKeys.map((content, i) => (
                <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm border border-slate-200 shadow-sm">
                  <span className="font-medium text-slate-700">{content}</span>
                  <span className="ml-2 text-amber-600 font-semibold">{contentStats[content]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!hasArranged && (
            <button 
              onClick={this.arrangeMartial}
              disabled={!hasData}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                hasData 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Sắp lịch thi đấu
            </button>
          )}
          <button 
            onClick={this.downloadMartial}
            disabled={!hasArranged}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              hasArranged 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fa-solid fa-download"></i>
            Tải file Excel đã sắp lịch
          </button>
        </div>

        {/* Preview Table - Full list with scroll */}
        {hasData && (
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="font-medium text-slate-700">
                <i className="fa-solid fa-table mr-2"></i>
                {hasArranged ? 'Xem trước lịch biểu diễn' : 'Danh sách VĐV (chưa sắp lịch)'}
              </span>
              <span className="text-sm text-slate-500">
                Tổng {hasArranged ? this.martialStandardArray.length : this.martialArrayRaw?.length || 0} dòng
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {martialPreviewHeader.map((header, i) => 
                      <th key={i} className="px-3 py-2 text-left font-semibold text-slate-600 border-b whitespace-nowrap">{header}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(hasArranged ? this.martialStandardArray : this.martialArrayRaw)?.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50">
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!hasData && (
          <div className="text-center py-8 text-slate-400">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p>Chưa có dữ liệu VĐV</p>
            <p className="text-sm">Vui lòng quay lại Bước 2 để import file Excel</p>
          </div>
        )}
      </div>
    );
  };

  render() {
    const { showPasswordModal, showChooseArenaNoModal, password, tournamentName, collapsedSections, isLoading, loadingMessage, showConfirmModal, confirmTitle, confirmMessage, dragOver } = this.state;

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Logo as Home button */}
              <a 
                href="/" 
                title="Về Trang chủ" 
                className="flex items-center p-2 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl shadow-sm hover:shadow hover:border-slate-300 transition-all"
              >
                <img src={logo} alt="Logo" className="h-7" />
              </a>
              
              {/* Center: Page Title */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <i className="fas fa-file-upload text-white text-sm"></i>
                </div>
                <h1 className="text-lg font-bold text-slate-800">Tạo giải đấu</h1>
              </div>
              
              {/* Right: Tournament name badge */}
              {tournamentName ? (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg px-3 py-1.5 max-w-[300px]">
                  <p className="text-xs text-violet-700 font-medium whitespace-pre-line" title={tournamentName}>
                    {tournamentName}
                  </p>
                </div>
              ) : (
                <div className="w-[100px]"></div>
              )}
            </div>
          </div>
        </header>

        {/* Wizard Mode - Chế độ từng bước */}
        {this.renderWizardMode()}

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
                  {this.state.tournamentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                      <span className="ml-3 text-slate-500">Đang tải danh sách...</span>
                    </div>
                  ) : this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                    <label key={i} onClick={() => this.chooseTournament(i)}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-colors">
                      <input type="radio" name="tournamentRadio" id={`tournamentRadio-${tournament[0]}`} value={tournament[1]} defaultChecked={i === 0} className="w-4 h-4 text-violet-500" />
                      <span className="font-medium text-slate-700 whitespace-pre-line">{tournament[1]}</span>
                    </label>
                  )) : (
                    <div className="text-center py-6">
                      <i className="fa-solid fa-folder-open text-3xl text-slate-300 mb-2"></i>
                      <p className="text-slate-400">Không có giải đấu</p>
                    </div>
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

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
              <p className="text-slate-700 font-medium">{loadingMessage || 'Đang xử lý...'}</p>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  {confirmTitle}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-slate-600">{confirmMessage}</p>
              </div>
              <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={this.hideConfirm} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors">
                  <i className="fa-solid fa-times mr-2"></i>Hủy bỏ
                </button>
                <button onClick={this.handleConfirm} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 transition-colors shadow-lg">
                  <i className="fa-solid fa-check mr-2"></i>Xác nhận
                </button>
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
