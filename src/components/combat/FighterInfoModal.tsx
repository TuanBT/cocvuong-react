import React, { Component, createRef, RefObject } from 'react';
import '../../assets/css/style.css';
import { BRACKET_TEMPLATES, updateBracketMatchInfo, addPathHoverListeners, CombatInfo } from '../../utils/bracketUtils';

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

interface FighterInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatObj: Combat[] | null;
  currentMatchNo: number;
  currentCategory: string;
  tournamentName?: string;
  arenaName?: string;
}

interface FighterInfoModalState {
  bracketHtml: string;
  selectedCategory: string;
}

class FighterInfoModal extends Component<FighterInfoModalProps, FighterInfoModalState> {
  bracketRef: RefObject<HTMLDivElement>;

  constructor(props: FighterInfoModalProps) {
    super(props);
    this.state = {
      bracketHtml: '',
      selectedCategory: props.currentCategory || 'ALL',
    };
    this.bracketRef = createRef();
  }

  componentDidUpdate(prevProps: FighterInfoModalProps, prevState: FighterInfoModalState) {
    // Update bracket when modal opens or category changes
    if (this.props.isOpen && (!prevProps.isOpen || prevState.selectedCategory !== this.state.selectedCategory)) {
      this.updateBracket();
    }
    
    // Update bracket HTML content and match info
    if (prevState.bracketHtml !== this.state.bracketHtml && this.bracketRef.current && this.state.selectedCategory !== 'ALL') {
      this.bracketRef.current.innerHTML = this.state.bracketHtml;
      if (this.props.combatObj) {
        updateBracketMatchInfo(
          this.bracketRef.current,
          this.props.combatObj as unknown as CombatInfo[],
          this.state.selectedCategory,
          this.props.currentMatchNo
        );
        addPathHoverListeners(this.bracketRef.current);
      }
    }

    // Update currentCategory when props change
    if (prevProps.currentCategory !== this.props.currentCategory && this.props.currentCategory) {
      this.setState({ selectedCategory: this.props.currentCategory });
    }
  }

  componentDidMount() {
    if (this.props.isOpen) {
      this.updateBracket();
    }
  }

  updateBracket() {
    const { combatObj } = this.props;
    const { selectedCategory } = this.state;
    
    if (!combatObj) return;

    const fighters: string[] = [];
    
    for (let i = 0; i < combatObj.length; i++) {
      if (combatObj[i].match.category === selectedCategory || selectedCategory === 'ALL') {
        const combat = combatObj[i];
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
    
    const bracketHtml = BRACKET_TEMPLATES[fighters.length] || '';
    this.setState({ bracketHtml });
  }

  getCombatArray() {
    const { combatObj, currentMatchNo } = this.props;
    const { selectedCategory } = this.state;
    
    if (!combatObj) return [];

    const combatArray: any[][] = [];
    
    for (let i = 0; i < combatObj.length; i++) {
      if (combatObj[i].match.category === selectedCategory || selectedCategory === "ALL") {
        const combat = combatObj[i];

        let nameWin = "";
        if (combat.match.win === "red") {
          nameWin = combat.fighters.redFighter.name;
        } else if (combat.match.win === "blue") {
          nameWin = combat.fighters.blueFighter.name;
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
          nameWin,
          combat.match.no === currentMatchNo // isCurrentMatch
        ]);
      }
    }

    return combatArray;
  }

  getCategoryArray() {
    const { combatObj } = this.props;
    
    if (!combatObj) return [];
    
    const categories: string[] = ['ALL'];
    
    for (let i = 0; i < combatObj.length; i++) {
      const category = combatObj[i].match.category;
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
    
    return categories;
  }

  render() {
    const { isOpen, onClose, currentMatchNo, tournamentName, arenaName } = this.props;
    const { selectedCategory } = this.state;
    const combatArray = this.getCombatArray();
    const categoryArray = this.getCategoryArray();

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-slate-700 to-slate-800 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow">
                <i className="fa-solid fa-fist-raised text-white"></i>
              </div>
              <div>
                <h5 className="text-lg font-semibold">
                  Thông tin Đối Kháng - Trận {currentMatchNo}
                </h5>
                {tournamentName && (
                  <p className="text-xs text-amber-400 font-medium">{arenaName ? `${arenaName} - ` : ''}{tournamentName.replace(/<br\s*\/?>/gi, ' ')}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">×</button>
          </div>

          {/* Category Filter */}
          {categoryArray.length > 1 && (
            <div className="px-6 py-3 border-b bg-slate-50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500 font-medium mr-2">
                  <i className="fa-solid fa-filter mr-1"></i>
                  Hạng cân:
                </span>
                {categoryArray.map((category, i) => (
                  <button 
                    key={i}
                    onClick={() => this.setState({ selectedCategory: category })}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Match Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap">Mã</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Trận</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Hạng cân</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          VĐV Đỏ
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">MSSV</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Đơn vị</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          VĐV Xanh
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">MSSV</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Đơn vị</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap">
                        <i className="fa-solid fa-trophy text-amber-500 mr-1"></i>
                        Thắng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combatArray.length > 0 ? combatArray.map((combat, i) => (
                      <tr 
                        key={i} 
                        className={`border-b border-slate-100 transition-colors ${
                          combat[10] 
                            ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset' 
                            : i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'
                        }`}
                      >
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded font-mono text-xs ${combat[10] ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {combat[0]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{combat[1]}</td>
                        <td className="px-3 py-2">
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">{combat[2]}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`font-medium text-red-600 text-sm ${combat[10] ? 'font-bold' : ''}`}>{combat[3]}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{combat[4]}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{combat[5]}</td>
                        <td className="px-3 py-2">
                          <span className={`font-medium text-blue-600 text-sm ${combat[10] ? 'font-bold' : ''}`}>{combat[6]}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{combat[7]}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{combat[8]}</td>
                        <td className="px-3 py-2 text-center">
                          {combat[9] ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              combat[9] === combat[3] 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              <i className="fa-solid fa-trophy text-[10px]"></i>
                              {combat[9]}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                          <i className="fa-solid fa-inbox text-3xl mb-2"></i>
                          <p className="text-sm">Chưa có dữ liệu trận đấu</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bracket Section - only show when a specific category is selected */}
            {selectedCategory !== 'ALL' && (
              <div>
                <h3 className="text-base font-bold text-slate-700 mb-3">
                  <i className="fa-solid fa-sitemap mr-2 text-amber-500"></i>
                  Sơ đồ thi đấu - {selectedCategory}
                </h3>
                <div ref={this.bracketRef} id="schema-bracket-modal" className="bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-x-auto"></div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t bg-slate-50">
            <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors">
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default FighterInfoModal;
