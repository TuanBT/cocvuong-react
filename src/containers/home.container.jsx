import React, { Component } from 'react';

class HomeContainer extends Component {
  constructor(props) {
    super(props);
  }

  handleClickCDDK() {
    window.open('./cham-diem-dk', '_self');
  }
  handleClickGDDK() {
    window.open('./giam-dinh-dk', '_self');
  }
  handleClickCDHD() {
    window.open('./cham-diem-hd', '_self');
  }
  handleClickGDHD() {
    window.open('./giam-dinh-hd', '_self');
  }
  handleClickInfo() {
    window.open('./info-dk', '_self');
  }
  handleClickSetting() {
    window.open('./setting', '_self');
  }

  render() {
    return (
      <div>

        <div className="container py-3">
          <div className="row row-cols-1 row-cols-md-4 mb-3 text-center">
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-success">
                <div className="card-header py-3 text-bg-outline-success border-success">
                  <h4 className="my-0 fw-normal">GIÁM SÁT ĐỐI KHÁNG</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><i className="fa-solid fa-tv"></i></span>
                  <button type="button" className="w-100 btn btn-lg btn-success" onClick={this.handleClickCDDK}>Bắt đầu</button>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-success">
                <div className="card-header py-3 text-bg-outline-success border-success">
                  <h4 className="my-0 fw-normal">GIÁM ĐỊNH ĐỐI KHÁNG</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><i className="fa-solid fa-table-columns"></i></span>
                  <button type="button" className="w-100 btn btn-lg btn-success" onClick={this.handleClickGDDK}>Bắt đầu</button>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-warning">
                <div className="card-header py-3 text-bg-outline-warning border-warning">
                  <h4 className="my-0 fw-normal">GIÁM SÁT THI QUYỀN</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><i className="fa-solid fa-tv"></i></span>
                  <button type="button" className="w-100 btn btn-lg btn-warning" onClick={this.handleClickCDHD}>Bắt đầu</button>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-warning">
                <div className="card-header py-3 text-bg-outline-warning border-warning">
                  <h4 className="my-0 fw-normal">GIÁM ĐỊNH THI QUYỀN</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><i className="fa-solid fa-calculator"></i></span>
                  <button type="button" className="w-100 btn btn-lg btn-warning" onClick={this.handleClickGDHD}>Bắt đầu</button>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-primary">
                <div className="card-header py-3 text-bg-outline-primary border-primary">
                  <h4 className="my-0 fw-normal">THÔNG TIN</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><i className="fa-solid fa-tv"></i></span>
                  <button type="button" className="w-100 btn btn-lg btn-primary" onClick={this.handleClickInfo}>Xem</button>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="rounded-3">

              </div>
            </div>
            <div className="col">
              <div className="rounded-3">

              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-primary">
                <div className="card-header py-3 text-bg-outline-primary border-primary">
                  <h4 className="my-0 fw-normal">THIẾT ĐẶT</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><i className="fa-solid fa-gear"></i></span>
                  <button type="button" className="w-100 btn btn-lg btn-primary" onClick={this.handleClickSetting}>Truy cập</button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="body login">
          <h1>
            <a href="/test">Test</a><br />
            <br />
            <a href="/login">Login</a><br />
            <br />
            <a href="/signup">Signup</a><br />
            <br />
          </h1>
        </div>


      </div>
    );
  }
}

export default HomeContainer;
