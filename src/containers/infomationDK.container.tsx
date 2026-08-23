import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, get, child, Database } from "firebase/database";
import '../assets/css/bracket.css';
import { PageShell, PageHeader, ChipGroup, DataTable, AppFooter } from '../components/ui';
import type { Column } from '../components/ui';
import { 
  BRACKET_TEMPLATES, 
  updateBracketMatchInfo, 
  addPathHoverListeners,
  countUniqueFighters,
  CombatInfo 
} from '../utils/bracketUtils';

interface InformationDkContainerProps {}

interface InformationDkContainerState {
  tournaments: [number, string][];
  categoryArray: string[];
  combatArray: any[][];
  tournamentName: string;
  bracketHtml: string;
  selectedTournament: number;
  selectedCategory: string;
}

interface Combat {
  match: {
    no: number;
    type: string;
    category: string;
    win: string;
  };
  fighters: {
    redFighter: {
      name: string;
      code: string;
      country: string;
    };
    blueFighter: {
      name: string;
      code: string;
      country: string;
    };
  };
}

class InformationDkContainer extends Component<InformationDkContainerProps, InformationDkContainerState> {
  db: Database;
  combatObj: Combat[] | null = null;
  tournamentObj: any[] | null = null;
  settingObj: any = null;
  tournamentNoIndex: number = 0;
  bracketRef: RefObject<HTMLDivElement>;

  constructor(props: InformationDkContainerProps) {
    super(props);
    document.title = 'Thông Tin Đối Kháng';
    
    this.state = {
      tournaments: [],
      categoryArray: [],
      combatArray: [],
      tournamentName: '',
      bracketHtml: '',
      selectedTournament: 0,
      selectedCategory: 'ALL',
    };
    
    this.db = database;
    this.bracketRef = createRef();
  }

  componentDidMount() {
    this.main();
  }

  componentDidUpdate(_prevProps: InformationDkContainerProps, prevState: InformationDkContainerState) {
    // Update bracket content after state change
    // Check both bracketHtml change and selectedCategory change (for conditional rendering)
    if ((prevState.bracketHtml !== this.state.bracketHtml || prevState.selectedCategory !== this.state.selectedCategory) && 
        this.bracketRef.current && 
        this.state.selectedCategory !== 'ALL') {
      this.bracketRef.current.innerHTML = this.state.bracketHtml;
      // Update match info in bracket using shared utility
      if (this.combatObj) {
        updateBracketMatchInfo(
          this.bracketRef.current,
          this.combatObj as CombatInfo[],
          this.state.selectedCategory
        );
        addPathHoverListeners(this.bracketRef.current);
      }
    }
  }

  main() {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      const tournaments: [number, string][] = [];

      if (this.tournamentObj) {
        for (let i = 0; i < this.tournamentObj.length; i++) {
          tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
        }
      }
      this.setState({ tournaments });
    });

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      if (this.settingObj) {
        this.setState({ tournamentName: this.settingObj.tournamentName });
      }
    });

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combat/')).then((snapshot) => {
      this.combatObj = snapshot.val();
      this.showListInfo();
    });
  }

  chooseTournament = (tournamentNoIndex: number) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.setState({ selectedTournament: tournamentNoIndex });
    this.main();
  }

  chooseCategory = (categoryNoIndex: string) => {
    this.setState({ selectedCategory: categoryNoIndex }, () => {
      this.showListMatchs(categoryNoIndex);
    });
  }

  showListInfo() {
    if (this.combatObj && this.combatObj.length > 0) {
      const categoryArray: string[] = ["ALL"];
      for (let i = 0; i < this.combatObj.length; i++) {
        if (!categoryArray.includes(this.combatObj[i].match.category)) {
          categoryArray.push(this.combatObj[i].match.category);
        }
      }
      this.setState({ categoryArray, selectedCategory: "ALL" }, () => {
        this.showListMatchs("ALL");
      });
    } else {
      // Giải chưa có thông tin đối kháng - reset state
      this.setState({ categoryArray: [], combatArray: [], selectedCategory: "" });
    }
  }

  showListMatchs(category: string) {
    let nameWin = "";
    const fighters: string[] = [];
    
    if (!this.combatObj) return;
    
    for (let i = 0; i < this.combatObj.length; i++) {
      if (this.combatObj[i].match.category === category || category === "ALL") {
        const combat = this.combatObj[i];
        if (!fighters.includes(combat.fighters.redFighter.name + combat.fighters.redFighter.code) && 
            !combat.fighters.redFighter.name.includes("W.") && 
            !combat.fighters.redFighter.name.includes("L.")) {
          fighters.push(combat.fighters.redFighter.name + combat.fighters.redFighter.code);
        }
        if (!fighters.includes(combat.fighters.blueFighter.name + combat.fighters.blueFighter.code) && 
            !combat.fighters.blueFighter.name.includes("W.") && 
            !combat.fighters.blueFighter.name.includes("L.")) {
          fighters.push(combat.fighters.blueFighter.name + combat.fighters.blueFighter.code);
        }
      }
    }
    
    // COPY một schema vào id schema-bracket
    const bracketHtml = BRACKET_TEMPLATES[fighters.length] || '';

    const combatArray: any[][] = [];
    
    for (let i = 0; i < this.combatObj.length; i++) {
      if (this.combatObj[i].match.category === category || category === "ALL") {
        const combat = this.combatObj[i];

        nameWin = "";
        if (combat.match.win === "red") {
          nameWin = combat.fighters.redFighter.name;
        } else if (combat.match.win === "blue") {
          nameWin = combat.fighters.blueFighter.name;
        } else {
          nameWin = "";
        }

        combatArray.push([
          combat.match.no,
          combat.match.type,
          combat.match.category,
          combat.fighters.redFighter.name,
          combat.fighters.redFighter.code,
          combat.fighters.redFighter.country,
          combat.fighters.blueFighter.name,
          combat.fighters.blueFighter.code,
          combat.fighters.blueFighter.country,
          nameWin
        ]);
      }
    }

    this.setState({ combatArray, bracketHtml });
  }

  /** Cot cua bang tran dau. Dinh nghia mot lan, dung cho ca bang va the mobile. */
  columns: Column<any[]>[] = [
    {
      key: 'no',
      header: 'Mã',
      align: 'center',
      primary: true,
      render: (row) => (
        <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono text-sm">{row[0]}</span>
      ),
    },
    {
      key: 'type',
      header: 'Trận',
      mobileLabel: 'Trận',
      render: (row) => <span className="text-sm text-slate-600">{row[1]}</span>,
    },
    {
      key: 'category',
      header: 'Hạng cân',
      mobileLabel: 'Hạng cân',
      primary: true,
      render: (row) => (
        <span className="bg-accent-50 text-accent-700 border border-accent-200 px-2 py-1 rounded text-sm font-medium">
          {row[2]}
        </span>
      ),
    },
    {
      key: 'redName',
      header: (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 bg-red-400 rounded-full" />VĐV Đỏ
        </span>
      ),
      mobileLabel: 'VĐV Đỏ',
      render: (row) => <span className="font-medium text-red-600">{row[3]}</span>,
    },
    {
      key: 'redCode',
      header: 'MSSV',
      mobileLabel: 'MSSV đỏ',
      render: (row) => <span className="text-sm text-slate-500">{row[4]}</span>,
    },
    {
      key: 'redCountry',
      header: 'Quốc gia',
      hideOnMobile: true,
      render: (row) => <span className="text-sm text-slate-500">{row[5]}</span>,
    },
    {
      key: 'blueName',
      header: (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 bg-blue-400 rounded-full" />VĐV Xanh
        </span>
      ),
      mobileLabel: 'VĐV Xanh',
      render: (row) => <span className="font-medium text-blue-600">{row[6]}</span>,
    },
    {
      key: 'blueCode',
      header: 'MSSV',
      mobileLabel: 'MSSV xanh',
      render: (row) => <span className="text-sm text-slate-500">{row[7]}</span>,
    },
    {
      key: 'blueCountry',
      header: 'Quốc gia',
      hideOnMobile: true,
      render: (row) => <span className="text-sm text-slate-500">{row[8]}</span>,
    },
    {
      key: 'win',
      header: (
        <span className="inline-flex items-center gap-1.5">
          <i className="fa-solid fa-trophy text-amber-300" aria-hidden="true" />Thắng
        </span>
      ),
      align: 'center',
      mobileLabel: 'Thắng',
      render: (row) =>
        row[9] ? (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold
              ${row[9] === row[3] ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
          >
            <i className="fa-solid fa-trophy text-xs" aria-hidden="true" />
            {row[9]}
          </span>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        ),
    },
  ];

  render() {
    const { tournaments, categoryArray, combatArray, tournamentName, selectedTournament, selectedCategory } = this.state;

    return (
      <PageShell accent="combat">
        <PageHeader title="Thông tin đối kháng" icon="fa-solid fa-sitemap" badge={tournamentName}>
          <ChipGroup
            label="Giải đấu:"
            icon="fa-solid fa-trophy"
            options={tournaments.map((tournament, i) => ({ value: i, label: tournament[1] }))}
            selected={selectedTournament}
            onSelect={this.chooseTournament}
            emphasis
          />
          <ChipGroup
            label="Hạng cân:"
            icon="fa-solid fa-filter"
            options={categoryArray.map((category) => ({
              value: category,
              label: category === 'ALL' ? 'Tất cả' : category,
            }))}
            selected={selectedCategory}
            onSelect={this.chooseCategory}
          />
        </PageHeader>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4">
          <DataTable
            columns={this.columns}
            rows={combatArray}
            rowKey={(row, i) => `${row[0]}-${i}`}
            emptyTitle="Chưa có dữ liệu trận đấu"
            emptyHint="Hãy tạo giải và nhập danh sách vận động viên ở trang Tạo giải."
          />

          {/* So do chi ve duoc khi da chon mot hang can cu the */}
          {selectedCategory !== 'ALL' && selectedCategory !== '' && (
            <section>
              <h2 className="text-base font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-sitemap text-accent-600" aria-hidden="true" />
                Sơ đồ thi đấu - {selectedCategory}
              </h2>
              <div className="bg-white rounded-card shadow-card border border-slate-100 p-2 sm:p-3">
                <div ref={this.bracketRef} id="schema-bracket" className="scroll-x" />
              </div>
            </section>
          )}
        </main>

        <AppFooter />
      </PageShell>
    );
  }
}

export default InformationDkContainer;
