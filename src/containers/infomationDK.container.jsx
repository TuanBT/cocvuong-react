import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import "../assets/css/style.css";
import '../assets/lib/table/style.css';
import '../assets/lib/table/basictable.css';

class InformationDkContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();
    this.tournamentObj;

    this.ref.once('value', function (snapshot) {
      me.tournamentObj = snapshot.val();
      me.showListInfo();

      $(".btn").click(
        function () {
          let value = $('input[name="optionCategory"]:checked').val();
          me.showListMatchs(value);
        }
      )
    });

    this.ref.on('value', function (snapshot) {
        me.tournamentObj = snapshot.val();
        let value = $('input[name="optionCategory"]:checked').val();
        me.showListMatchs(value);
    });

    this.brackets = [];
    me.brackets.push("");//0
    me.brackets.push("");//1
    me.brackets.push("");//2
    me.brackets.push("");//3
    me.brackets.push("<div class='brackets-4'> <div class='brackets'> <div class='group3'> <div class='r1'> <div> <div id='match-1' class='bracketbox'> <span class='info'>1</span> <span class='teama'>abc</span> <span class='teamb'></span> </div> </div> <div> <div id='match-2' class='bracketbox'> <span class='info'>2</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r2'> <div> <div id='match-3' class='bracketbox'> <span class='info'>3</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r3'> <div id='match-0' class='final'> <div class='bracketbox'> <span class='teamc'></span> </div> </div> </div> </div> </div> </div>");
    me.brackets.push("<div class='brackets-5'> <div class='brackets'> <div class='group4'> <div class='r1'> <div></div> <div></div> <div> <div id='match-1' class='bracketbox'> <span class='info'>1</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div></div> </div> <div class='r2'> <div> <div id='match-2' class='bracketbox'> <span class='info'>2</span> <span class='teama'></span> <span class='teamb'></span></div> </div> <div> <div id='match-3' class='bracketbox'> <span class='info'>3</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r3'> <div> <div id='match-4' class='bracketbox'> <span class='info'>4</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r4'> <div class='final'> <div class='bracketbox'> <span class='teamc'></span> </div> </div> </div> </div> </div> </div>");
    me.brackets.push("<div class='brackets-6'> <div class='brackets'> <div class='group4'> <div class='r1'> <div></div> <div> <div id='match-1' class='bracketbox'> <span class='info'>1</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-2' class='bracketbox'> <span class='info'>2</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div></div> </div> <div class='r2'> <div> <div id='match-3' class='bracketbox'> <span class='info'>3</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-4' class='bracketbox'> <span class='info'>4</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r3'> <div> <div id='match-5' class='bracketbox'> <span class='info'>5</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r4'> <div class='final'> <div class='bracketbox'> <span class='teamc'></span> </div> </div> </div> </div> </div> </div> ");
    me.brackets.push("<div class='brackets-7'> <div class='brackets'> <div class='group4'> <div class='r1'> <div></div> <div> <div id='match-1' class='bracketbox'> <span class='info'>1</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-2' class='bracketbox'> <span class='info'>2</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-3' class='bracketbox'> <span class='info'>3</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r2'> <div> <div id='match-4' class='bracketbox'> <span class='info'>4</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-5' class='bracketbox'> <span class='info'>5</span> <span class='teama'></span><span class='teamb'></span> </div> </div> </div> <div class='r3'> <div> <div id='match-6' class='bracketbox'> <span class='info'>6</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r4'> <div class='final'> <div class='bracketbox'> <span class='teamc'></span> </div> </div> </div> </div> </div>");
    me.brackets.push("<div class='brackets-8'> <div class='brackets'> <div class='group4'> <div class='r1'> <div> <div id='match-1' class='bracketbox'> <span class='info'>1</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-2' class='bracketbox'> <span class='info'>2</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-3' class='bracketbox'> <span class='info'>3</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-4' class='bracketbox'> <span class='info'>4</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r2'> <div> <div id='match-5' class='bracketbox'> <span class='info'>5</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> <div> <div id='match-6' class='bracketbox'> <span class='info'>6</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r3'> <div> <div id='match-7' class='bracketbox'> <span class='info'>7</span> <span class='teama'></span> <span class='teamb'></span> </div> </div> </div> <div class='r4'> <div class='final'> <div class='bracketbox'> <span class='teamc'></span> </div> </div> </div> </div> </div> </div>");
    me.brackets.push("<div class='brackets-9'> <div class='brackets'> <div class='group5' id='b0'> <div class='r1'> <div></div><div></div><div></div><div></div><div></div><div></div><div> <div id='match-1' class='bracketbox'> <span class='info'>1</span> <span class='teama'>7</span> <span class='teamb'>8</span> </div></div><div></div></div><div class='r2'> <div> <div id='match-2' class='bracketbox'> <span class='info'>2</span> <span class='teama'>1</span> <span class='teamb'>2</span> </div></div><div> <div id='match-3' class='bracketbox'> <span class='info'>3</span> <span class='teama'>3</span> <span class='teamb'>4</span> </div></div><div> <div id='match-4' class='bracketbox'> <span class='info'>4</span> <span class='teama'>5</span> <span class='teamb'>6</span> </div></div><div> <div id='match-5' class='bracketbox'> <span class='info'>5</span> <span class='teama'></span> <span class='teamb'>9</span> </div></div></div><div class='r3'> <div> <div id='match-6' class='bracketbox'> <span class='info'>6</span> <span class='teama'></span> <span class='teamb'></span> </div></div><div> <div id='match-7' class='bracketbox'> <span class='info'>7</span> <span class='teama'></span> <span class='teamb'></span> </div></div></div><div class='r4'> <div> <div id='match-8' class='bracketbox'> <span class='info'>8</span> <span class='teama'></span> <span class='teamb'></span> </div></div></div><div class='r5'> <div class='final'> <div class='bracketbox'> <span class='teamc'></span> </div></div></div></div></div></div>");
  }

  showListInfo() {
    if (this.tournamentObj && this.tournamentObj.tournament.length > 0) {
      let categoryArray = [];
      for (let i = 0; i < this.tournamentObj.tournament.length; i++) {
        if (!categoryArray.includes(this.tournamentObj.tournament[i].match.category)) {
          categoryArray.push(this.tournamentObj.tournament[i].match.category);
          $(".category-radio").append(
            "<label class='btn btn-warning'><input type='radio' name='optionCategory' value='" + this.tournamentObj.tournament[i].match.category + "' autocomplete='off'>" + this.tournamentObj.tournament[i].match.category + "</label>"
          );
        }

      }
      this.showListMatchs("ALL");
    }
  }

  showListMatchs(category) {
    $(".tbl-tournament-info").html("");
    $(".tbl-tournament-info").append($(".tbl-header-tournament-info").html());
    $('#schema-bracket').html("");
    // let matchNum = 0;
    let nameWin = "";
    let fighters = [];
    for (let i = 0; i < this.tournamentObj.tournament.length; i++) {
      if (this.tournamentObj.tournament[i].match.category === category || category === "ALL") {
        // matchNum++;
        let tournament = this.tournamentObj.tournament[i];
        if (!fighters.includes(tournament.fighters.redFighter.name) && !tournament.fighters.redFighter.name.includes("W.") && !tournament.fighters.redFighter.name.includes("L.")) {
          fighters.push(tournament.fighters.redFighter.name);
        }
        if (!fighters.includes(tournament.fighters.blueFighter.name) && !tournament.fighters.blueFighter.name.includes("W.") && !tournament.fighters.blueFighter.name.includes("L.")) {
          fighters.push(tournament.fighters.blueFighter.name);
        }
      }
    }
    //COPY m???t schema v??o id schema-bracket
    $('#schema-bracket').html(this.brackets[fighters.length]);

    let matchNo = 0;
    for (let i = 0; i < this.tournamentObj.tournament.length; i++) {
      if (this.tournamentObj.tournament[i].match.category === category || category === "ALL") {
        let tournament = this.tournamentObj.tournament[i];

        nameWin = "";
        if (tournament.match.win === "red") {
          nameWin = tournament.fighters.redFighter.name;
        } else if (tournament.match.win === "blue") {
          nameWin = tournament.fighters.blueFighter.name
        } else {
          nameWin = "";
        }

        $(".tbl-tournament-info").append(
          "<tr>" +
          "<td class='text-center'>" + tournament.match.no + "</td>" +
          "<td>" + tournament.match.type + "</td>" +
          "<td>" + tournament.match.category + "</td>" +
          "<td>" + tournament.fighters.redFighter.name + "</td>" +
          "<td>" + tournament.fighters.redFighter.code + "</td>" +
          "<td>" + tournament.fighters.blueFighter.name + "</td>" +
          "<td>" + tournament.fighters.blueFighter.code + "</td>" +
          "<td>" + nameWin + "</td>" +
          "</tr>"
        )

        //V???i t???ng tr???n th?? nh??t 2 VDV v??o class info.html=1,2,3
        matchNo++;
        $('#match-' + matchNo + ' .info').html(tournament.match.no);
        $('#match-' + matchNo + ' .teama').html(tournament.fighters.redFighter.name);
        $('#match-' + matchNo + ' .teamb').html(tournament.fighters.blueFighter.name);

      }
    }

    //?????n tr???n final 
    $('.final .teamc').html(nameWin);
  }



  render() {
    return (
      <div>
        <div className="container">
          <header className="blog-header py-3">
            <div className="row flex-nowrap justify-content-between align-items-center">
              <div className="col-4 pt-1">
                <h3 className="text-pomegrante">C??c V????ng 2022</h3>
              </div>
              <div className="col-4 text-center">
                <h2 className="blog-header-logo text-midnight-blue">Th??ng tin c??c tr???n ?????u ?????i kh??ng</h2>
              </div>
              <div className="col-4 d-flex justify-content-end align-items-center">
                <span className="text-muted">
                  <img src={logo} alt="..." className="img-fluid" style={{ height: "38px" }} />
                </span>
              </div>
            </div>
          </header>
        </div>

        <div className="category-buttons">
          <div className="btn-group btn-group-toggle category-radio" data-toggle="buttons">
            <label className="btn btn-warning active">
              <input type="radio" name="optionCategory" value="ALL" defaultChecked />ALL
            </label>
          </div>
        </div>

        <div className=" tbl-info">
          <table className="tbl-header-tournament-info" id="table" style={{ display: "none" }}>
            <tbody>
              <tr>
                <th className="text-center">
                  M?? tr???n ?????u
                </th>
                <th>
                  Tr???n
                </th>
                <th>
                  H???ng c??n
                </th>
                <th>
                  V???n ?????ng vi??n ?????
                </th>
                <th>
                  MSSV
                </th>
                <th>
                  V???n ?????ng vi??n xanh
                </th>
                <th>
                  MSSV
                </th>
                <th>
                  Ng?????i th???ng
                </th>
              </tr>
            </tbody>
          </table>
          <table className="tbl-tournament-info">
          </table>
        </div>

        <div id="schema-bracket">
        </div>

      </div>
    );
  }
}

export default InformationDkContainer;
