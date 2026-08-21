import React, { Component, createRef, RefObject } from 'react';
import { database } from '../firebase';
import { ref, get, child, Database } from "firebase/database";
import logo from '../assets/img/logo.png';
import '../assets/lib/table/style.css';
import '../assets/lib/table/basictable.css';
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

  render() {
    const { tournaments, categoryArray, combatArray, tournamentName, selectedTournament, selectedCategory } = this.state;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-10">
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
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                  <i className="fa-solid fa-fist-raised text-white text-sm"></i>
                </div>
                <h1 className="text-lg font-bold text-slate-800">Thông tin Đối Kháng</h1>
              </div>
              
              {/* Right: Tournament name badge */}
              {tournamentName ? (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 py-1.5 max-w-[300px]">
                  <p className="text-xs text-amber-700 font-medium whitespace-pre-line" title={tournamentName}>
                    {tournamentName}
                  </p>
                </div>
              ) : (
                <div className="w-[100px]"></div>
              )}
            </div>
          </div>
        </header>

        {/* Tournament Selection */}
        {tournaments.length > 0 && (
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500 font-medium mr-2">
                  <i className="fa-solid fa-trophy mr-1"></i>
                  Giải đấu:
                </span>
                {tournaments.map((tournament, i) => (
                  <button 
                    key={i}
                    onClick={() => this.chooseTournament(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-pre-line transition-all ${
                      selectedTournament === i 
                        ? 'bg-amber-500 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tournament[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        {categoryArray.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 font-medium mr-2">
                <i className="fa-solid fa-filter mr-1"></i>
                Hạng cân:
              </span>
              {categoryArray.map((category, i) => (
                <button 
                  key={i}
                  onClick={() => this.chooseCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category 
                      ? 'bg-emerald-500 text-white shadow-md' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {category === 'ALL' ? 'Tất cả' : category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Match Table */}
        <div className="max-w-7xl mx-auto px-4 pb-6">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Mã</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Trận</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Hạng cân</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                        VĐV Đỏ
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">MSSV</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Quốc gia</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        VĐV Xanh
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">MSSV</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Quốc gia</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
                      <i className="fa-solid fa-trophy text-amber-400 mr-1"></i>
                      Thắng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {combatArray.length > 0 ? combatArray.map((combat, i) => (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono text-sm">{combat[0]}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{combat[1]}</td>
                      <td className="px-4 py-3">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-sm font-medium">{combat[2]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-red-600">{combat[3]}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{combat[4]}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{combat[5]}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-blue-600">{combat[6]}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{combat[7]}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{combat[8]}</td>
                      <td className="px-4 py-3 text-center">
                        {combat[9] ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                            combat[9] === combat[3] 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            <i className="fa-solid fa-trophy text-xs"></i>
                            {combat[9]}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                        <i className="fa-solid fa-inbox text-4xl mb-2"></i>
                        <p>Chưa có dữ liệu trận đấu</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bracket Section - only show when a specific category is selected */}
        {selectedCategory !== 'ALL' && (
          <div className="max-w-7xl mx-auto px-4 pb-6">
            <h3 className="text-lg font-bold text-slate-700 mb-3">
              <i className="fa-solid fa-sitemap mr-2 text-amber-500"></i>
              Sơ đồ thi đấu - {selectedCategory}
            </h3>
            <div ref={this.bracketRef} id="schema-bracket" className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 overflow-x-auto"></div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-center text-sm text-slate-400">©Tuân 2022</p>
          </div>
        </footer>
      </div>
    );
  }
}

export default InformationDkContainer;
