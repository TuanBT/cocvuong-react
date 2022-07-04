import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import "../assets/css/style.css";
// import {
//   NotificationContainer,
//   NotificationManager,
// } from 'react-notifications';
// import 'react-notifications/lib/notifications.css';

class SettingContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();
    this.tournamentObj = {};
    this.settingObj = {};
    this.timeRound = 90; //90s Thời gian hiệp đấu
    this.timeBreak = 30; //30s Thời gian nghỉ giải lao
    this.timeExtra = 60; //60s //Thời gian hiệp phụ
    this.timeExtraBreak = 15; //15s Thời gian nghỉ giải lao giữa hiệp phụ
    this.tournamentName = "Cóc Vương";

    $('#txtPassword').keypress(function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode === '13') {
        $('#passwordModal .ok-button').click();
        return false;
      }
    });

    this.ref.child('setting').once('value', function (snapshot) {
      me.settingObj = snapshot.val();
      $("input[name=timeRound]").val(me.settingObj.timeRound);
      $("input[name=timeBreak]").val(me.settingObj.timeBreak);
      $("input[name=timeExtra]").val(me.settingObj.timeExtra);
      $("input[name=timeExtraBreak]").val(me.settingObj.timeExtraBreak);
      $("input[name=tournamentName]").val(me.settingObj.tournamentName);
    })

    this.ref.child('setting').on('value', function (snapshot) {
      me.settingObj = snapshot.val();
      $('#tournamentName').html(me.settingObj.tournamentName);
    })
  }

  resetSetting() {
    this.settingObj = {
      "timeRound": this.timeRound,
      "timeBreak": this.timeBreak,
      "timeExtra": this.timeExtra,
      "timeExtraBreak": this.timeExtraBreak,
      "tournamentName": this.tournamentName
    }
    this.ref.child('setting').update(this.settingObj);

    this.ref.child('setting').once('value', function (snapshot) {
      this.settingObj = snapshot.val();
      $("input[name=timeRound]").val(this.settingObj.timeRound);
      $("input[name=timeBreak]").val(this.settingObj.timeBreak);
      $("input[name=timeExtra]").val(this.settingObj.timeExtra);
      $("input[name=timeExtraBreak]").val(this.settingObj.timeExtraBreak);
      $("input[name=tournamentName]").val(this.settingObj.tournamentName);
    })

    // $.showNotification({
    //   body: "Cập nhập thông tin giải đấu thành công!", type: "success"
    // })
  }

  updateSetting() {
    this.settingObj = {
      "timeRound": parseInt($("input[name=timeRound]").val()),
      "timeBreak": parseInt($("input[name=timeBreak]").val()),
      "timeExtra": parseInt($("input[name=timeExtra]").val()),
      "timeExtraBreak": parseInt($("input[name=timeExtraBreak]").val()),
      "tournamentName": $("input[name=tournamentName]").val(),
    }
    this.ref.child('setting').update(this.settingObj);
    // NotificationManager.success('Success message', 'Cập nhập thông tin giải đấu thành công!');
    // $.showNotification({
    //   body: "Cập nhập thông tin giải đấu thành công!", type: "success"
    // })
  }

  importTournament() {
    this.tournamentObj = JSON.parse(JSON.stringify(this.tournamentConst));
    this.convertTournamnet($("textarea[name=tournamentText]").val());
    this.ref.update(this.tournamentObj);
    alert("Nhập giải đấu thành công!");
  }

  convertTournamnet(tournamentText) {
    var lines = tournamentText.match(/[^\r\n]+/g);
    for (var i = 0; i < lines.length; i++) {
      var values = lines[i].split("\t");
      if (values !== null && values[0].trim() !== "" && $.isNumeric(values[0].trim())) {
        var matchObjTemp = JSON.parse(JSON.stringify(this.matchObj));
        matchObjTemp.match.no = +values[0].trim();
        matchObjTemp.match.category = values[1].trim();
        matchObjTemp.match.type = values[2].trim();
        matchObjTemp.fighters.redFighter.name = values[3].trim();
        matchObjTemp.fighters.redFighter.code = values[4].trim();
        matchObjTemp.fighters.blueFighter.name = values[5].trim();
        matchObjTemp.fighters.blueFighter.code = values[6].trim();

        this.tournamentObj.tournament.push(matchObjTemp);
      }
    }
  }

  importTournamentMartial() {
    this.tournamentMartialObj = JSON.parse(JSON.stringify(this.tournamentMartialConst));
    this.convertTournamnetMartial($("textarea[name=tournamentMartialText]").val());
    this.ref.update(this.tournamentMartialObj);
    alert("Nhập giải đấu thành công!");
  }

  convertTournamnetMartial(tournamentMartialText) {
    var lines = tournamentMartialText.match(/[^\r\n]+/g);

    var matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
    var fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
    var fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));

    for (var i = 0; i < lines.length; i++) {
      var values = lines[i].split("\t");
      if (values != null) {
        if (values[0] !== "" && values[1] === "") {
          matchMartialObjTemp = JSON.parse(JSON.stringify(this.matchMartialObj));
          this.tournamentMartialObj.tournamentMartial.push(this.matchMartialObjTemp);
          matchMartialObjTemp.match.name = values[0].trim();
        } else {
          if ($.isNumeric(values[0].trim())) {
            fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
            fighterMartialObjTemp.fighter.code = values[1].trim();
            fighterMartialObjTemp.fighter.name = values[2].trim();

            fightersMartialObjTemp = JSON.parse(JSON.stringify(this.fightersMartialObj));
            fightersMartialObjTemp.no = values[0].trim();
            fightersMartialObjTemp.fighters.push(fighterMartialObjTemp);
            matchMartialObjTemp.team.push(fightersMartialObjTemp);
          } else if (values[0].trim().length > 3 && values[1].trim().length > 4) {
            fighterMartialObjTemp = JSON.parse(JSON.stringify(this.fighterMartialObj));
            fighterMartialObjTemp.fighter.code = values[0].trim();
            fighterMartialObjTemp.fighter.name = values[1].trim();

            // fightersMartialObjTemp = JSON.parse(JSON.stringify(fightersMartialObj));
            fightersMartialObjTemp.fighters.push(this.fighterMartialObjTemp);
            // matchMartialObjTemp.team.push(fightersMartialObjTemp);
          }
        }
      }
    }
    console.log(this.tournamentMartialObj);
  }

  render() {
    return (
      <div className="container-fluit">
        <header className="blog-header p-3 box-shadow">
          <div className="row flex-nowrap justify-content-between align-items-center">
            <div className="col-4 pt-1 text-center">
              <span className="text-pomegrante" id="tournamentName"></span>
            </div>
            <div className="col-4 text-center">
              <h2 className="blog-header-logo text-midnight-blue"><i className="fa-solid fa-gear"></i> Thiết đặt</h2>
            </div>
            <div className="col-4 d-flex justify-content-end align-items-center">
              <span className="text-muted">
                <img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân" className="img-fluid" style={{ height: "50px;" }} />
              </span>
            </div>
          </div>
        </header>

        <div className="container">
          <form className="form-style-7 mb-5 mt-3">
            <div className="form-title">
              <h2>Thiết đặt thông tin giải đấu</h2>
            </div>
            <label for="basic-url">Tên giải đấu</label>
            <div className="input-group mb-3">
              <input type="text" className="form-control" placeholder="" name="tournamentName" />
            </div>
            <label for="basic-url">Thời gian hiệp đấu</label>
            <div className="input-group mb-3">
              <input type="number" className="form-control" placeholder="" name="timeRound" />
              <div className="input-group-append">
                <span className="input-group-text">giây</span>
              </div>
            </div>
            <label for="basic-url">Thời gian nghỉ giữa hiệp</label>
            <div className="input-group mb-3">
              <input type="number" className="form-control" placeholder="" name="timeBreak" />
              <div className="input-group-append">
                <span className="input-group-text">giây</span>
              </div>
            </div>
            <label for="basic-url">Thời gian nghỉ giữa hiệp hiệp phụ</label>
            <div className="input-group mb-3">
              <input type="number" className="form-control" placeholder="" name="timeExtraBreak" />
              <div className="input-group-append">
                <span className="input-group-text">giây</span>
              </div>
            </div>
            <label for="basic-url">Thời gian hiệp phụ</label>
            <div className="input-group mb-3">
              <input type="number" className="form-control" placeholder="" name="timeExtra" />
              <div className="input-group-append">
                <span className="input-group-text">giây</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={this.resetSetting.bind(this)}><i className="fa-solid fa-rotate-left"></i> Reset</button>
            <button type="button" className="btn btn-primary" onClick={this.updateSetting.bind(this)}><i className="fa-solid fa-pen"></i> Cập nhập</button>
          </form>

          <div className="tournament-text">
            <div className="form-title">
              <h2>Danh sách đối kháng</h2>
            </div>
            <textarea name="tournamentText">
              Trận 	Hạng cân	Loại trận	Tên giáp đỏ	MSSV	Tên giáp xanh	MSSV
              1	Dưới 48 Kg Nữ	Vòng loại	Huỳnh Ngọc Anh	SA140080	Trương Ngọc Ánh	SA140109
              2	Trên 51 Kg Nữ	Vòng loại	Vũ Thu Giang	SE140954	Nguyễn Thị Hiếu	SE140882
              3	Trên 51 Kg Nữ	Vòng loại	Đinh Thị Ngọc Huân	SS140262	Đoàn Kim Loan	SB60924
              4	Dưới 48 Kg Nam	Vòng loại	Phan Chu Minh Trí	SS140336	Trần Thái Sơn	SE140768
              5	54 Kg Nam	Vòng loại	Võ Nguyên King	SS130291	Trần Cao Tiến	SE140051
              6	60 Kg Nam	Vòng loại	Lê Trọng Thắng	SE140015	Trần Việt Hoàng	SE130061
              7	64 Kg Nam	Vòng loại	Phan Gia Huy	SE141115	Phạm Nhật Huy	SE140135
              8	64 Kg Nam	Vòng loại	Phan Nguyễn Long Đức	SE141144	Trương Thanh Bình	SE140125
              9	68 Kg Nam	Vòng loại	Trần Đức Anh	SE141113	Nguyễn Bá Điền	SE130077
              10	68 Kg Nam	Vòng loại	Nguyễn Duy Phong	SE140754	Huỳnh Minh Đức	SE62378
              11	68 Kg Nam	Vòng loại	Lê Quang Bảo Long	SE140863	Vũ Anh Dũng	SE130379
              12	68 Kg Nam	Vòng loại	Phạm Duy Phương	SE140481	Lê Kim Sang	SE63277
              13	72 Kg Nam	Vòng loại	Nguyễn Vũ Duy Tân	SE62736	Nguyễn Huy Hoàng	SS140195
              14	72 Kg Nam	Vòng loại	Trần Minh Long	SE140599	Nguyễn Nhật Tân	SB60778
              15	72 Kg Nam	Vòng loại	Phạm Việt Tài	SE140850	Trương Tấn Sang	SE140430
              16	72 Kg Nam	Vòng loại	Nguyễn Minh Thông	SE140470	Đoàn Tiến Dũng	SE61535
              17	77 Kg Nam	Vòng loại	Trương Quốc Lập	SE140247	Lê Trung Trực	SA140199
              18	77 Kg Nam	Vòng loại	Quách Khổng Triết	SE140868	Hồ Hữu Tài	SE140155
              19	Trên 77 Kg Nam	Vòng loại	Lê Triệu Khang	SS140038	Thanh Lâm	SE140723
              20	Trên 77 Kg Nam	Vòng loại	Trương Văn An	SS140256	Võ Tấn Lộc	SS130019
              21	Trên 77 Kg Nam	Vòng loại	Lê Sơn Lâm	SE140398	Nguyễn Đinh Hoà	SE140030
              22	Dưới 48 Kg Nữ	Vòng loại	Bùi Thị Uyễn Vy	SA140057	Trần Thu Cúc	SS130223
              23	Dưới 48 Kg Nữ	Vòng loại	W.1		Phạm Thanh Phương	SE140910
              24	Trên 51 Kg Nữ	Vòng loại	Thái Thị Thanh Thảo	SS140115	W.2
              25	Trên 51 Kg Nữ	Vòng loại	W.3		Đào Bảo Trâm	SE140878
              26	Dưới 48 Kg Nam	Vòng loại	Cao Huỳnh Hiệp	SE140475	Dương Hoàng Hiệp	SE140794
              27	Dưới 48 Kg Nam	Vòng loại	W.4		Nguyễn Thanh Hào	SS140145
              28	51 Kg Nam	Vòng loại	Bành Đức Hiếu	SE140896	Hoàng Bách Tỷ	SE61427
              29	51 Kg Nam	Vòng loại	Ngô Thành Lộc	SE130721	Nguyễn Văn Hùng	SE140996
              30	54 Kg Nam	Vòng loại	Trần Duy Nghiêm	SE141066	Lê Anh Khôi	SE140457
              31	54 Kg Nam	Vòng loại	W.5		Vũ Phi Long	SS140438
              32	57 Kg Nam	Vòng loại	Trần Thành Nhân	SE63103	Huỳnh Hữu Tín	SE140856
              33	57 Kg Nam	Vòng loại	Phạm Mạnh Toàn	SE140895	Nguyễn Thanh Hải	SE140237
              34	60 Kg Nam	Vòng loại	Trịnh Tiến Hoàng	SE63415	Trần Văn Tâm	SE140130
              35	60 Kg Nam	Vòng loại	W.6		Võ Trọng Đạt	SE141127
              36	64 Kg Nam	Vòng loại	Lê Minh Đại	SE141149	W.7
              37	64 Kg Nam	Vòng loại	W.8		Diệp Đặng Huy Hoàng	SE140693
              38	68 Kg Nam	Vòng loại	W.9		W.10
              39	68 Kg Nam	Vòng loại	W.11		W.12
              40	72 Kg Nam	Vòng loại	W.13		W.14
              41	72 Kg Nam	Vòng loại	W.15		W.16
              42	77 Kg Nam	Vòng loại	Đỗ Trọng Minh Quân	SE130656	W.17
              43	77 Kg Nam	Vòng loại	W.18		Huỳnh Ngọc Linh	SE140845
              44	Trên 77 Kg Nam	Vòng loại	Nguyễn Thế Sơn	SE130084	W.19
              45	Trên 77 Kg Nam	Vòng loại	W.20		W.21
              46	51 Kg Nam	Hạng 3	L.28		L.29
              47	57 Kg Nam	Hạng 3	L.32		L.33
              48	Dưới 48 Kg Nữ	Chung kết	W.22		W.23
              49	Trên 51 Kg Nữ	Chung kết	W.24		W.25
              50	Dưới 48 Kg Nam	Chung kết	W.26		W.27
              51	51 Kg Nam	Chung kết	W.28		W.29
              52	54 Kg Nam	Chung kết	W.30		W.31
              53	57 Kg Nam	Chung kết	W.32		W.33
              54	60 Kg Nam	Chung kết	W.34		W.35
              55	64 Kg Nam	Chung kết	W.36		W.37
              56	68 Kg Nam	Chung kết	W.38		W.39
              57	72 Kg Nam	Chung kết	W.40		W.41
              58	77 Kg Nam	Chung kết	W.42		W.43
              59	Trên 77 Kg Nam	Chung kết	W.44		W.45
            </textarea>
            <div className="function-button">
              <button type="button" className="btn btn-primary" onClick={this.importTournament.bind(this)}><i className="fa-solid fa-file-import"></i> Import Đối Kháng</button>
            </div>
          </div>



          <div className="tournament-text">
            <div className="form-title">
              <h2>Danh sách thi quyền</h2>
            </div>
            <textarea name="tournamentMartialText">
              KHỞI QUYỀN NAM

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SE140281	Nguyễn Trần Khang	Nam
              2	SE140587	Nguyễn Thành Nhân	Nam
              3	SE63277	Lê Kim Sang	Nam
              4	SE140785	Võ Đinh Phương	Nam
              5	SE140668	Nguyễn Thành Tín	Nam
              6	SE130124	Bùi Hải Nam	Nam
              7	SA140231	Dương Quyền Đức	Nam
              8	SE140415	Kiều Quốc Trung	Nam
              9	SS130171	Nguyễn Xuân Hoàng	Nam
              10	SA140251	Nguyễn Quốc Long	Nam
              11	SE140523	Đàm Tiến Đạt	Nam
              12	SE140951	Lê Trần Đức Thịnh	Nam
              13	SE130122	Nguyễn Trung Nam	Nam
              14	SE140381	Trần Quang Khải	Nam

              KHỞI QUYỀN NỮ

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SS130223	Trần Thu Cúc	Nữ
              2	SA140007	Lê Nguyễn Xuân Diệu Phúc	Nữ
              3	SB61454	Lê Thị Hằng	Nữ
              4	SS130230	Nguyễn Minh Ngọc	Nữ
              5	SS130178	Lê Thị Thùy Linh	Nữ
              6	SB60924	Đoàn Kim Loan	Nữ
              7	SA140224	Nguyễn Thị Thuỳ My	Nữ
              8	SE140910	Phạm Thanh Phương	Nữ
              9	SE62778	Phạm Hoàng Tuyết Ngân	Nữ
              10	SB61433	Trần Thị Vân Anh	Nữ
              11	SA140279	Lê Thị Vân Hà	Nữ
              12	SS140377	Tống Thị Mỹ Phát	Nữ

              THẬP TỰ QUYỀN NAM (NHÓM A)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SE140523	Đàm Tiến Đạt	Nam
              2	SA140251	Nguyễn Quốc Long	Nam
              3	SE140866	Nguyễn Hữu Phước	Nam
              4	SE130124	Bùi Hải Nam	Nam
              5	SE140381	Trần Quang Khải	Nam
              6	SA140231	Dương Quyền Đức	Nam
              7	SE140587	Nguyễn Thành Nhân	Nam
              8	SE63277	Lê Kim Sang	Nam
              9	SE140668	Nguyễn Thành Tín	Nam
              10	SE140785	Võ Đinh Phương	Nam
              11	SS140426	Bùi Minh Trí	Nam

              THẬP TỰ QUYỀN NAM (NHÓM B)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SS130171	Nguyễn Xuân Hoàng	Nam
              2	SE130122	Nguyễn Trung Nam	Nam
              3	SS140195	Nguyễn Huy Hoàng	Nam
              4	SS140220	Mai Văn Huy	Nam
              5	SE141078	Trịnh Phú Trọng	Nam
              6	SE141098	Nguyễn Minh Triết	Nam
              7	SE140951	Lê Trần Đức Thịnh	Nam
              8	SE62736	Nguyễn Vũ Duy Tân	Nam
              9	SS140005	Trần Hoàng Long	Nam
              10	SS140759	Nguyễn Văn Minh Phú	Nam
              11	SS140433	Nguyễn Đỗ Quang Ngọc	Nam

              THẬP TỰ QUYỀN NỮ (NHÓM A)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SA140153	Vũ Hoài Tố Như	Nữ
              2	SE140479	Ngô Phương Hà	Nữ
              3	SA140279	Lê Thị Vân Hà	Nữ
              4	SA140224	Nguyễn Thị Thuỳ My	Nữ
              5	SB61433	Trần Thị Vân Anh	Nữ
              6	SB61454	Lê Thị Hằng	Nữ
              7	SB60924	Đoàn Kim Loan	Nữ
              8	SA140167	Nguyễn Nhị Kim Hoà	Nữ
              9	SS130223	Trần Thu Cúc	Nữ

              THẬP TỰ QUYỀN NỮ (NHÓM B)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SS130178	Lê Thị Thùy Linh	Nữ
              2	SS140377	Tống Thị Mỹ Phát	Nữ
              3	SE140974	Hồ Thị Phương Dung	Nữ
              4	SA140080	Huỳnh Ngọc Anh	Nữ
              5	SE62778	Phạm Hoàng Tuyết Ngân	Nữ
              6	SE140830	Lưu Diệu Hoa	Nữ
              7	SS130230	Nguyễn Minh Ngọc	Nữ
              8	SE140910	Phạm Thanh Phương	Nữ





              LONG HỔ QUYỀN NAM

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SE130122	Nguyễn Trung Nam	Nam
              2	SE63103	Trần Thành Nhân	Nam
              3	SE140866	Nguyễn Hữu Phước	Nam
              4	SE62736	Nguyễn Vũ Duy Tân	Nam
              5	SE130124	Bùi Hải Nam	Nam
              6	SS130171	Nguyễn Xuân Hoàng	Nam
              7	SE140523	Đàm Tiến Đạt	Nam
              8	SE63277	Lê Kim Sang	Nam
              9	SE140587	Nguyễn Thành Nhân	Nam

              LONG HỔ QUYỀN NỮ

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SE140910	Phạm Thanh Phương	Nữ
              2	SB61454	Lê Thị Hằng	Nữ
              3	SB60924	Đoàn Kim Loan	Nữ
              4	SB61433	Trần Thị Vân Anh	Nữ

              QĐĐ - KHỞI QUYỀN (NHÓM A)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SB61433	Trần Thị Vân Anh	Nữ
              SA130328	Phạm Thị Thùy Dương	Nữ
              SA130252	Nguyễn Thị Hà	Nữ
              2	SE140878	Đào Bảo Trâm	Nữ
              SE140882	Nguyễn Thị Hiếu	Nữ
              SE140889	Nguyễn Minh Quân	Nam
              3	SE140090	Trác Thanh Nguyệt Quế	Nữ
              SA140192	Đinh Ngọc Bích Châu	Nữ
              SE140961	Lê Nhật Hạnh Lan	Nữ
              4	SB60924	Đoàn Kim Loan	Nữ
              SE63277	Lê Kim Sang	Nam
              SS130223	Trần Thu Cúc	Nữ
              5	SE140910	Phạm Thanh Phương	Nữ
              SB61454	Lê Thị Hằng	Nữ
              SS130178	Lê Thị Thùy Linh	Nữ
              6	SE140622	Nguyễn Ngọc Diệp	Nữ
              SE140803	Nguyễn Bảo Thư	Nữ
              SE141142	Đỗ Vĩnh Nguyên	Nam

              QĐĐ - KHỞI QUYỀN (NHÓM B)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SE140185	Lâm Quang Nhật	Nam
              SS140026	Nguyễn Thị Diễm Hằng	Nữ
              SE140106	Đoàn Minh Đạt	Nam
              2	SE130122	Nguyễn Trung Nam	Nam
              SS130171	Nguyễn Xuân Hoàng	Nam
              SE130124	Bùi Hải Nam	Nam
              3	SE140281	Nguyễn Trần Khang	Nam
              SE140078	Trần Thế Đông Anh 	Nam
              SA140069	Vũ Minh Quân	Nam
              4	SE140951	Lê Trần Đức Thịnh	Nam
              SE140523	Đàm Tiến Đạt	Nam
              SE140587	Nguyễn Thành Nhân	Nam
              5	SE140668	Nguyễn Thành Tín	Nam
              SA140231	Dương Quyền Đức	Nam
              SE140381	Trần Quang Khải	Nam






              QĐĐ - THẬP TỰ QUYỀN (NHÓM A)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SE140951	Lê Trần Đức Thịnh	Nam
              SE140523	Đàm Tiến Đạt	Nam
              SE140587	Nguyễn Thành Nhân	Nam
              2	SE130122	Nguyễn Trung Nam	Nam
              SS130171	Nguyễn Xuân Hoàng	Nam
              SE130124	Bùi Hải Nam	Nam
              3	SE140109	Nguyễn Thị Hương Giang	Nữ
              SE140741	Nguyễn Trần Minh Khoa	Nam
              SE140094	Đinh Phan Hải Triều	Nam
              4	SB60924	Đoàn Kim Loan	Nữ
              SE63277	Lê Kim Sang	Nam
              SS130223	Trần Thu Cúc	Nữ
              5	SS140392	Hồ Nguyên Nhi	Nữ
              SE141098	Nguyễn Minh Triết	Nam
              SS140022	Nguyễn Thanh Thanh	Nữ

              QĐĐ - THẬP TỰ QUYỀN (NHÓM B)

              STT	MSSV	HỌ VÀ TÊN	GT	ĐIỂM	HẠNG	GHI CHÚ
              1	SS140352	Trần Thị Quỳnh Phương	Nữ
              SS140351	Hà Thị Diệu Linh	Nữ
              SE141066	Trần Duy Nghiêm	Nam
              2	SS140100	Bùi Thị Diễm Trinh	Nữ
              SS140123	Nguyễn Ngọc Huệ	Nữ
              SS140196	Nguyễn Vũ Khương	Nam
              3	SB61433	Trần Thị Vân Anh	Nữ
              SA130328	Phạm Thị Thùy Dương	Nữ
              SA130252	Nguyễn Thị Hà	Nữ
              4	SA140187	Seng Mỹ Yến	Nữ
              SA140212	Lưu Gia Ngọc	Nữ
              SA140178	Nguyễn Hải Lan Khanh	Nữ
              5	SE140910	Phạm Thanh Phương	Nữ
              SS140377	Tống Thị Mỹ Phát	Nữ
              SS130178	Lê Thị Thùy Linh	Nữ

            </textarea>
            <div className="function-button">
              <button type="button" className="btn btn-primary" onClick={this.importTournamentMartial.bind(this)}><i className="fa-solid fa-file-import"></i> Import Thi
                Quyền</button>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

export default SettingContainer;
