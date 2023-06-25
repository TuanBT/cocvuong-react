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
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 3, code: 3 }, blueFighter: { name: 4, code: 4 } }, { match: 2, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 2, code: 2 } }, { match: 3, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.1', code: '' }, blueFighter: { name: 5, code: 5 } }, { match: 4, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.2', code: '' }, blueFighter: { name: 'W.3', code: '' } }]);
    //6
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 2, code: 2 }, blueFighter: { name: 3, code: 3 } }, { match: 2, weight: 1, type: 'Vòng loại', redFighter: { name: 4, code: 4 }, blueFighter: { name: 5, code: 5 } }, { match: 3, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 'W.1', code: '' } }, { match: 4, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.2', code: '' }, blueFighter: { name: 6, code: 6 } }, { match: 5, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.3', code: '' }, blueFighter: { name: 'W.4', code: '' } }]);
    //7
    this.schemaFighters.push([{ match: 1, weight: 1, type: 'Vòng loại', redFighter: { name: 2, code: 2 }, blueFighter: { name: 3, code: 3 } }, { match: 2, weight: 1, type: 'Vòng loại', redFighter: { name: 4, code: 4 }, blueFighter: { name: 5, code: 5 } }, { match: 3, weight: 1, type: 'Vòng loại', redFighter: { name: 6, code: 6 }, blueFighter: { name: 7, code: 7 } }, { match: 4, weight: 1, type: 'Bán Kết', redFighter: { name: 1, code: 1 }, blueFighter: { name: 'W.1', code: '' } }, { match: 5, weight: 1, type: 'Bán Kết', redFighter: { name: 'W.2', code: '' }, blueFighter: { name: 'W.3', code: '' } }, { match: 6, weight: 1, type: 'Chung Kết', redFighter: { name: 'W.4', code: '' }, blueFighter: { name: 'W.5', code: '' } }]);
    //8
    this.schemaFighters.push([{match:1,weight:1,type:"Vòng loại",redFighter:{name:1,code:1},blueFighter:{name:2,code:2}},{match:2,weight:1,type:"Vòng loại",redFighter:{name:3,code:3},blueFighter:{name:4,code:4}},{match:3,weight:1,type:"Vòng loại",redFighter:{name:5,code:5},blueFighter:{name:6,code:6}},{match:4,weight:1,type:"Vòng loại",redFighter:{name:7,code:7},blueFighter:{name:8,code:8}},{match:5,weight:1,type:"Bán Kết",redFighter:{name:"W.1",code:""},blueFighter:{name:"W.2",code:""}},{match:6,weight:1,type:"Bán Kết",redFighter:{name:"W.3",code:""},blueFighter:{name:"W.4",code:""}},{match:7,weight:1,type:"Chung Kết",redFighter:{name:"W.5",code:""},blueFighter:{name:"W.6",code:""}}]);
    //9
    this.schemaFighters.push([{match:1,weight:1,type:"Vòng loại",redFighter:{name:6,code:6},blueFighter:{name:7,code:7}},{match:2,weight:1,type:"Vòng loại",redFighter:{name:1,code:1},blueFighter:{name:2,code:2}},{match:3,weight:1,type:"Vòng loại",redFighter:{name:3,code:3},blueFighter:{name:4,code:4}},{match:4,weight:1,type:"Vòng loại",redFighter:{name:5,code:5},blueFighter:{name:"W.1",code:""}},{match:5,weight:1,type:"Vòng loại",redFighter:{name:8,code:8},blueFighter:{name:9,code:9}},{match:6,weight:1,type:"Bán Kết",redFighter:{name:"W.2",code:""},blueFighter:{name:"W.3",code:""}},{match:7,weight:1,type:"Bán Kết",redFighter:{name:"W.4",code:""},blueFighter:{name:"W.5",code:""}},{match:8,weight:1,type:"Chung Kết",redFighter:{name:"W.6",code:""},blueFighter:{name:"W.7",code:""}}]);

    this.types = ['Vòng loại', 'Bán Kết', 'Chung Kết'];
  }

  process = () => {
    let rawData = [
      ['1', '55kg nam', 'Trần Lê Minh', 'FPT University (A)'],
      ['2', '55kg nam', 'Hoàng Duy Anh', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['3', '55kg nam', 'Nguyễn Phúc Long', 'FPT University (A)'],
      ['4', '60kg nam', 'Võ Minh Hiền', 'FPT University (A)'],
      ['5', '60kg nam', 'Lê Đức Trọng', 'FPT University (A)'],
      ['6', '50kg nữ', 'Phạm Thị Thanh Phương', 'Swinburne (Việt Nam) (A)'],
      ['7', '55kg nam', 'Lê Đắc Lợi', 'FPT University (A)'],
      ['8', '55kg nam', 'Phan Nguyễn Quang Khang', 'Swinburne (Việt Nam) (A)'],
      ['9', '55kg nam', 'Nguyễn Xuân Khang', 'FPT University (A)'],
      ['10', '55kg nam', 'Nguyễn Linh Cảnh ', 'FPT University (A)'],
      ['11', '60kg nam', 'Hồ Viết Thuận', 'Cao đẳng FPT Polytechnic (A)'],
      ['12', '60kg nam', 'Trương Công Tuệ Tĩnh', 'Greenwich (Việt Nam) (A)'],
      ['13', '60kg nam', 'Nguyễn Văn Bình', 'FPT University (A)'],
      ['14', '60kg nam', 'Nguyễn Thái Vĩnh', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['15', '65kg nam', 'Lưu Triều Lễ', 'FPT University (A)'],
      ['16', '65kg nam', 'Nguyễn Hoàng Long', 'Swinburne (Việt Nam) (A)'],
      ['17', '65kg nam', 'Đỗ Nguyễn Đăng Khoa', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['18', '70kg nam', 'Ngô Nguyễn Thanh Phong', 'FPT University (A)'],
      ['19', '70kg nam', 'Dương Quý Thành', 'Swinburne (Việt Nam) (A)'],
      ['20', '70kg nam', 'Mạc Đăng Hải', 'Greenwich (Việt Nam) (A)'],
      ['21', '70kg nam', 'Nguyễn Quốc Đạt ', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['22', '75kg nam', 'Cao Hoàng Duy', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['23', '75kg nam', 'Lê Trần Minh Đạt', 'FPT University (A)'],
      ['24', '45kg nữ', 'Đặng Thị Huyền ', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['25', '50kg nữ', 'Nguyễn Thanh Vân', 'FPT University (A)'],
      ['26', '50kg nữ', 'Trần Phạm Hà My', 'Greenwich (Việt Nam) (A)'],
      ['27', '60kg nữ', 'Võ Thị Hiền Duyên', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['28', '65kg nữ', 'Nguyễn Ngọc Minh Thy', 'Swinburne (Việt Nam) (A)'],
      ['29', '65kg nam', 'Trần Gia Quyên', 'FPT University (A)'],
      ['30', '75kg nam', 'Trần Nhật Anh', 'Swinburne (Việt Nam) (A)'],
      ['31', '75kg nam', 'Nguyễn Tấn Đạt ', 'Greenwich (Việt Nam) (A)'],
      ['32', '45kg nữ', 'Phạm Ngọc Phương Nhi', 'Swinburne (Việt Nam) (A)'],
      ['33', '55kg nữ', 'Phạm Thanh Hiền', 'FPT University (A)'],
      ['34', '60kg nữ', 'Trần Thị Kim Oanh ', 'FPT University (A)'],
      ['35', '65kg nữ ', 'Đặng Nguyễn Xuân Thy', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['41', '50kg nữ', 'Nguyễn Thị Hồng Yên', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['45', '65kg nam', 'Nguyễn Công Tài', 'FPT University (A)'],
      ['46', '65kg nam', 'Lê Trung Tiến', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['47', '65kg nam', 'Cao Trí Tưởng', 'Greenwich (Việt Nam) (A)'],
      ['48', '70kg nam', 'Nguyễn Hoàng Thuận ', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['49', '70kg nam', 'Nguyễn Thành Nhân', 'FPT University (A)'],
      ['50', '70kg nam', 'Hoàng Minh Tiến', 'FPT University (A)'],
      ['51', '70kg nam', 'Bùi Vĩnh Lộc', 'FPT University (A)'],
      ['52', '75kg nam', 'Lê Hoàng Hải ', 'Swinburne (Việt Nam) (A)'],
      ['53', '75kg nam', 'Nguyễn Anh Minh', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['54', '45kg nữ', 'Nguyễn Huỳnh Mai Ngân', 'FPT University (A)'],
      ['55', '50kg nữ', 'Hồ Phương Vy', 'CĐ FPT Poly (CĐ Anh Quốc) (A)'],
      ['56', '60kg nữ', 'Lê Ngọc Đông Nghi', 'Swinburne (Việt Nam) (A)'],
      ['57', '65kg nữ', 'Võ Bùi Hải Nguyên', 'FPT University (A)'],
      ['58', '55kg nữ', 'Trần Thị Minh Thư', 'FPT University (A)']
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

    this.matchs = [];
    let matchCount = 1;
    this.groupMatch= [];
    for (const [key, value] of groupedData.entries()) {
      this.groupMatch = this.getschedule(value);
      this.changeMatchNumber(this.groupMatch, matchCount);
      
      this.groupMatch.forEach(match => {
        this.matchs.push(match);
      })
      matchCount += this.groupMatch.length;
    }

    this.tournamentArray = this.matchs.slice();

    // Sắp xếp mảng theo thứ tự "Vòng loại", "Bán kết", "Chung kết"
    this.matchs.sort((a, b) => {
      const typeOrder = { 'Vòng loại': 0, 'Bán Kết': 1, 'Chung Kết': 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    console.log(this.matchs);

    
    for(let i=0; i< this.matchs.length;i++){
      if(this.matchs[i].match !== this.tournamentArray[i].match){
        this.swapRowsName(this.tournamentArray,this.tournamentArray[i].match,i + 1)
      }
    }
    console.log(this.tournamentArray);
  }

  getschedule(fighters) {
    const schemaFighter = this.schemaFighters[fighters.length];
    let matchs = [];
    for (let i = 0; i < schemaFighter.length; i++) {
      let match = schemaFighter[i];
      if (!isNaN(parseFloat(match.weight))) {
        console.log(fighters);
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
        if (newMatchNumber > number) {
          match.redFighter.name = 'W.' + (number + variance);
        }
      }
      if (match.blueFighter.name.includes('W.')) {
        let number = parseFloat(match.blueFighter.name.split('.')[1]);
        if (newMatchNumber > number) {
          match.blueFighter.name = 'W.' + (number + variance);
        }
      }
    })
    return groupMatch;
  }

  swapRowsName(arr, match1, match2) {
    // Tìm vị trí của 2 row cần đổi chỗ trong mảng
    let index1 = arr.findIndex((el) => el.match === match1);
    let index2 = arr.findIndex((el) => el.match === match2);
  
    // Nếu không tìm thấy row tương ứng thì trả về mảng ban đầu
    if (index1 === -1 || index2 === -1) {
      return arr;
    }

    //Đổi match
    let matchTemp = arr[index1].match;
    arr[index1].match = arr[index2].match;
    arr[index2].match = matchTemp;
  
    //Đổi row
    let temp = arr[index1];
    arr[index1] = arr[index2];
    arr[index2] = temp;
  
    // //Đổi W. tương ứng
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].redFighter.name === "W." + match1) {
        arr[i].redFighter.name = "W." + match2;
      }
      if (arr[i].blueFighter.name === "W." + match1) {
        arr[i].blueFighter.name = "W." + match2;
      }
      if (arr[i].redFighter.name === "W." + match2) {
        arr[i].redFighter.name = "W." + match1;
      }
      if (arr[i].blueFighter.name === "W." + match2) {
        arr[i].blueFighter.name = "W." + match1;
      }
    }

    // for (let i = 0; i < arr.length; i++) {
    //   if (arr[i].redFighter.name === "W." + match1) {
    //     arr[i].redFighter.name = 'NameTemp';
    //   }
    //   if (arr[i].blueFighter.name === "W." + match1) {
    //     arr[i].blueFighter.name = 'NameTemp';
    //   }
    // }
    // for (let i = 0; i < arr.length; i++) {
    //   if (arr[i].redFighter.name === "W." + match2) {
    //     arr[i].redFighter.name = "W." + match1;
    //   }
    //   if (arr[i].blueFighter.name === "W." + match2) {
    //     arr[i].blueFighter.name = "W." + match1;
    //   }
    // }
    // for (let i = 0; i < arr.length; i++) {
    //   if (arr[i].redFighter.name === 'NameTemp') {
    //     arr[i].redFighter.name = "W." + match1;
    //   }
    //   if (arr[i].blueFighter.name === 'NameTemp') {
    //     arr[i].blueFighter.name = "W." + match1;
    //   }
    // }
  
    return arr;
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
