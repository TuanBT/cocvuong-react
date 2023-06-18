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





  render() {
    return (
      <div>

        <div className="vsc-initialized" style={{margin: '0'}}>
          <div className="gd-info">
            <header className="blog-header p-3">
              <div className="col-12 text-center">
                <span className="text-muted">
                  <a href="#" onClick={this.showShortcut}><img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân"
                    className="img-fluid" style={{height: '50px'}} /></a>
                </span>
              </div>
            </header>
            <header className="blog-header p-3">
              <div className="row justify-content-between align-items-center">

                <div className="col-12 text-center">
                  <h1 className="blog-header-logo text-midnight-blue" id="gd-name">&nbsp;</h1>
                  <h1 className="blog-header-logo" id="gd-match">&nbsp;</h1>
                </div>

              </div>
            </header>
          </div>
          <div className="score-gd-area">
            <div className="red-score-refereeSc gdp">
              {/* <div className="add-score zero red" onclick="redAddition(-1)">
                <span className="info-text">
                    -1
                </span>
            </div>  */}
              <div className="add-score one red" onclick="redAddition(1)">
                <span className="info-text">
                  1
                </span>
              </div>
              <div className="add-score two red" onclick="redAddition(2)">
                <span className="info-text">
                  2
                </span>
              </div>
            </div>
            <div className="blue-score-refereeSc gdp">
              {/* <div className="add-score zero blue" onclick="blueAddition(-1)">
                <span className="info-text">
                    -1
                </span>
            </div>  */}
              <div className="add-score one blue" onclick="blueAddition(1)">
                <span className="info-text">
                  1
                </span>
              </div>
              <div className="add-score two blue" onclick="blueAddition(2)">
                <span className="info-text">
                  2
                </span>
              </div>
            </div>
          </div>

          <div className="modal fade" id="passwordModal" tabindex="-1" role="dialog">
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

          <div className="modal fade" id="chooseRefereeNoModal" tabindex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-id-badge"></i> Chọn mã giám định của bạn</h5>
                  <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="btn-group btn-group-toggle" data-toggle="buttons">
                    <label className="btn btn-warning active">
                      <input type="radio" name="optionsReferee" value="1" autocomplete="off" checked /><i className="fa-solid fa-user"></i> Giám định I
                    </label>
                    <label className="btn btn-warning">
                      <input type="radio" name="optionsReferee" value="2" autocomplete="off" /><i className="fa-solid fa-user"></i> Giám định II
                    </label>
                    <label className="btn btn-warning">
                      <input type="radio" name="optionsReferee" value="3" autocomplete="off" /><i className="fa-solid fa-user"></i> Giám định III
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={this.chooseRefereeNo}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal fade" id="modalShortcut" tabindex="-1" role="dialog">
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
                        <td>+2 Đỏ</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">↑</th>
                        <td>Lên</td>
                        <td>+1 Đỏ</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">→</th>
                        <td>Phải</td>
                        <td>+2 Xanh</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">↓</th>
                        <td>Xuống</td>
                        <td>+1 Xanh</td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row">—</th>
                        <td>Space</td>
                        <td>Hủy điểm vừa chấm</td>
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
