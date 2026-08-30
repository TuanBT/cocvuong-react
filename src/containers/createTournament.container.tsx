import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, update, child, Database } from "firebase/database";
import { toast } from 'react-toastify';

import {
  PageShell, PageHeader, Button, ConfirmModal, EmptyState,
  LoadingOverlay, Toast, AppFooter, Pagination,
} from '../components/ui';
import { AccountChip } from '../components/auth';
import { read, write, utils } from 'xlsx';
import FileSaver from "file-saver";
import { NavLink } from "react-router-dom";
import { DEFAULT_SETTING } from '../constants/settings';
import {
  buildCombatSchedule,
  getSchedule,
  changeMatchNumber,
  SCHEMA_FIGHTERS,
  toStandardRows,
  toCombatMatches,
  COMBAT_ARRANGE_HEADER,
  type MatchSchema,
} from '../utils/scheduleBuilder';
import {
  buildMartialContents,
  toMartialStandardRows,
  MARTIAL_ARRANGE_HEADER,
} from '../utils/martialBuilder';
import mauchuandoikhang from '../assets/template/1-Mau_Chuan_Doi_Khang.xlsx';
import mauchuanthiquyen from '../assets/template/2-Mau_Chuan_Thi_Quyen.xlsx';
import mauthodoikhang from '../assets/template/3-Mau_Tho_Doi_Khang.xlsx';
import mauthothiquyen from '../assets/template/4-Mau_Tho_Thi_Quyen.xlsx';
import { AppUser } from '../services/authService';
import {
  TournamentSummary, addTournament as createTournamentRecord, isLegacy, listTournaments,
} from '../services/tournamentService';
import { syncTournamentCodes } from '../services/accessCodeService';
import type { TournamentId } from '../types';
import { formatEventDate } from '../utils/helpers';
import { pageOf, paginate } from '../utils/pagination';

/** Bang chon giai o buoc 1 la luoi 2 cot — 5 dong la het mot man */
const PICKER_PAGE_SIZE = 10;

interface CreateTournamentContainerProps {
  user: AppUser;
}

interface CreateTournamentContainerState {
  data: any[];
  tournamentName: string;
  /** Tom tat cac giai cua chinh minh (+ giai cu chua co chu) */
  summaries: TournamentSummary[];
  /** Trang cua bang chon giai o buoc 1, dem tu 0 */
  pickerPage: number;
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
  selectedTournament: TournamentId; // Giải đang thao tác
  tournamentCreated: boolean; // Đã tạo giải đấu (lưu Firebase) hay chưa
  // Wizard State
  wizardType: 'doikhang' | 'thiquyen';
  wizardStep: number;
  wizardImportType: 'raw' | 'standard'; // Kiểu import: file thô hoặc file chuẩn
  /** Tên gõ ở ô "Tạo giải mới" (bước 1) — rỗng thì chưa tạo được */
  newTournamentName: string;
  /** Ngay giai dien ra, `YYYY-MM-DD`. Rong = chua biet, khong bat nhap. */
  newTournamentDate: string;
  // Wizard Data
  wizardDkSeeding: {[key: string]: number}; // key = "weight-index", value = seed number (1, 2)
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
  tournamentNoIndex: TournamentId = '0';
  tournamentObj: any[] | null = null;
  tournaments: [TournamentId, string][] = [];

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

  constructor(props: CreateTournamentContainerProps) {
    super(props);
    document.title = 'Tạo Giải';
    
    this.state = {
      data: [],
      tournamentName: '',
      summaries: [],
      pickerPage: 0,
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
      selectedTournament: '',
      tournamentCreated: false,
      // Wizard State
      wizardType: 'doikhang',
      wizardStep: 1,
      wizardImportType: 'raw',
      newTournamentName: '',
      newTournamentDate: '',
      // Wizard Data
      wizardDkSeeding: {},
    };

    this.db = database;
  }


  componentDidMount() {
    this.main();
  }

  /**
   * Chi liet ke **giai cua minh** (+ giai cu chua co chu, de du lieu cu khong
   * bi bo roi). Danh sach giu dang `[index that, ten]` — sau khi loc thi vi tri
   * trong mang KHONG con trung voi index trong DB nua, nen moi cho chon phai
   * dung `tournament[0]`.
   *
   * Ban CHAM NHANH bi loai khoi day: cap doi cua no do chinh nut "Cham cap moi"
   * sinh ra, khong nhap Excel, khong sap nhanh, khong xoa duoc — moi buoc cua
   * trang nay deu khong ap dung cho no. De trong bang chon thi chi to them mot
   * lua chon ma chon vao la khong lam duoc gi.
   */
  main() {
    const { user } = this.props;
    this.setState({ tournamentsLoading: true });

    listTournaments()
      .then((all) => {
        const mine = all.filter((t) => (t.ownerUid === user.uid || isLegacy(t)) && !t.demo);
        this.tournaments = mine.map((t) => [t.id, t.name] as [TournamentId, string]);

        // Giai dang chon khong con trong danh sach (vua xoa, hoac lan dau vao
        // trang) thi chi tu chon ho khi KHONG CO GI DE NHAM: dung mot giai.
        //
        // Co nhieu giai ma van tu chon cai dau tien la bay: buoc "Chon giai"
        // hien ra voi mot o da tich san, nguoi ta bam Tiep tuc theo quan tinh
        // roi nhap ca danh sach VDV de len nham giai. Bo trong thi buoc nay bat
        // ho tra loi mot lan.
        if (!mine.some((t) => t.id === this.tournamentNoIndex)) {
          this.tournamentNoIndex = mine.length === 1 ? mine[0].id : '';
        }

        this.setState({
          data: this.tournaments,
          summaries: mine,
          tournamentsLoading: false,
          selectedTournament: this.tournamentNoIndex,
          // Giai moi tao nam CUOI danh sach (xep theo ngay tao) — khong nhay
          // theo thi vua bam "Tao giai moi" xong quay lai buoc 1 la khong thay
          // no dau, tuong la tao hong
          pickerPage: pageOf(
            mine.findIndex((t) => t.id === this.tournamentNoIndex),
            PICKER_PAGE_SIZE
          ),
        });
        this.loadTournamentName();
      })
      .catch(() => {
        this.setState({ tournamentsLoading: false });
        toast.error('Không đọc được danh sách giải.');
      });
  }

  get summary(): TournamentSummary | null {
    return this.state.summaries.find((t) => t.id === this.tournamentNoIndex) || null;
  }

  chooseTournament = (tournamentNoIndex: TournamentId) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.setState({ selectedTournament: tournamentNoIndex });
    // Doi giai thi cac buoc da lam khong con thuoc ve giai nay nua
    this.setState({ tournamentCreated: false });
    this.loadTournamentName();
  }

  /** Doc ten giai dang chon de hien tren tieu de trang */
  loadTournamentName = () => {
    // Chua chon giai nao: doc `tournament//setting` la mot duong dan hong
    if (!this.tournamentNoIndex) {
      this.setState({ tournamentName: '' });
      return;
    }
    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.setState({ tournamentName: snapshot.val()?.tournamentName || '' });
    });
  }

  /**
   * Them mot giai moi mang **dung cai ten vua go**, dong dau chu so huu, va
   * **sinh san ma giam dinh** — mo Thiet dat ra la da co ma de doc, khong bat
   * bam them mot buoc nua.
   *
   * Ten di kem ngay tu luot ghi dau: ban cu tao giai mang ten mac dinh "Cóc
   * Vương" roi de nguoi ta sang trang Thiet dat doi — ma ho khong biet la phai
   * doi, nen trong danh sach lan ra mot day giai trung ten, khong phan biet noi
   * cai nao la cai nao.
   */
  addTournament = async () => {
    const { user } = this.props;
    const name = this.state.newTournamentName.trim();
    if (!name) {
      toast.error('Đặt tên cho giải trước đã.');
      return;
    }

    this.setState({ isLoading: true, loadingMessage: 'Đang tạo giải…' });
    try {
      const newIndex = await createTournamentRecord(user, name, this.state.newTournamentDate);
      this.tournamentNoIndex = newIndex;

      const setting = JSON.parse(JSON.stringify(DEFAULT_SETTING)).setting;
      try {
        const result = await syncTournamentCodes(
          newIndex,
          {
            combatReferees: setting.combat.isShowFiveReferee ? 5 : 3,
            martialReferees: setting.martial.isShowFiveReferee ? 5 : 3,
            useArenaB: setting.combat.isShowArenaB !== false,
          },
          user.uid
        );
        if (result.poolPressure) {
          toast.warn('Kho mã sắp hết — kiểm tra xem còn giải cũ chưa đóng không.', { autoClose: 8000 });
        }
      } catch (err: any) {
        toast.warn(err?.message || 'Chưa cấp được mã giám định — vào Thiết đặt cấp lại.');
      }

      // Tao xong la da tra loi xong cau hoi cua buoc 1 — di thang sang buoc sau
      this.setState({
        newTournamentName: '',
        newTournamentDate: '',
        selectedTournament: newIndex,
        tournamentCreated: false,
        wizardStep: CreateTournamentContainer.FIRST_CONTENT_STEP,
      });
      this.main();
      toast.success('Đã thêm giải đấu mới!');
    } catch (err: any) {
      toast.error(err?.message || 'Không tạo được giải mới.');
    } finally {
      this.setState({ isLoading: false, loadingMessage: '' });
    }
  }

  // Mo / dong / mo lai / nhan giai cu / xoa giai KHONG con o day — chung la
  // viec quan ly mot giai DA CO, khong phai mot buoc trong luong tao giai, va
  // deu da nam o trang Thiet dat canh nhung thu cung ho hang (bang ma, giam
  // sat, thoi gian hiep). De ca hai noi thi hai trang cung sua mot thu ma
  // khong trang nao hien du trang thai.

  importCombat = () => {
    // Chỉ arrange nếu chưa arrange
    if (!this.combatStandardArray?.length) {
      this.arrangeCombat();
    }
    if (!this.combatObj?.combat?.length) {
      toast.error("Chưa có dữ liệu Đối Kháng để tạo giải. Vui lòng import file ở Bước 3.");
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
    const header = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    this.exportExcel(header, this.combatStandardArray, "Lich_Thi_Dau_DOI_KHANG");
  }

  downloadCombatOrigin = () => {
    const header = ["STT", "HẠNG CÂN", "TÊN VẬN ĐỘNG VIÊN", "CODE/ĐƠN VỊ", "QUỐC GIA"];
    this.exportExcel(header, this.combatArrayRaw, "Boc_Tham_DOI_KHANG");
  }

  downloadMartialOrigin = () => {
    const flatData = this.getMartialFlatData();
    if (!flatData.length) return;
    const rows = flatData.map((f, i) => [i + 1, f.content, f.name, f.code, f.country]);
    const header = ["STT", "NỘI DUNG", "TÊN VẬN ĐỘNG VIÊN", "CODE/ĐƠN VỊ", "QUỐC GIA"];
    this.exportExcel(header, rows, "Boc_Tham_THI_QUYEN");
  }

  downloadCombatSchedule = () => {
    const header = ["TRẬN", "HẠNG CÂN", "LOẠI TRẬN", "TÊN GIÁP ĐỎ", "CODE/ĐƠN VỊ GIÁP ĐỎ", "QUỐC GIA ĐỎ", "TÊN GIÁP XANH", "CODE/ĐƠN VỊ GIÁP XANH", "QUỐC GIA XANH"];
    this.exportExcel(header, this.combatStandardArray, "Lich_Thi_Dau_DOI_KHANG");
  }

  importMartial = () => {
    // Chỉ arrange nếu chưa arrange
    if (!this.martialStandardArray?.length) {
      this.arrangeMartial();
    }
    if (!this.martialObj?.martial?.length) {
      toast.error("Chưa có dữ liệu Thi Quyền để tạo giải. Vui lòng import file ở Bước 3.");
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

  // Shuffle fighters for a specific weight class only
  shuffleWeight = (weight: string) => {
    if (!this.combatArrayRaw?.length) return;

    // Collect indices of fighters in this weight class
    const indices: number[] = [];
    this.combatArrayRaw.forEach((fighter, i) => {
      if (fighter[1] === weight) indices.push(i);
    });
    if (indices.length < 2) return;

    // Fisher-Yates shuffle on those indices only
    const fighters = indices.map(i => [...this.combatArrayRaw[i]]);
    for (let i = fighters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fighters[i], fighters[j]] = [fighters[j], fighters[i]];
    }

    // Write back & re-number within the weight group
    indices.forEach((idx, k) => {
      this.combatArrayRaw[idx] = fighters[k];
      this.combatArrayRaw[idx][0] = k + 1;
    });

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

    this.matchs = buildCombatSchedule(this.combatArrayRaw);

    this.combatObj = JSON.parse(JSON.stringify(this.combatConst));
    this.combatStandardArray = toStandardRows(this.matchs);
    this.combatObj!.combat = toCombatMatches(this.matchs, this.matchObj);

    this.combatArrayRaw = [];
    this.combatArrangeHeader = COMBAT_ARRANGE_HEADER.slice();
    this.setState({ data: this.combatStandardArray });

  }

  // Wizard version - sắp lịch mà không reset combatArrayRaw và không setState về data
  arrangeCombatForWizard = () => {
    if (!this.combatArrayRaw || this.combatArrayRaw.length === 0) return;

    // Lưu lại bản copy của combatArrayRaw (buildCombatSchedule sort tại chỗ)
    const combatArrayRawBackup = JSON.parse(JSON.stringify(this.combatArrayRaw));

    this.matchs = buildCombatSchedule(this.combatArrayRaw, (groupedData) => {
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
    });

    this.combatObj = JSON.parse(JSON.stringify(this.combatConst));
    this.combatStandardArray = toStandardRows(this.matchs);
    this.combatObj!.combat = toCombatMatches(this.matchs, this.matchObj);

    // Khôi phục combatArrayRaw
    this.combatArrayRaw = combatArrayRawBackup;
    this.combatArrangeHeader = COMBAT_ARRANGE_HEADER.slice();

    // forceUpdate thay vì setState để không reset wizard
    this.forceUpdate();

  }

  getschedule(fighters: any[][]): MatchSchema[] {
    return getSchedule(fighters);
  }

  changeMatchNumber(groupMatch: MatchSchema[], newMatchNumber: number): MatchSchema[] {
    return changeMatchNumber(groupMatch, newMatchNumber);
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
    this.martialObj!.martial = buildMartialContents(this.martialArrayRaw);
    this.martialStandardArray = toMartialStandardRows(this.martialArrayRaw);
    this.martialStandardFromFile = false;

    this.martialArrayRaw = [];
    this.martialArrangeHeader = MARTIAL_ARRANGE_HEADER.slice();
    this.setState({ data: this.martialStandardArray });

  }

  downloadMartial = () => {
    this.martialArrangeHeader = this.martialStandardFromFile
      ? ['STT', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA']
      : ['STT', 'NỘI DUNG', 'HỌ VÀ TÊN', 'MSSV/ĐƠN VỊ', 'QUỐC GIA'];
    this.exportExcel(this.martialArrangeHeader, this.state.data, "Thong tin THI QUYEN");
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
  /** Buoc dau tien co noi dung that — 1 la chon giai */
  static readonly FIRST_CONTENT_STEP = 2;

  static readonly LAST_STEP = 5;

  setWizardStep = (step: number) => {
    this.setState({ wizardStep: step });
  };

  nextWizardStep = () => {
    const { wizardStep } = this.state;
    // Chua chon giai thi khong cho di tiep: moi buoc sau deu GHI vao giai dang
    // chon, nen di tiep tay khong la nhap ca file VDV vao khoang khong.
    //
    // Go ten roi ma bam "Tiep tuc" la nham rat de xay ra — o ten nam ngay tren
    // nut — nen bao dung cai ho quen chu khong bao chung chung.
    if (wizardStep === 1 && !this.tournamentNoIndex) {
      toast.error(
        this.state.newTournamentName.trim()
          ? 'Bấm “Tạo giải mới” để tạo giải với tên vừa gõ đã.'
          : 'Chọn một giải, hoặc đặt tên rồi bấm “Tạo giải mới” trước đã.'
      );
      return;
    }
    if (wizardStep < CreateTournamentContainer.LAST_STEP) {
      this.setState({ wizardStep: wizardStep + 1 });
    }
  };

  prevWizardStep = () => {
    const { wizardStep } = this.state;
    if (wizardStep > 1) {
      this.setState({ wizardStep: wizardStep - 1 });
    }
  };

  /**
   * Doi mon thi bo het viec dang lam do — nhung KHONG bat chon lai giai.
   *
   * Giai dang chon van dung cho ca hai mon (mot giai co ca doi khang lan thi
   * quyen), nen day nguoi ta ve buoc 1 chi de bam "Tiep tuc" mot cai nua la
   * phien vo ich.
   */
  setWizardType = (type: 'doikhang' | 'thiquyen') => {
    this.setState({
      wizardType: type,
      wizardStep: this.tournamentNoIndex ? CreateTournamentContainer.FIRST_CONTENT_STEP : 1,
    });
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

  /**
   * Cac buoc, theo dung thu tu nguoi ta lam.
   *
   * Buoc 1 la **chon giai** — truoc day no khong phai mot buoc ma la mot the
   * rieng nam tren dau trang, ngang hang voi ca thanh tien trinh. Cho do vua
   * lam thanh tien trinh noi doi (no bao "Buoc 1" trong khi viec dau tien that
   * su phai lam nam ngoai no), vua khien nguoi ta nhap ca file VDV roi moi
   * nhan ra minh dang ghi vao nham giai.
   *
   * Ca hai mon deu 5 buoc, chi khac chu.
   */
  getWizardSteps = () => {
    const { wizardType } = this.state;
    const pick = {
      step: 1, title: 'Chọn giải', icon: 'fa-trophy',
      description: 'Chọn giải đang làm dở, hoặc tạo giải mới',
    };
    if (wizardType === 'doikhang') {
      return [
        pick,
        { step: 2, title: 'Kiểu nhập liệu', icon: 'fa-info-circle', description: 'Chọn nhập từ file thô hay file đã sắp lịch' },
        { step: 3, title: 'Import VĐV', icon: 'fa-users', description: 'Upload danh sách vận động viên theo hạng cân' },
        { step: 4, title: 'Sắp xếp thứ tự', icon: 'fa-sitemap', description: 'Sắp xếp và bốc thăm thứ tự thi đấu' },
        { step: 5, title: 'Xác nhận', icon: 'fa-check-circle', description: 'Xem lại và tạo giải đấu' },
      ];
    }
    return [
      pick,
      { step: 2, title: 'Kiểu nhập liệu', icon: 'fa-info-circle', description: 'Chọn nhập từ file thô hay file đã sắp lịch' },
      { step: 3, title: 'Import VĐV', icon: 'fa-users', description: 'Upload danh sách VĐV theo nội dung thi quyền' },
      { step: 4, title: 'Sắp xếp thứ tự', icon: 'fa-sitemap', description: 'Sắp xếp thứ tự biểu diễn của VĐV' },
      { step: 5, title: 'Xác nhận', icon: 'fa-check-circle', description: 'Xem lại và tạo giải đấu' },
    ];
  };

  // Render Wizard Mode
  renderWizardMode = () => {
    const { wizardType, wizardStep, tournamentCreated } = this.state;
    const steps = this.getWizardSteps();
    const currentStep = steps[wizardStep - 1];
    const isLastStep = wizardStep === steps.length;

    return (
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 pt-4 pb-6">
        {/* Chon noi dung: doi khang hay thi quyen. Lua chon nay doi luon bang
            mau cua ca man hinh nen nguoi dung khong nham dang nhap giai nao. */}
        <div className="flex justify-center gap-3 mb-6" role="tablist" aria-label="Loại nội dung">
          {([
            { type: 'doikhang', label: 'Đối kháng', icon: 'fa-solid fa-hand-back-fist' },
            { type: 'thiquyen', label: 'Thi quyền', icon: 'fa-solid fa-hand-fist' },
          ] as const).map((option) => (
            <button
              key={option.type}
              type="button"
              role="tab"
              aria-selected={wizardType === option.type}
              onClick={() => this.setWizardType(option.type)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-control font-medium
                transition-colors tap-target
                ${wizardType === option.type
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300'}`}
            >
              <i className={`${option.icon} text-lg`} aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>

        {/* Thanh tien trinh: tren dien thoai cuon ngang thay vi vo bo cuc */}
        <ol className="flex items-center justify-start sm:justify-center gap-1.5 mb-6
          overflow-x-auto scroll-x list-none p-0 m-0 pb-1">
          {steps.map((step, index) => {
            const isDone = wizardStep > step.step;
            const isCurrent = wizardStep === step.step;
            return (
              <li key={step.step} className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  disabled={step.step > wizardStep}
                  onClick={() => this.setWizardStep(step.step)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-control transition-colors
                    disabled:cursor-default
                    ${isCurrent ? 'bg-accent-600 text-white shadow-sm'
                      : isDone ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-400'}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isDone ? 'bg-emerald-600 text-white' : ''}`}>
                    {isDone ? <i className="fa-solid fa-check" aria-hidden="true" /> : step.step}
                  </span>
                  <span className="text-sm font-medium hidden sm:inline whitespace-nowrap">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <span className={`w-6 h-0.5 flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </li>
            );
          })}
        </ol>

        <div className="bg-white rounded-card shadow-card border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-accent-600">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-white/20 rounded-control flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${currentStep?.icon} text-white text-lg`} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white m-0">
                  Bước {wizardStep}: {currentStep?.title}
                </h2>
                <p className="text-white/80 text-sm m-0">{currentStep?.description}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">{this.renderWizardStepContent()}</div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4
            bg-slate-50 border-t border-slate-100">
            <Button
              variant="secondary"
              icon="fa-solid fa-arrow-left"
              disabled={wizardStep === 1}
              onClick={this.prevWizardStep}
            >
              Quay lại
            </Button>

            <span className="text-sm text-slate-500 order-last sm:order-none w-full sm:w-auto text-center">
              Bước {wizardStep} / {steps.length}
            </span>

            {!isLastStep ? (
              <Button variant="primary" onClick={this.nextWizardStep}>
                Tiếp tục
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Button>
            ) : tournamentCreated ? (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control
                font-medium text-emerald-700 bg-emerald-100">
                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                Đã tạo giải
              </span>
            ) : (
              <Button
                variant="success"
                icon="fa-solid fa-rocket"
                onClick={() => (wizardType === 'doikhang' ? this.confirmImportCombat() : this.confirmImportMartial())}
              >
                Tạo giải đấu
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  renderWizardStepContent = () => {
    const { wizardType, wizardStep } = this.state;

    if (wizardStep === 1) return this.renderPickTournamentStep();

    if (wizardType === 'doikhang') {
      switch (wizardStep) {
        case 2: return this.renderDkStep1();
        case 3: return this.renderDkStep2();
        case 4: return this.renderDkStep3();
        case 5: return this.renderDkStep4();
        default: return null;
      }
    } else {
      switch (wizardStep) {
        case 2: return this.renderTqStep1();
        case 3: return this.renderTqStep2();
        case 4: return this.renderTqStep3();
        case 5: return this.renderTqStep4();
        default: return null;
      }
    }
  };

  // Wizard: Set import type
  setWizardImportType = (type: 'raw' | 'standard') => {
    this.setState({ wizardImportType: type });
  };

  // Đối Kháng Steps
  /**
   * Buoc 1 — chon giai cu, hoac tao mot giai moi.
   *
   * O day KHONG co mo/dong/doi ten/xoa giai nua: nhung viec do la **quan ly**
   * mot giai da co, khong phai mot buoc trong luong tao giai, va chung da nam
   * san o trang Thiet dat canh nhung thu cung ho hang (bang ma, giam sat, thoi
   * gian hiep). De ca hai noi thi hai trang cung sua mot thu ma khong trang nao
   * hien du trang thai — nguoi ta dong giai o day roi di tim ly do vi sao trang
   * kia van bao dang mo.
   */
  renderPickTournamentStep = () => {
    const { tournamentsLoading, selectedTournament, newTournamentName, newTournamentDate,
      pickerPage } = this.state;
    const canCreate = newTournamentName.trim().length > 0;
    const paged = paginate(this.tournaments, pickerPage, PICKER_PAGE_SIZE);

    return (
      <div className="space-y-5">
        {tournamentsLoading ? (
          <div className="flex items-center gap-3 py-2 text-slate-500">
            <span className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            Đang tải danh sách giải…
          </div>
        ) : this.tournaments.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {paged.items.map(([id, name]) => {
                const row = this.state.summaries.find((x) => x.id === id);
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 p-3.5 border-2 rounded-control cursor-pointer transition-colors
                      ${selectedTournament === id
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <input
                      type="radio"
                      name="tournamentPicker"
                      checked={selectedTournament === id}
                      onChange={() => this.chooseTournament(id)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-700 whitespace-pre-line">{name}</span>
                      {row && (
                        <span className="block text-xs text-slate-400 mt-0.5">
                          {formatEventDate(row.eventDate) && (
                            <span className="font-medium text-slate-500">
                              {formatEventDate(row.eventDate)} ·{' '}
                            </span>
                          )}
                          {row.status === 'open' ? 'đang mở'
                            : row.status === 'closed' ? 'đã đóng' : 'chưa mở'}
                          {!row.ownerUid && ' · giải cũ chưa có chủ'}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              from={paged.from}
              to={paged.to}
              total={paged.total}
              onPage={(p) => this.setState({ pickerPage: p })}
              unit="giải"
            />
          </>
        ) : (
          <EmptyState
            icon="fa-solid fa-trophy"
            title="Bạn chưa có giải nào"
            hint="Đặt tên ở ô bên dưới rồi bấm “Tạo giải mới” — giải sẽ hiện ngay ở đây."
          />
        )}

        {/* Dat ten NGAY o day chu khong de doi sau: giai sinh ra mang ten mac
            dinh thi ca danh sach thanh mot day ten giong nhau, va nguoi tao
            khong he biet la minh phai di doi. */}
        <div className="pt-4 border-t border-slate-100">
          <label htmlFor="new-tournament-name"
            className="block text-sm font-semibold text-slate-600 mb-2">
            Tên giải mới
          </label>
          <textarea
            id="new-tournament-name"
            value={newTournamentName}
            onChange={(e) => this.setState({ newTournamentName: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 border border-slate-200 rounded-control resize-none
              text-slate-800 bg-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
            placeholder={'VD: GIẢI CÓC VƯƠNG 2026\nFPTU HCM'}
          />
          <p className="text-xs text-slate-400 mt-1.5 mb-0">
            Tên này hiển thị trên màn hình trình chiếu — xuống dòng để chữ khỏi bị co nhỏ.
            Đổi lại được bất cứ lúc nào ở trang Thiết đặt.
          </p>

          {/* Ten giai hay lap lai qua cac nam ("Coc Vuong 2025", "Coc Vuong 2026"
              deu duoc go thanh "GIAI COC VUONG"), nen ngay la thu phan biet duoc
              hai giai trung ten trong bang chon. Khong bat buoc: chua chot lich
              van phai tao giai duoc de con nhap van dong vien. */}
          <label htmlFor="new-tournament-date"
            className="block text-sm font-semibold text-slate-600 mb-2 mt-4">
            Ngày giải diễn ra <span className="font-normal text-slate-400">(không bắt buộc)</span>
          </label>
          <input
            id="new-tournament-date"
            type="date"
            value={newTournamentDate}
            onChange={(e) => this.setState({ newTournamentDate: e.target.value })}
            className="px-4 py-3 border border-slate-200 rounded-control text-slate-800 bg-white
              focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
          />
          <p className="text-xs text-slate-400 mt-1.5 mb-0">
            Hiện cạnh tên giải ở mọi bảng chọn — để không nhầm giải năm nay với giải năm ngoái.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <Button variant="success" icon="fa-solid fa-plus"
              disabled={!canCreate} onClick={this.addTournament}>
              Tạo giải mới
            </Button>
            <NavLink
              to="/thiet-dat"
              className="text-sm text-accent-700 font-medium underline"
            >
              Mở / đóng / đổi tên / xoá giải ở trang Thiết đặt
            </NavLink>
          </div>
        </div>

        <p className="text-xs text-slate-500 m-0 bg-slate-50 border border-slate-200
          rounded-control px-3 py-2.5">
          <i className="fa-solid fa-circle-info mr-1.5 text-slate-400" aria-hidden="true" />
          Mọi bước sau đây đều <strong>ghi đè</strong> danh sách vận động viên và lịch thi đấu
          của giải đang chọn. Kiểm tra kỹ tên giải trước khi đi tiếp.
        </p>
      </div>
    );
  };

  renderDkStep1 = () => {
    const { wizardImportType } = this.state;
    
    return (
      <div className="space-y-6">
        <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-lightbulb text-accent-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-accent-800">Chọn kiểu nhập liệu</h4>
              <p className="text-sm text-accent-700 mt-1">
                Bạn có 2 lựa chọn để nhập thông tin VĐV: Từ file danh sách đăng ký (thô) hoặc từ file đã sắp lịch sẵn (chuẩn).
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* File thô */}
          <button
            onClick={() => this.setWizardImportType('raw')}
            className={`p-6 rounded-card border-2 text-left transition-all ${
              wizardImportType === 'raw'
                ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-200'
                : 'border-slate-200 hover:border-accent-300 hover:bg-accent-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-control flex items-center justify-center ${
                wizardImportType === 'raw' ? 'bg-accent-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-file-lines text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File thô</h3>
                <p className="text-sm text-slate-500">
                  Nhập danh sách VĐV đăng ký, hệ thống sẽ tự động sắp xếp và bốc thăm.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">STT</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Hạng cân</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Tên VĐV</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Đơn vị</span>
                </div>
              </div>
              {wizardImportType === 'raw' && (
                <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>

          {/* File chuẩn */}
          <button
            onClick={() => this.setWizardImportType('standard')}
            className={`p-6 rounded-card border-2 text-left transition-all ${
              wizardImportType === 'standard'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-control flex items-center justify-center ${
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
        <div className={`p-4 rounded-control border ${
          wizardImportType === 'raw' ? 'bg-accent-50 border-accent-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <i className={`fa-solid fa-info-circle mt-0.5 ${
              wizardImportType === 'raw' ? 'text-accent-500' : 'text-blue-500'
            }`}></i>
            <div className="text-sm">
              {wizardImportType === 'raw' ? (
                <>
                  <p className="font-medium text-accent-800">Quy trình với file thô:</p>
                  <ol className="mt-2 space-y-1 text-accent-700 list-decimal list-inside">
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
          <div className="bg-blue-50 border border-blue-200 rounded-control p-4">
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
              className="flex items-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-control font-medium hover:bg-blue-50">
              <i className="fa-solid fa-file-download"></i> Tải mẫu Excel chuẩn
            </a>
            <label className="flex-1 min-w-[200px] relative">
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-control hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                <i className="fa-solid fa-cloud-upload text-slate-400"></i>
                <span className="text-slate-500">Chọn hoặc kéo thả file Excel chuẩn...</span>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
                onChange={this.handleimportCombatStandFile} />
            </label>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-control max-h-[400px] overflow-y-auto">
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
        <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-file-excel text-accent-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-accent-800">Import danh sách VĐV</h4>
              <p className="text-sm text-accent-700 mt-1">
                Upload file Excel chứa danh sách VĐV theo format: STT, Hạng cân, Tên VĐV, Mã số/Đơn vị, Quốc gia. Hệ thống sẽ tự động nhóm theo hạng cân.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={mauthodoikhang} download="3-Mau_Tho_Doi_Khang" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-accent-500 text-accent-600 rounded-control font-medium hover:bg-accent-50">
            <i className="fa-solid fa-file-download"></i> Tải mẫu Excel
          </a>
          <label className="flex-1 min-w-[200px] relative">
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-control hover:border-accent-400 hover:bg-accent-50 transition-all cursor-pointer">
              <i className="fa-solid fa-cloud-upload text-slate-400"></i>
              <span className="text-slate-500">Chọn hoặc kéo thả file Excel...</span>
            </div>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
              onChange={this.handleimportCombatRawFile} />
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={this.grouping} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-control font-medium">
            <i className="fas fa-sort-amount-down"></i> Nhóm theo hạng cân
          </button>
          <button onClick={this.shuffle} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-control font-medium">
            <i className="fa-solid fa-shuffle"></i> Xáo trộn ngẫu nhiên
          </button>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-control max-h-[400px] overflow-y-auto">
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
    
    const schema = SCHEMA_FIGHTERS[Math.min(n, 17)];
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
        <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-sitemap text-accent-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-accent-800">Sắp xếp thứ tự VĐV</h4>
              <p className="text-sm text-accent-700 mt-1">
                Sắp xếp thứ tự VĐV trong mỗi hạng cân. Dùng nút mũi tên để di chuyển hoặc nhấn "Xáo trộn" để bốc thăm ngẫu nhiên.
              </p>
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="text-center py-12 text-slate-400">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p>Chưa có dữ liệu VĐV</p>
            <p className="text-sm">Vui lòng quay lại Bước 3 để import file Excel</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={this.shuffle}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-control font-medium transition-all"
              >
                <i className="fa-solid fa-shuffle"></i>
                Xáo trộn tất cả
              </button>
              <button 
                onClick={this.grouping}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-control font-medium transition-all"
              >
                <i className="fas fa-sort-amount-down"></i>
                Sắp xếp lại
              </button>
            </div>

            {/* Hướng dẫn hạt giống */}
            <div className="bg-amber-50 border border-amber-200 rounded-control p-3">
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
                <div key={wi} className="bg-white rounded-control border border-slate-200 overflow-hidden">
                  {/* Weight header */}
                  <div className="bg-accent-600 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-dumbbell text-white"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{weight}</h3>
                        <p className="text-accent-100 text-sm">{fighters.length} VĐV • {bracketInfo?.total || 0} trận</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => this.shuffleWeight(weight)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all"
                        title={`Xáo trộn ngẫu nhiên ${weight}`}
                      >
                        <i className="fa-solid fa-shuffle"></i>
                        Xáo trộn
                      </button>
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
                          className={`flex items-center gap-3 p-3 rounded-control border-2 transition-all ${
                            seedNum === 1 ? 'border-accent-300 bg-accent-50' :
                            seedNum === 2 ? 'border-amber-300 bg-amber-50' :
                            'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {/* Position indicator */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            seedNum === 1 ? 'bg-accent-500 text-white' :
                            seedNum === 2 ? 'bg-amber-500 text-white' :
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
                                    ? 'bg-accent-500 text-white'
                                    : 'bg-amber-500 text-white'
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
                              seedNum === 1 ? 'bg-accent-500 text-white' : 'bg-amber-500 text-white'
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
          <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-trophy text-accent-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-accent-800">Đã tạo giải đấu thành công!</h4>
                <p className="text-sm text-accent-700 mt-1">
                  Giải đấu đã được lưu vào hệ thống. Bạn có thể tải file Excel bên dưới.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-control p-4">
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
          <div className="bg-accent-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-accent-600">{totalFighters}</div>
            <div className="text-sm text-accent-700 mt-1">VĐV</div>
          </div>
          <div className="bg-blue-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{weightKeys.length}</div>
            <div className="text-sm text-blue-700 mt-1">Hạng cân</div>
          </div>
          <div className="bg-accent-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-accent-600">{hasArranged ? this.combatStandardArray.length : '—'}</div>
            <div className="text-sm text-accent-700 mt-1">Trận đấu</div>
          </div>
          <div className="bg-amber-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{this.combatObj?.combatArena?.length || 2}</div>
            <div className="text-sm text-amber-700 mt-1">Sân thi đấu</div>
          </div>
        </div>

        {/* Weight Groups Summary */}
        {weightKeys.length > 0 && (
          <div className="bg-slate-50 rounded-control p-4">
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-layer-group"></i>
              Thống kê theo hạng cân
            </h4>
            <div className="flex flex-wrap gap-2">
              {weightKeys.map((weight, i) => (
                <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm border border-slate-200 shadow-sm">
                  <span className="font-medium text-slate-700">{weight}</span>
                  <span className="ml-2 text-accent-600 font-semibold">{weightStats[weight]}</span>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium transition-all ${
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
            disabled={!hasData}
            className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium transition-all ${
              hasData
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fa-solid fa-list-ol"></i>
            Tải file bốc thăm
          </button>
          <button 
            onClick={this.downloadCombatSchedule}
            disabled={!hasArranged}
            className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium transition-all ${
              hasArranged
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fa-solid fa-calendar-days"></i>
            Tải lịch thi đấu
          </button>
        </div>

        {/* Preview Table - Full list with scroll */}
        {hasData && (
          <div className="overflow-hidden border border-slate-200 rounded-control">
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
            <p className="text-sm">Vui lòng quay lại Bước 3 để import file Excel</p>
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
        <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-lightbulb text-accent-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-accent-800">Chọn kiểu nhập liệu</h4>
              <p className="text-sm text-accent-700 mt-1">
                Bạn có 2 lựa chọn để nhập thông tin VĐV Thi Quyền: Từ file danh sách đăng ký (thô) hoặc từ file đã sắp lịch sẵn (chuẩn).
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* File thô */}
          <button
            onClick={() => this.setWizardImportType('raw')}
            className={`p-6 rounded-card border-2 text-left transition-all ${
              wizardImportType === 'raw'
                ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-200'
                : 'border-slate-200 hover:border-accent-300 hover:bg-accent-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-control flex items-center justify-center ${
                wizardImportType === 'raw' ? 'bg-accent-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-file-lines text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File thô</h3>
                <p className="text-sm text-slate-500">
                  Nhập danh sách VĐV đăng ký theo từng nội dung thi quyền.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">STT</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Nội dung</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Họ tên</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Đơn vị</span>
                </div>
              </div>
              {wizardImportType === 'raw' && (
                <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>

          {/* File chuẩn */}
          <button
            onClick={() => this.setWizardImportType('standard')}
            className={`p-6 rounded-card border-2 text-left transition-all ${
              wizardImportType === 'standard'
                ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-200'
                : 'border-slate-200 hover:border-accent-300 hover:bg-accent-50/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-control flex items-center justify-center ${
                wizardImportType === 'standard' ? 'bg-accent-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                <i className="fa-solid fa-table-cells text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">File chuẩn</h3>
                <p className="text-sm text-slate-500">
                  Nhập file đã có sẵn lịch biểu diễn thi quyền.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Lượt</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">Nội dung</span>
                  <span className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-lg">VĐV</span>
                </div>
              </div>
              {wizardImportType === 'standard' && (
                <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white text-xs"></i>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Info box */}
        <div className={`p-4 rounded-control border ${
          wizardImportType === 'raw' ? 'bg-accent-50 border-accent-200' : 'bg-accent-50 border-accent-200'
        }`}>
          <div className="flex items-start gap-3">
            <i className={`fa-solid fa-info-circle mt-0.5 ${
              wizardImportType === 'raw' ? 'text-accent-500' : 'text-accent-500'
            }`}></i>
            <div className="text-sm">
              {wizardImportType === 'raw' ? (
                <>
                  <p className="font-medium text-accent-800">Quy trình với file thô:</p>
                  <ol className="mt-2 space-y-1 text-accent-700 list-decimal list-inside">
                    <li>Upload file Excel danh sách VĐV</li>
                    <li>Hệ thống tự động sắp xếp theo nội dung</li>
                    <li>Xem trước và tạo giải</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-accent-800">Quy trình với file chuẩn:</p>
                  <ol className="mt-2 space-y-1 text-accent-700 list-decimal list-inside">
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
          <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-file-excel text-accent-500 mt-1"></i>
              <div>
                <h4 className="font-semibold text-accent-800">Import file đã sắp lịch</h4>
                <p className="text-sm text-accent-700 mt-1">
                  Upload file Excel chứa lịch biểu diễn đã được sắp sẵn.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={mauchuanthiquyen} download="2-Mau_Chuan_Thi_Quyen" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-accent-500 text-accent-600 rounded-control font-medium hover:bg-accent-50">
              <i className="fa-solid fa-file-download"></i> Tải mẫu Excel chuẩn
            </a>
            <label className="flex-1 min-w-[200px] relative">
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-control hover:border-accent-400 hover:bg-accent-50 transition-all cursor-pointer">
                <i className="fa-solid fa-cloud-upload text-slate-400"></i>
                <span className="text-slate-500">Chọn hoặc kéo thả file Excel chuẩn...</span>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
                onChange={this.handleimportMartialStandardFile} />
            </label>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-control max-h-[400px] overflow-y-auto">
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
        <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-file-excel text-accent-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-accent-800">Import danh sách VĐV</h4>
              <p className="text-sm text-accent-700 mt-1">
                Upload file Excel chứa danh sách VĐV theo format: STT, Nội dung, Họ và tên, Mã số/Đơn vị, Quốc gia.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={mauthothiquyen} download="4-Mau_Tho_Thi_Quyen" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-accent-500 text-accent-600 rounded-control font-medium hover:bg-accent-50">
            <i className="fa-solid fa-file-download"></i> Tải mẫu Excel
          </a>
          <label className="flex-1 min-w-[200px] relative">
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-control hover:border-accent-400 hover:bg-accent-50 transition-all cursor-pointer">
              <i className="fa-solid fa-cloud-upload text-slate-400"></i>
              <span className="text-slate-500">Chọn hoặc kéo thả file Excel...</span>
            </div>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls"
              onChange={this.handleimportMartialRawFile} />
          </label>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-control max-h-[400px] overflow-y-auto">
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
        <div className="bg-accent-50 border border-accent-200 rounded-control p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-sitemap text-accent-500 mt-1"></i>
            <div>
              <h4 className="font-semibold text-accent-800">Sắp xếp thứ tự VĐV theo nội dung</h4>
              <p className="text-sm text-accent-700 mt-1">
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
              className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-control font-medium transition-all"
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
                <div key={content} className="border border-slate-200 rounded-control overflow-hidden">
                  <div className="bg-accent-600 px-4 py-3 flex items-center justify-between">
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
                          <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-accent-100 text-accent-600 rounded-full">
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
            <p className="text-sm">Vui lòng quay lại Bước 3 để import file Excel</p>
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-control p-4">
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
          <div className="bg-green-50 border border-green-200 rounded-control p-4">
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
          <div className="bg-accent-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-accent-600">{totalFighters}</div>
            <div className="text-sm text-accent-700 mt-1">VĐV</div>
          </div>
          <div className="bg-accent-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-accent-600">{contentKeys.length}</div>
            <div className="text-sm text-accent-700 mt-1">Nội dung</div>
          </div>
          <div className="bg-rose-50 rounded-control p-4 text-center">
            <div className="text-3xl font-bold text-rose-600">{this.martialObj?.martialArena?.length || 2}</div>
            <div className="text-sm text-rose-700 mt-1">Sân thi đấu</div>
          </div>
        </div>

        {/* Content Groups Summary */}
        {contentKeys.length > 0 && (
          <div className="bg-slate-50 rounded-control p-4">
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list"></i>
              Thống kê theo nội dung thi đấu
            </h4>
            <div className="flex flex-wrap gap-2">
              {contentKeys.map((content, i) => (
                <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm border border-slate-200 shadow-sm">
                  <span className="font-medium text-slate-700">{content}</span>
                  <span className="ml-2 text-accent-600 font-semibold">{contentStats[content]}</span>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium transition-all ${
                hasData 
                  ? 'bg-accent-500 hover:bg-accent-600 text-white' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Sắp lịch thi đấu
            </button>
          )}
          <button 
            onClick={this.downloadMartialOrigin}
            disabled={!hasData}
            className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium transition-all ${
              hasData
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fa-solid fa-list-ol"></i>
            Tải file bốc thăm
          </button>
          <button 
            onClick={this.downloadMartial}
            disabled={!hasArranged}
            className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium transition-all ${
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
          <div className="overflow-hidden border border-slate-200 rounded-control">
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
            <p className="text-sm">Vui lòng quay lại Bước 3 để import file Excel</p>
          </div>
        )}
      </div>
    );
  };

  render() {
    const {
      tournamentName,
      isLoading, loadingMessage, showConfirmModal, confirmTitle, confirmMessage,
      wizardType,
    } = this.state;
    const { user } = this.props;

    return (
      <PageShell accent={wizardType === 'doikhang' ? 'combat' : 'martial'}>
        <PageHeader title="Tạo giải đấu" icon="fa-solid fa-file-arrow-up" badge={tournamentName} action={<AccountChip user={user} />} />

        <main className="flex-1 w-full">
          {this.renderWizardMode()}
        </main>

        <AppFooter />

        <LoadingOverlay isOpen={isLoading} message={loadingMessage} />

        <ConfirmModal
          isOpen={showConfirmModal}
          title={confirmTitle}
          message={confirmMessage}
          onConfirm={this.handleConfirm}
          onCancel={this.hideConfirm}
        />

        <Toast />
      </PageShell>
    );
  }
}

export default CreateTournamentContainer;
