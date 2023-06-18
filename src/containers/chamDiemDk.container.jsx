import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import "../assets/css/style.css";

class InformationDkContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();
    this.tournamentObj; 
  }

  redWin() {}


  render() {
    return (
      <div>
        <div style={{height: '100vh'}}>
          <div className="info-area">
            <div className="info-match-left-area">
              <div className="referee-score-area-top">
                <span className="info-text">
                  <span id="tournamentName">
                  </span>
                  <span id="internet-status">
                    - Mất kết nối Internet...
                  </span>
                </span>
              </div>
              <div className="referee-score-area">
                <div className="line-break"></div>
                <div className="referee">
                  <a href="http://buitientuan.com/chamdiem/giamdinh.html" target="_blank">
                    <div className="referee-title gd1">
                      <span className="info-text">
                        Giám định I
                      </span>
                    </div>
                  </a>
                  <div className="referee-score">
                    <div className="red-score-refereeSc">
                      <span className="info-text">
                        <span id="red-score-1"></span>
                      </span>
                    </div>
                    <div className="blue-score-refereeSc">
                      <span className="info-text">
                        <span id="blue-score-1"></span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="line-break"></div>
                <div className="referee">
                  <div className="referee-title gd2">
                    <span className="info-text">
                      Giám định II
                    </span>
                  </div>
                  <div className="referee-score">
                    <div className="red-score-refereeSc">
                      <span className="info-text">
                        <span id="red-score-2"></span>
                      </span>
                    </div>
                    <div className="blue-score-refereeSc">
                      <span className="info-text">
                        <span id="blue-score-2"></span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="line-break"></div>
                <div className="referee">
                  <div className="referee-title gd3">
                    <span className="info-text">
                      Giám định III
                    </span>
                  </div>
                  <div className="referee-score">
                    <div className="red-score-refereeSc">
                      <span className="info-text">
                        <span id="red-score-3"></span>
                      </span>
                    </div>
                    <div className="blue-score-refereeSc">
                      <span className="info-text">
                        <span id="blue-score-3"></span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="line-break"></div>
              </div>
              <div className="red-fighter">
                <div className="red-win">
                  <span className="info-text">

                  </span>
                </div>
                <div className="fighter-code red">
                  <span className="info-text-fighter-code-red">
                    <span id="red-code"></span>
                  </span>
                </div>
                <div className="fighter-name red">

                  <span className="info-text-fighter-name-red" onClick={this.redWin}>
                    <span className="icon-win-red">
                      <i className="fa-solid fa-medal"></i>
                    </span>
                    <span id="red-fighter">
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="timer-area">
              <div className="timer-text" onClick={this.startTimer}>
                <span className="info-text">
                  <span id="match-time">
                  </span>
                </span>
              </div>
              <div className="round-text">
                <span className="info-text">
                  <span id="match-round">
                  </span>
                </span>
              </div>
            </div>
            <div className="info-match-right-area">
              <div className="match-no">
                <div className="match-prev" onClick={this.prevMatch}>
                  <span className=" info-text">
                    <i className="fa fa-caret-left"></i>
                  </span>
                </div>
                <div className="match-choose" onClick={this.showModalChooseMatch}>
                  <span className="info-text">
                    <i className="fa fa-code"></i>
                  </span>
                </div>
                <div className="match-next" onClick={this.nextMatch}>
                  <span className="info-text">
                    <i className="fa fa-caret-right"></i>
                  </span>
                </div>
                <span className="info-text">
                  <span id="match-no"></span>
                </span>
              </div>
              <div className="logo">
                <span className="info-text">
                  {/* <a href="#" onClick={this.showShortcut}><img src={logo} height="100%" /></a> */}
                </span>
              </div>
              <div className="match-type">
                <span className="info-text">
                  <span id="match-type"></span>
                </span>
              </div>
              <div className="match-category">
                <span className="info-text">
                  <span id="match-category"></span>
                </span>
              </div>
              <div className="blue-fighter">
                <div className="blue-win">
                  <span className="info-text">

                  </span>
                </div>
                <div className="fighter-code blue">
                  <span className="info-text-fighter-code-blue">
                    <span id="blue-code"></span>
                  </span>
                </div>
                <div className="fighter-name blue">
                  <span className="info-text-fighter-name-blue" onClick={this.blueWin}>
                    <span id="blue-fighter"></span>
                    <span className="icon-win-blue">
                      <i className="fa-solid fa-medal"></i>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="score-area">
            <div className="red-score">
              <div className="addition" onClick={this.redAddition}></div>
              <div className="subtraction" onClick={this.redSubtraction}></div>
              <span className="info-text">
                <span id="red-score"></span>
              </span>
            </div>
            <div className="blue-score">
              <div className="addition" onClick={this.blueAddition}></div>
              <div className="subtraction" onClick={this.blueSubtraction}></div>
              <span className="info-text">
                <span id="blue-score"></span>
              </span>
            </div>
          </div>
        


        <div className="modal fade" id="passwordModal" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-lock"></i> Vui lòng nhập mật khẩu</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group mb-3">
                  <div className="input-group-prepend">
                    <span className="input-group-text"><i className="fa fa-key" aria-hidden="true"></i></span>
                  </div>
                  <input type="password" className="form-control" placeholder="Mật khẩu" id="txtPassword" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary ok-button" onClick={this.verifyPassword}>OK</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="modalChooseMatch" tabIndex="-" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modalLabel">Trọn trận đấu</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group mb-3">
                  <div className="input-group-prepend">
                    <span className="input-group-text"><i className="fa fa-code"></i></span>
                  </div>
                  <input type="number" className="form-control" placeholder="Số thứ tự trận đấu" id="txtMatchChoose" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={this.chooseMatch}>OK</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="modalConfirm" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"></h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" id="buttonConfirmOK">OK</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="modalShortcut" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-keyboard"></i> Các phím tắt</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Biểu Tượng</th>
                      <th scope="col">Tên phím tắt</th>
                      <th scope="col">Chức năng</th>
                      <th scope="col">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">←</th>
                      <td>Trái</td>
                      <td>-1 điểm cho Đỏ</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">↑</th>
                      <td>Lên</td>
                      <td>+1 điểm cho Đỏ</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">→</th>
                      <td>Phải</td>
                      <td>+1 điểm cho Xanh</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">↓</th>
                      <td>Xuống</td>
                      <td>-1 điểm cho Xanh</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">—</th>
                      <td>Cách</td>
                      <td>Điều khiển đồng hồ</td>
                      <td>Space</td>
                    </tr>
                    <tr>
                      <th scope="row">T</th>
                      <td>T</td>
                      <td>Lùi trận trước</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">C</th>
                      <td>C</td>
                      <td>Chọn trận nhảy cóc</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">D</th>
                      <td>D</td>
                      <td>Đỏ thắng</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th scope="row">X</th>
                      <td>X</td>
                      <td>Xanh thắng</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
        </div>
        
      </div>
    );
  }
}

export default InformationDkContainer;
