import React, { Component, useState } from 'react';
import $ from 'jquery';
import "../assets/css/style.css";

class TestContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
    };

    this.schemaFighters = [];
    this.schemaFighters.push([]); //0
    this.schemaFighters.push([]); //1
    //2
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Chung Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }]);
    //3
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }, { match: 2, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 3, code: 3 } },]);
    //4      
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }, { match: 2, weight: 1, type: 'Bán Kết', redFighter: { name: 3, code: 3 }, blueFighter: { name: 4, code: 4 } }, { match: 3, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 'W.2', code: '' } },]);
    //5
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 3, code: 3 }, blueFighter: { name: 4, code: 4 } }, { match: 2, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }, { match: 3, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 5, code: 5 } }, { match: 4, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 'W.3', code: '' } }]);
    //6
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 2, code: 2 }, blueFighter: { name: 3, code: 3 } }, { match: 2, weight: 1, type: 'Vòng loại', redFighter: { name: 4, code: 4 }, blueFighter: { name: 5, code: 5 } }, { match: 3, weight: 1, type: 'Bán Kết', redFighter: { name: 2, code: 2 }, blueFighter: { name: 'W.1', code: '' } }, { match: 4, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.2', code: '' }, blueFighter: { name: 6, code: 6 } }, { match: 5, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.3', code: '' }, blueFighter: { name: 'W.4', code: '' } }]);
    //7
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 2, code: 2 }, blueFighter: { name: 3, code: 3 } }, { match: 2, weight: 1, type: 'Vòng loại', redFighter: { name: 4, code: 4 }, blueFighter: { name: 5, code: 5 } }, { match: 3, weight: 1, type: 'Vòng loại', redFighter: { name: 6, code: 6 }, blueFighter: { name: 7, code: 7 } }, { match: 4, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 'W.1', code: '' } }, { match: 5, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.2', code: '' }, blueFighter: { name: 'W.3', code: '' } }, { match: 6, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.4', code: '' }, blueFighter: { name: 'W.5', code: '' } }]);
    //8
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }, { match: 2, weight: 1, type: 'Vòng loại', redFighter: { name: 3, code: 3 }, blueFighter: { name: 4, code: 4 } }, { match: 3, weight: 1, type: 'Vòng loại', redFighter: { name: 5, code: 5 }, blueFighter: { name: 6, code: 6 } }, { match: 4, weight: 1, type: 'Vòng loại', redFighter: { name: 7, code: 7 }, blueFighter: { name: 8, code: 8 } }, { match: 5, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 'W.2', code: '' } }, { match: 6, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.3', code: '' }, blueFighter: { name: 'W.4', code: '' } }, { match: 7, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.5', code: '' }, blueFighter: { name: 'W.6', code: '' } }]);
    //9
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 7, code: 7 }, blueFighter: { name: 8, code: 8 } }, { match: 2, weight: 1, type: 'Vòng loại', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }, { match: 3, weight: 1, type: 'Vòng loại', redFighter: { name: 3, code: 3 }, blueFighter: { name: 4, code: 4 } }, { match: 4, weight: 1, type: 'Vòng loại', redFighter: { name: 5, code: 5 }, blueFighter: { name: 6, code: 6 } }, { match: 5, weight: 1, type: 'Vòng loại', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 9, code: 9 } }, { match: 6, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.2', code: '' }, blueFighter: { name: 'W.3', code: '' } }, { match: 7, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.4', code: '' }, blueFighter: { name: 'W.5', code: '' } }, { match: 8, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.6', code: '' }, blueFighter: { name: 'W.7', code: '' } }]);

    this.types = ['Vòng loại', 'Bán Kết', 'Chung Kết'];
  }

  process = () => {
    let rawData = [
      ['1', '55kg nam', 'VDV 1', 'Đơn vị 1'],
      ['2', '55kg nam', 'VDV 2', 'Đơn vị 2'],
      ['3', '55kg nam', 'VDV 3', 'Đơn vị 3'],
      ['4', '55kg nam', 'VDV 4', 'Đơn vị 4'],
      ['5', '55kg nam', 'VDV 5', 'Đơn vị 5'],
      ['6', '60kg nam', 'VDV 6', 'Đơn vị 6'],
      ['7', '60kg nam', 'VDV 7', 'Đơn vị 7'],
      ['8', '60kg nam', 'VDV 8', 'Đơn vị 8'],
      ['9', '60kg nam', 'VDV 9', 'Đơn vị 9'],
      ['10', '60kg nam', 'VDV 10', 'Đơn vị 10'],
      ['11', '60kg nam', 'VDV 11', 'Đơn vị 11'],
    ]

    // Tạo đối tượng Map để gom nhóm các võ sĩ theo hạng cân
    let groupedData = new Map();
    rawData.forEach(item => {
      let weight = item[1];
      if (groupedData.has(weight)) {
        groupedData.get(weight).push(item);
      } else {
        groupedData.set(weight, [item]);
      }
    });

    this.groupMatchs = [];
    for (const [key, value] of groupedData.entries()) {
      this.groupMatchs.push(this.getschedule(value));
    }

    // this.changeMatchNumber(this.groupMatchs[0], 3)
    // console.log(this.groupMatchs[0]);

    this.tournamentArray = [];
    let matchCount = 0;

    this.types.forEach(type => {
      this.groupMatchs.forEach(matchs => {
        for (let i = 0; i < matchs.length; i++) {
          const match = matchs[i];
          if (match.type === type) {
            this.changeMatchNumber(matchs, matchCount + 1);
            matchCount++;
            console.log(match);
            this.tournamentArray.push(match);
            matchs.splice(i, 1);
            i--;
          }
        }
      })
    });


    // this.tournamentArray = [];
    // let matchCount = 0;
    // this.types.forEach(type => {
    //   this.groupMatchs.forEach(matchs => {
    //     matchs.forEach(match => {
    //       if(match.type === type){
    //         matchCount++;
    //         this.changeMatchNumber(matchs, matchCount);
    //         let matchTemp = match;
    //         console.log(matchTemp);
    //         this.tournamentArray.push(matchTemp);
    //         matchs.shift();
    //       }
    //     })
    //   })
    // })

    console.log(this.tournamentArray);
  }

  getschedule(fighters) {
    const schemaFighter = this.schemaFighters[fighters.length];
    let matchs = [];
    for (let i = 0; i < schemaFighter.length; i++) {
      let match = schemaFighter[i];
      if (!isNaN(parseFloat(match.weight))) {
        match.weight = fighters[match.weight - 1][1];
      }
      if (!isNaN(parseFloat(match.redFighter.name))) {
        match.redFighter.name = fighters[match.redFighter.name - 1][2];
        match.redFighter.code = fighters[match.redFighter.code - 1][3];
      }
      if (!isNaN(parseFloat(match.blueFighter.name))) {
        match.blueFighter.name = fighters[match.blueFighter.name - 1][2];
        match.blueFighter.code = fighters[match.blueFighter.code - 1][3];
      }
      matchs.push(match);
    }

    return matchs;
  }

  changeMatchNumber(groupMatch, newMatchNumber) {
    const variance = newMatchNumber - groupMatch[0].match;
    groupMatch.forEach(match => {
      match.match += variance;
      if (match.redFighter.name.includes('W.')) {
        let number = parseFloat(match.redFighter.name.split('.')[1]);
        if (newMatchNumber <= number) {
          match.redFighter.name = 'W.' + (number + variance);
        }
      }
      if (match.blueFighter.name.includes('W.')) {
        let number = parseFloat(match.blueFighter.name.split('.')[1]);
        if (newMatchNumber <= number) {
          match.blueFighter.name = 'W.' + (number + variance);
        }
      }
    })
    return groupMatch;
  }





  render() {
    return (
      <div>
        <div style={{ height: "100vh" }}>
          <h2>TEST PAGE</h2>



          <button type="button" className="btn btn-primary" style={{ marginRight: '5px' }}
            onClick={this.process}><i className="fa-solid fa-rotate-left"></i> Sắp xếp</button>




        </div>
      </div>
    );
  }
}

export default TestContainer;
