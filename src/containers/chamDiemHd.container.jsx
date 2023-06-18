import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import "../assets/css/style.css";
import '../assets/css/style-hd.css';

class InformationDkContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();
    this.tournamentObj;

  }





  render() {
    return (
      <div>
        <div>
        <div style={{ height: '100vh' }}>
            <div className="information">
              <div className="info">
                <span className="info-text tournament-quyen-name">
                  <span id="tournamentName">
                  </span>
                </span>
              </div>
              <div className="timer-area">
                <div className="timer-text" onClick={this.startTimer}>
                  <span className="info-text">
                    <span id="match-time">
                      00:00
                    </span>
                  </span>
                </div>
              </div>
              <div className="logo-area">
                <span className="info-text">
                  {/* <a href="#" onClick={this.showShortcut}><img src={logo} height="100%"></img></a> */}
                </span>
              </div>
            </div>
            <div className="match-detail">
              <div className="match-title">
                <div className="match-prev" onClick={this.prevMatchMartial}>
                  <span className=" info-text">
                    <i className="fa fa-caret-left"></i>
                  </span>
                </div>
                <div className="match-name-no">
                  <span className="info-text">
                    <span id="match-martial-name">
                      {/* <!-- Đa luyện vũ khí nữ --> */}
                    </span>
                    <span>
                      -
                    </span>
                    <span id="match-martial-no">
                      {/* 1 */}
                    </span>
                  </span>
                </div>
                <div className="match-next" onClick={this.nextMatchMartial}>
                  <span className="info-text">
                    <i className="fa fa-caret-right"></i>
                  </span>
                </div>
              </div>
              <div className="match-fighter" id="match-martial-team">
                {/* <div className="fighter-detail">
                    <div className="fighter-code">
                        <span className="info-text">
                            SE123456
                        </span>
                    </div>
                    <div className="fighter-name">
                        <span className="info-text">
                            Nguyễn Đặng Thành Trung
                        </span>
                    </div>
                </div> */}
              </div>
            </div>
            <div className="main-score">
              <span className="info-text" id="averageScore" onClick={this.takeAverageScore}>
                000
              </span>
            </div>
            <div className="referee-score-area">
              <div className="referee-sub-area">
                <div className="referee-title">
                  <span className="info-text">
                    Giám định I
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-1-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score">
              </div>
              <div className="referee-sub-area">
                <div className="referee-title">
                  <span className="info-text">
                    Giám định II
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-2-score">
                    00
                  </span>
                </div>
              </div>
              <div className="spec-score">
              </div>
              <div className="referee-sub-area">
                <div className="referee-title">
                  <span className="info-text">
                    Giám định III
                  </span>
                </div>
                <div className="referee-sub-score">
                  <span className="info-text" id="referee-3-score">
                    00
                  </span>
                </div>
              </div>
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

          <div className="modal fade" id="takeMainScoreModal" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel">Chấm điểm</h5>
                  <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="container cal mt-3">
                    <div className="card-deck mb-3 text-center">
                      <div className="card mb-4 box-shadow">
                        <div className="card-header">
                          <h1 className="my-0 font-weight-normal" id="referee-result-box">000</h1>
                        </div>
                        <div className="card-body">
                          <div className="buttons">
                            <div className="button num-button seven" onClick={this.input}>7</div>
                            <div className="button num-button eight" onClick={this.input}>8</div>
                            <div className="button num-button  nine" onClick={this.input}>9</div>
                            <div className="button num-button  four" onClick={this.input}>4</div>
                            <div className="button num-button  five" onClick={this.input}>5</div>
                            <div className="button num-button  six" onClick={this.input}>6</div>
                            <div className="button num-button  one" onClick={this.input}>1</div>
                            <div className="button num-button  two" onClick={this.input}>2</div>
                            <div className="button num-button  three" onClick={this.input}>3</div>
                            <div className="button action-btn eraser" onClick={this.clearInput}><i
                              className="fa-regular fa-trash-can"></i>
                            </div>
                            <div className="button num-button" onClick={this.input}>0</div>
                            <div className="button action-btn enter" onClick={this.submitInput}><i
                              className="fa-solid fa-check"></i></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
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
                        <td>Lùi trận trước</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">→</th>
                        <td>Phải</td>
                        <td>Đến trận tiếp theo</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">—</th>
                        <td>Cách</td>
                        <td>Điều khiển đồng hồ</td>
                        <td>Space</td>
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
