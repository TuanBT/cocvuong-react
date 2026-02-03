import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, child, Database } from "firebase/database";
import logo from '../assets/img/logo.png';
import '../assets/lib/table/style.css';
import '../assets/lib/table/basictable.css';

interface InformationTqContainerProps {}

interface InformationTqContainerState {
  tournaments: [number, string][];
  categoryArray: string[];
  martialArray: any[][];
  tournamentName: string;
  isShowFiveReferee: boolean;
  selectedTournament: number;
  selectedCategory: string;
}

interface MartialTeam {
  no: number;
  finalScore: number;
  fighters: {
    fighter: {
      name: string;
      code: string;
    };
  }[];
  refereeMartial: {
    score: number;
  }[];
}

interface Martial {
  match: {
    name: string;
  };
  team: MartialTeam[];
}

class InformationTqContainer extends Component<InformationTqContainerProps, InformationTqContainerState> {
  db: Database;
  martialObj: Martial[] | null = null;
  tournamentObj: any[] | null = null;
  settingObj: any = null;
  tournamentNoIndex: number = 0;

  constructor(props: InformationTqContainerProps) {
    super(props);
    document.title = 'Thông Tin Thi Quyền';
    
    this.state = {
      tournaments: [],
      categoryArray: [],
      martialArray: [],
      tournamentName: '',
      isShowFiveReferee: false,
      selectedTournament: 0,
      selectedCategory: 'ALL',
    };
    
    this.db = database;
  }

  componentDidMount() {
    this.main();
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
        this.setState({ 
          tournamentName: this.settingObj.tournamentName,
          isShowFiveReferee: this.settingObj.martial?.isShowFiveReferee || false
        });
      }
    });

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/martial/')).then((snapshot) => {
      this.martialObj = snapshot.val();
      this.showListInfo();
    });
  }

  showListMatchs(category: string) {
    if (!this.settingObj || !this.martialObj) return;
    
    const isShowFiveReferee = this.settingObj.martial?.isShowFiveReferee || false;
    const martialArray: any[][] = [];
    
    for (let i = 0; i < this.martialObj.length; i++) {
      if (this.martialObj[i].match.name === category || category === "ALL") {
        // Sắp xếp mảng team theo finalScore giảm dần
        this.martialObj[i].team.sort((a, b) => b.finalScore - a.finalScore);

        const matchName = this.martialObj[i].match.name;
        let matchNameRow = "";

        for (let j = 0; j < this.martialObj[i].team.length; j++) {
          const martial = this.martialObj[i].team[j];
          const matchNo = martial.no;
          let matchNoRow: number | string = "";
          const matchFinalScore = martial.finalScore;
          let matchFinalScoreRow: number | string = "";
          let rankRow: number | string = "";
          const arrayScore: number[] = [];
          
          for (let l = 0; l < this.martialObj[i].team.length; l++) {
            arrayScore.push(this.martialObj[i].team[l].finalScore);
          }
          
          for (let k = 0; k < this.martialObj[i].team[j].fighters.length; k++) {
            const fighter = this.martialObj[i].team[j].fighters[k];

            if (matchNoRow !== "") {
              if (matchNo === matchNoRow) {
                matchNoRow = "";
                matchNameRow = "";
                matchFinalScoreRow = "";
                rankRow = "";
              }
            } else {
              matchNoRow = matchNo;
              matchNameRow = matchName;
              matchFinalScoreRow = matchFinalScore;
              rankRow = this.getRank(martial.finalScore, arrayScore);
            }

            martialArray.push([
              matchNoRow,
              fighter.fighter.name,
              fighter.fighter.code,
              matchNameRow,
              martial.refereeMartial[0]?.score || 0,
              martial.refereeMartial[1]?.score || 0,
              martial.refereeMartial[2]?.score || 0,
              martial.refereeMartial[3]?.score || 0,
              martial.refereeMartial[4]?.score || 0,
              matchFinalScoreRow,
              rankRow
            ]);
          }
        }
      }
    }

    this.setState({ martialArray, isShowFiveReferee });
  }

  getRank(score: number, arrayScore: number[]): number {
    if (score === 0) {
      return 0;
    }

    // Sắp xếp mảng điểm môn võ thuật theo thứ tự giảm dần
    const sortedScores = [...arrayScore].sort((a, b) => b - a);

    // Tìm thứ hạng của điểm
    let rank = 1;
    for (let i = 0; i < sortedScores.length; i++) {
      if (score === sortedScores[i]) {
        break;
      }
      rank++;
    }

    return rank;
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
    if (this.martialObj && this.martialObj.length > 0) {
      const categoryArray: string[] = ["ALL"];
      for (let i = 0; i < this.martialObj.length; i++) {
        if (!categoryArray.includes(this.martialObj[i].match.name)) {
          categoryArray.push(this.martialObj[i].match.name);
        }
      }
      this.setState({ categoryArray, selectedCategory: "ALL" }, () => {
        this.showListMatchs("ALL");
      });
    } else {
      // Giải chưa có thông tin thi quyền - reset state
      this.setState({ categoryArray: [], martialArray: [], selectedCategory: "" });
    }
  }

  render() {
    const { tournaments, categoryArray, martialArray, tournamentName, isShowFiveReferee, selectedTournament, selectedCategory } = this.state;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a 
                  href="/" 
                  title="Về Trang chủ" 
                  className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-emerald-500 hover:to-teal-500 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all group"
                >
                  <i className="fa-solid fa-home text-slate-500 group-hover:text-white text-sm"></i>
                </a>
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow">
                  <i className="fa-solid fa-hand-fist text-white text-sm"></i>
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-800">Thông tin Thi Quyền</h1>
                  {tournamentName && (
                    <p className="text-xs text-emerald-600 font-medium whitespace-pre-line break-words max-w-[250px] leading-tight">{tournamentName}</p>
                  )}
                </div>
              </div>
              <img src={logo} alt="Logo" className="h-8 opacity-70" />
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                Nội dung:
              </span>
              {categoryArray.map((category, i) => (
                <button 
                  key={i}
                  onClick={() => this.chooseCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category 
                      ? 'bg-orange-500 text-white shadow-md' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {category === 'ALL' ? 'Tất cả' : category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Martial Table */}
        <div className="max-w-7xl mx-auto px-4 pb-6">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">STT</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Họ và Tên</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">MSSV/Đơn vị</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nội dung</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">GĐ 1</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">GĐ 2</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">GĐ 3</th>
                    {isShowFiveReferee && (
                      <>
                        <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">GĐ 4</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">GĐ 5</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
                      <i className="fa-solid fa-calculator mr-1"></i>
                      Tổng
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
                      <i className="fa-solid fa-medal mr-1"></i>
                      Hạng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {martialArray.length > 0 ? martialArray.map((martial, i) => (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-3 text-center">
                        {martial[0] ? (
                          <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono text-sm">{martial[0]}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{martial[1]}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{martial[2]}</td>
                      <td className="px-4 py-3">
                        {martial[3] ? (
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-medium">{martial[3]}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-600 font-medium">{martial[4] || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-600 font-medium">{martial[5] || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-600 font-medium">{martial[6] || '—'}</span>
                      </td>
                      {isShowFiveReferee && (
                        <>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-600 font-medium">{martial[7] || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-600 font-medium">{martial[8] || '—'}</span>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center">
                        {martial[9] ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">{martial[9]}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {martial[10] === 1 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">
                            <i className="fa-solid fa-trophy text-xs"></i>
                            1
                          </span>
                        ) : martial[10] === 2 ? (
                          <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold">
                            <i className="fa-solid fa-medal text-xs"></i>
                            2
                          </span>
                        ) : martial[10] === 3 ? (
                          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">
                            <i className="fa-solid fa-award text-xs"></i>
                            3
                          </span>
                        ) : martial[10] ? (
                          <span className="text-slate-500">{martial[10]}</span>
                        ) : null}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={isShowFiveReferee ? 11 : 9} className="px-4 py-12 text-center text-slate-400">
                        <i className="fa-solid fa-inbox text-4xl mb-2"></i>
                        <p>Chưa có dữ liệu thi quyền</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

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

export default InformationTqContainer;
