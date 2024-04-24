import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import '../assets/lib/table/style.css';
import '../assets/lib/table/basictable.css';
import { connectStorageEmulator } from 'firebase/storage';

class InformationTqContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.state = {
      data: [],
    };
    this.db = Firebase();
    this.martialObj;
    this.settingObj;
    this.tournamentNoIndex = 0;


    this.main();
  }


  main() {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournaments = [];

      for (let i = 0; i < this.tournamentObj.length; i++) {
        this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
      }
      this.setState({ data: this.tournaments });
    })

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
    })

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/martial/')).then((snapshot) => {
      this.martialObj = snapshot.val();
      this.categoryArray = [];
      this.showListInfo();
    });

  }

  showListMatchs(category) {
    $(".tbl-tournament-info").html("");
    if (this.settingObj.isShowFiveReferee === true) {
      $(".tbl-tournament-info").append($(".tbl-header-tournament-info-5").html());
    } else {
      $(".tbl-tournament-info").append($(".tbl-header-tournament-info-3").html());
    }

    for (let i = 0; i < this.martialObj.length; i++) {
      if (this.martialObj[i].match.name === category || category === "ALL") {
        // Sắp xếp mảng team theo finalScore giảm dần
        this.martialObj[i].team.sort((a, b) => b.finalScore - a.finalScore);

        let matchName = this.martialObj[i].match.name;
        let matchNameRow = "";

        for (let j = 0; j < this.martialObj[i].team.length; j++) {
          let martial = this.martialObj[i].team[j];
          let matchNo = martial.no;
          let matchNoRow = "";
          let matchFinalScore = martial.finalScore;
          let matchFinalScoreRow = "";
          let rankRow = "";
          let arrayScore = [];
          for (let l = 0; l < this.martialObj[i].team.length; l++) {
            arrayScore.push(this.martialObj[i].team[l].finalScore);
          }
          for (let k = 0; k < this.martialObj[i].team[j].fighters.length; k++) {
            let fighter = this.martialObj[i].team[j].fighters[k];
            let refereeMartialElement = "";

            if (matchNoRow !== "") {
              if (matchNo === matchNoRow) {
                matchNoRow = "";
                matchNameRow = "";
                matchFinalScoreRow = "";
                if (this.settingObj.isShowFiveReferee === true) {
                  refereeMartialElement =
                    "<td></td>" +
                    "<td></td>" +
                    "<td></td>" +
                    "<td></td>" +
                    "<td></td>";
                } else {
                  refereeMartialElement =
                    "<td></td>" +
                    "<td></td>" +
                    "<td></td>";
                }
                rankRow = "";
              }
            } else {
              matchNoRow = matchNo;
              matchNameRow = matchName;
              matchFinalScoreRow = matchFinalScore;
              if (this.settingObj.isShowFiveReferee === true) {
                refereeMartialElement =
                  "<td>" + martial.refereeMartial[0].score + "</td>" +
                  "<td>" + martial.refereeMartial[1].score + "</td>" +
                  "<td>" + martial.refereeMartial[2].score + "</td>" +
                  "<td>" + martial.refereeMartial[3].score + "</td>" +
                  "<td>" + martial.refereeMartial[4].score + "</td>";
              } else {
                refereeMartialElement =
                  "<td>" + martial.refereeMartial[0].score + "</td>" +
                  "<td>" + martial.refereeMartial[1].score + "</td>" +
                  "<td>" + martial.refereeMartial[2].score + "</td>";
              }
              rankRow = this.getRank(martial.finalScore, arrayScore);
            }

            $(".tbl-tournament-info").append(
              "<tr>" +
              "<td class='text-center'>" + matchNoRow + "</td>" +
              "<td>" + fighter.fighter.name + "</td>" +
              "<td>" + fighter.fighter.code + "</td>" +
              "<td>" + matchNameRow + "</td>" +
              refereeMartialElement +
              "<td>" + matchFinalScoreRow + "</td>" +
              "<td>" + rankRow + "</td>" +
              "</tr>"
            )
          }
        }
      }
    }
  }

  getRank(score, arrayScore) {
    if (score === 0) {
      return 0;
    }

    // Sắp xếp mảng điểm môn võ thuật theo thứ tự giảm dần
    arrayScore.sort((a, b) => b - a);

    // Tìm thứ hạng của điểm
    let rank = 1;
    for (let i = 0; i < arrayScore.length; i++) {
      if (score === arrayScore[i]) {
        break;
      }
      rank++;
    }

    return rank;
  }

  chooseTournament = (tournamentNoIndex) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.main();
  }

  chooseCategory = (cateoryNoIndex) => {
    this.showListMatchs(cateoryNoIndex);
  }

  showListInfo() {
    $(".tbl-tournament-info").html("");
    if (this.martialObj && this.martialObj.length > 0) {
      this.categoryArray = ["ALL"];
      for (let i = 0; i < this.martialObj.length; i++) {
        if (!this.categoryArray.includes(this.martialObj[i].match.name)) {
          this.categoryArray.push(this.martialObj[i].match.name);
        }
      }
      this.setState({ data: this.categoryArray });
      this.showListMatchs("ALL");
      document.querySelector('input[name="optionCategory"]').checked = true;
    }
  }



  render() {
    return (
      <div>
        <div className="body" style={{ height: '100vh' }}>
          <div className="container">
            <header className="blog-header py-3">
              <div className="row flex-nowrap justify-content-between align-items-center">
                <div className="col-4 pt-1">
                  <h3 className="text-pomegrante" id="tournamentName"></h3>
                </div>
                <div className="col-4 text-center">
                  <h2 className="blog-header-logo text-midnight-blue">Thông tin các trận đấu thi quyền</h2>

                </div>
                <div className="col-4 d-flex justify-content-end align-items-center">
                  <span className="text-muted">
                    <img src={logo} alt="..." className="img-fluid" style={{ height: "38px" }} />
                  </span>
                </div>
              </div>
            </header>
            <hr className="mt-4 mb-2" />
            <header className="blog-header">
              <div className="row flex-nowrap justify-content-between align-items-center">
                <div className="category-buttons">
                  <section className="btn-group">
                    {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                      <div className='form-check' key={i} onClick={() => this.chooseTournament(i)}>
                        <input type="radio" className="btn-check" name="tournamentRadio" onClick={() => this.chooseTournament(i)} id={`tournamentRadio-${tournament[0]}`} value={tournament[1]} defaultChecked={i === 0} />
                        <label className="btn btn-outline-warning" htmlFor={`tournamentRadio-${tournament[0]}`}><i className="fas fa-caret-right"></i> {tournament[1]}</label>
                      </div>
                    )) : (
                      <div></div>
                    )}
                  </section>
                </div>
              </div>
            </header>
            <hr className="mt-2 mb-4" />
          </div>
          <div className="category-buttons">
            <section className="btn-group">
              {this.categoryArray && this.categoryArray.length > 0 ? this.categoryArray.map((category, i) => (
                <React.Fragment key={i - 1}>
                  <input type="radio" className="btn-check" name="optionCategory" onClick={() => this.chooseCategory(category)} id={`optionCategory-${i - 1}`} value={category} defaultChecked={i === 0} />
                  <label className="btn btn-outline-warning" htmlFor={`optionCategory-${i - 1}`}><i className="fa-solid fa-user"></i> {category}</label>
                </React.Fragment>
              )) : (
                <React.Fragment></React.Fragment>
              )}
            </section>
          </div>

          <div className=" tbl-info">
            <table className="tbl-header-tournament-info-3" id="table" style={{ display: "none" }}>
              <tbody>
                <tr>
                  <th className="text-center">
                    STT
                  </th>
                  <th>
                    Họ và Tên
                  </th>
                  <th>
                    MSSV/Đơn vị
                  </th>
                  <th>
                    Nội Dung
                  </th>
                  <th>
                    Giám Định 1
                  </th>
                  <th>
                    Giám Định 2
                  </th>
                  <th>
                    Giám Định 3
                  </th>
                  <th>
                    Tổng Điểm
                  </th>
                  <th>
                    Hạng
                  </th>
                </tr>
              </tbody>
            </table>
            <table className="tbl-header-tournament-info-5" id="table" style={{ display: "none" }}>
              <tbody>
                <tr>
                  <th className="text-center">
                    STT
                  </th>
                  <th>
                    Họ và Tên
                  </th>
                  <th>
                    MSSV/Đơn vị
                  </th>
                  <th>
                    Nội Dung
                  </th>
                  <th>
                    Giám Định 1
                  </th>
                  <th>
                    Giám Định 2
                  </th>
                  <th>
                    Giám Định 3
                  </th>
                  <th>
                    Giám Định 4
                  </th>
                  <th>
                    Giám Định 5
                  </th>
                  <th>
                    Tổng Điểm
                  </th>
                  <th>
                    Hạng
                  </th>
                </tr>
              </tbody>
            </table>
            <table className="tbl-tournament-info">
            </table>
          </div>



          <div className="container">
            <footer className="py-3 my-4">
              <ul className="nav justify-content-center border-bottom pb-3 mb-3">
              </ul>
              <p className="text-center text-muted">©Tuân 2022</p>
            </footer>
          </div>

        </div>
      </div>
    );
  }
}

export default InformationTqContainer;
