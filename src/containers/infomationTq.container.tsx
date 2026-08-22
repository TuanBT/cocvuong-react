import React, { Component } from 'react';
import { database } from '../firebase';
import { ref, get, child, Database } from "firebase/database";
import { PageShell, PageHeader, ChipGroup, DataTable, AppFooter } from '../components/ui';
import type { Column } from '../components/ui';

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

  /** Cot bang diem. So cot doi theo giai dung 3 hay 5 giam dinh. */
  buildColumns(isShowFiveReferee: boolean): Column<any[]>[] {
    const refereeCount = isShowFiveReferee ? 5 : 3;
    const refereeColumns: Column<any[]>[] = [];

    for (let position = 1; position <= refereeCount; position += 1) {
      const cellIndex = 3 + position; // martial[4] la GD1
      refereeColumns.push({
        key: `gd${position}`,
        header: `GĐ ${position}`,
        align: 'center',
        mobileLabel: `GĐ ${position}`,
        render: (row) => <span className="text-slate-600 font-medium">{row[cellIndex] || '—'}</span>,
      });
    }

    return [
      {
        key: 'no',
        header: 'STT',
        align: 'center',
        primary: true,
        render: (row) =>
          row[0] ? (
            <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono text-sm">{row[0]}</span>
          ) : null,
      },
      {
        key: 'name',
        header: 'Họ và tên',
        primary: true,
        render: (row) => <span className="font-semibold text-slate-800">{row[1]}</span>,
      },
      {
        key: 'code',
        header: 'MSSV / Đơn vị',
        mobileLabel: 'MSSV / Đơn vị',
        render: (row) => <span className="text-sm text-slate-500">{row[2]}</span>,
      },
      {
        key: 'content',
        header: 'Nội dung',
        mobileLabel: 'Nội dung',
        render: (row) =>
          row[3] ? (
            <span className="bg-accent-50 text-accent-700 border border-accent-200 px-2 py-1 rounded text-sm font-medium">
              {row[3]}
            </span>
          ) : null,
      },
      ...refereeColumns,
      {
        key: 'total',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <i className="fa-solid fa-calculator" aria-hidden="true" />Tổng
          </span>
        ),
        align: 'center',
        mobileLabel: 'Tổng điểm',
        render: (row) =>
          row[9] ? (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">{row[9]}</span>
          ) : null,
      },
      {
        key: 'rank',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <i className="fa-solid fa-medal" aria-hidden="true" />Hạng
          </span>
        ),
        align: 'center',
        mobileLabel: 'Xếp hạng',
        render: (row) => this.renderRank(row[10]),
      },
    ];
  }

  /** Ba hang dau co huy hieu rieng de doc luot van thay ngay ai nhat nhi ba. */
  renderRank(rank: number) {
    const MEDALS: { [key: number]: { icon: string; className: string } } = {
      1: { icon: 'fa-solid fa-trophy', className: 'bg-amber-100 text-amber-700' },
      2: { icon: 'fa-solid fa-medal', className: 'bg-slate-200 text-slate-700' },
      3: { icon: 'fa-solid fa-award', className: 'bg-orange-100 text-orange-700' },
    };

    const medal = MEDALS[rank];
    if (medal) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-bold ${medal.className}`}>
          <i className={`${medal.icon} text-xs`} aria-hidden="true" />
          {rank}
        </span>
      );
    }

    return rank ? <span className="text-slate-500">{rank}</span> : null;
  }

  render() {
    const { tournaments, categoryArray, martialArray, tournamentName, isShowFiveReferee,
      selectedTournament, selectedCategory } = this.state;

    return (
      <PageShell accent="martial">
        <PageHeader title="Thông tin thi quyền" icon="fa-solid fa-table-list" badge={tournamentName}>
          <ChipGroup
            label="Giải đấu:"
            icon="fa-solid fa-trophy"
            options={tournaments.map((tournament, i) => ({ value: i, label: tournament[1] }))}
            selected={selectedTournament}
            onSelect={this.chooseTournament}
            emphasis
          />
          <ChipGroup
            label="Nội dung:"
            icon="fa-solid fa-filter"
            options={categoryArray.map((category) => ({
              value: category,
              label: category === 'ALL' ? 'Tất cả' : category,
            }))}
            selected={selectedCategory}
            onSelect={this.chooseCategory}
          />
        </PageHeader>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4">
          <DataTable
            columns={this.buildColumns(isShowFiveReferee)}
            rows={martialArray}
            rowKey={(row, i) => `${row[0]}-${i}`}
            emptyTitle="Chưa có dữ liệu thi quyền"
            emptyHint="Hãy tạo giải và nhập danh sách thi quyền ở trang Tạo giải."
          />
        </main>

        <AppFooter />
      </PageShell>
    );
  }
}

export default InformationTqContainer;
