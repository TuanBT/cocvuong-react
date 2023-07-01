import React, { Component } from 'react';
import { Route,NavLink,HashRouter } from "react-router-dom";

class HomeContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>

        <div className="container py-3">
          <div className="row row-cols-1 row-cols-md-4 mb-3 text-center">
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-success">
                <div className="card-header py-3 text-bg-success border-success">
                  <h4 className="my-0 fw-normal">GIÁM SÁT ĐỐI KHÁNG</h4>
                </div>
                <div className="card-body">
                <span className="d-block text-center pb-3 bigIcon"><NavLink to="giam-sat-doi-khang"><i className="fa-solid fa-tv"></i></NavLink></span>
                  {/* <NavLink to="cham-diem-dk"><button type="button" className="w-100 btn btn-lg btn-success">Bắt đầu</button></NavLink> */}
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-success">
                <div className="card-header py-3 text-bg-success border-success">
                  <h4 className="my-0 fw-normal">GIÁM ĐỊNH ĐỐI KHÁNG</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><NavLink to="giam-dinh-doi-khang"><i className="fa-solid fa-table-columns"></i></NavLink></span>
                  {/* <NavLink to="giam-dinh-dk"><button type="button" className="w-100 btn btn-lg btn-success">Bắt đầu</button></NavLink> */}
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-warning">
                <div className="card-header py-3 text-bg-warning border-warning">
                  <h4 className="my-0 fw-normal">GIÁM SÁT THI QUYỀN</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><NavLink to="giam-sat-thi-quyen"><i className="fa-solid fa-tv"></i></NavLink></span>
                  {/* <NavLink to="cham-diem-hd"><button type="button" className="w-100 btn btn-lg btn-warning">Bắt đầu</button></NavLink> */}
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-warning">
                <div className="card-header py-3 text-bg-warning border-warning">
                  <h4 className="my-0 fw-normal">GIÁM ĐỊNH THI QUYỀN</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><NavLink to="giam-dinh-thi-quyen"><i className="fa-solid fa-calculator"></i></NavLink></span>
                  {/* <NavLink to="giam-dinh-thi-quyen"><button type="button" className="w-100 btn btn-lg btn-warning">Bắt đầu</button></NavLink> */}
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm border-primary">
                <div className="card-header py-3 text-bg-primary border-primary">
                  <h4 className="my-0 fw-normal">THÔNG TIN</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><NavLink to="thong-tin-doi-khang"><i className="fa-solid fa-tv"></i></NavLink></span>
                  {/* <NavLink to="info-dk"><button type="button" className="w-100 btn btn-lg btn-primary">Bắt đầu</button></NavLink> */}
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
                <div className="card-header py-3 text-bg-primary border-primary">
                  <h4 className="my-0 fw-normal">THIẾT ĐẶT</h4>
                </div>
                <div className="card-body">
                  <span className="d-block text-center pb-3 bigIcon"><NavLink to="thiet-dat"><i className="fa-solid fa-gear"></i></NavLink></span>
                  {/* <NavLink to="setting"><button type="button" className="w-100 btn btn-lg btn-primary">Bắt đầu</button></NavLink> */}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* <div className="body login">
          <h1>
          <NavLink to="test">Test</NavLink>
          <br />
            <br />
            <NavLink to="login">login</NavLink>
            <br />
            <NavLink to="signup">signup</NavLink>
            <br />
          </h1>
        </div> */}


      </div>
    );
  }
}

export default HomeContainer;
