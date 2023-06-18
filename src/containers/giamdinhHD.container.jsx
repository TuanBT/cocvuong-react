import React, { Component } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import logo from '../assets/img/logo.png';
import "../assets/css/style.css";
import '../assets/css/style-giam_dinh_hd.css';

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
  <div className="vsc-initialized">
    <div className="container-fluit">
      <header className="blog-header p-3">
        <div className="row flex-nowrap justify-content-between align-items-center">
          <div className="col-4 pt-1 text-center">
            <span className="text-pomegrante" id="tournamentName"></span>
          </div>
          <div className="col-4 text-center">
            <h2 className="blog-header-logo text-midnight-blue" id="gd-name"></h2>
          </div>
          <div className="col-4 d-flex justify-content-end align-items-center">
            <span className="text-muted">
              <a href="#" onClick={this.showShortcut}><img src={logo} alt="FPT University - FVC - Bùi Tiến Tuân"
                  className="img-fluid" style="height: 50px;"/></a>
            </span>
          </div>
        </div>
      </header>
    </div>

    <div className="pricing-header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center text-belize-hole">
      <h1 className="display-4">
        <span id="match-martial-name">
        </span>
        <span>
          -
        </span>
        <span id="match-martial-no">
        </span>
      </h1>
      <p className="lead text-danger" id="internet-status"></p>
    </div>
  </div>

  <div className="container cal mt-3">
    <div className="card-deck mb-3 text-center">
      <div className="card mb-4 box-shadow">
        <div className="card-header">
          <h1 className="my-0 font-weight-normal" id="referee-result-box">00</h1>
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
            <div className="button action-btn enter" onClick={this.submitInput}><i className="fa-solid fa-check"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div>
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
            <input type="password" className="form-control" placeholder="Mật khẩu" id="txtPassword"/>
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
          <h5 className="modal-title" id="modalLabel"><i className="fa-solid fa-id-badge"></i> Chọn mã giám định của bạn
          </h5>
          <button type="button" className="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="btn-group btn-group-toggle" data-toggle="buttons">
            <label className="btn btn-warning active">
              <input type="radio" name="optionsReferee" value="1" autocomplete="off" checked/><i className="fa-solid fa-user"></i> Giám định I
            </label>
            <label className="btn btn-warning">
              <input type="radio" name="optionsReferee" value="2" autocomplete="off"/><i
                className="fa-solid fa-user"></i> Giám định II
            </label>
            <label className="btn btn-warning">
              <input type="radio" name="optionsReferee" value="3" autocomplete="off"/><i
                className="fa-solid fa-user"></i> Giám định III
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
                <th scope="col">Lưu ý</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">0..9</th>
                <td>0..9</td>
                <td>Số 0 tới 9</td>
                <td></td>
              </tr>
              <tr>
                <th scope="row">—</th>
                <td>Space</td>
                <td>Chấm điểm</td>
                <td></td>
              </tr>
              <tr>
                <th scope="row">Esc</th>
                <td>Esc</td>
                <td>Xóa điểm</td>
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

      </div >
    );
  }
}

export default InformationDkContainer;
