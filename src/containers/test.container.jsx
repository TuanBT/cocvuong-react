import React, { Component, useState } from 'react';
import $ from 'jquery';
import "../assets/css/style.css";

class TestContainer extends Component {
  constructor(props) {
    super(props);
  }

  showModal = () => {
    $('#modalChooseMatch').removeClass('modal display-none').addClass('modal display-block');
  };

  hideModal = () => {
    $('#modalChooseMatch').removeClass('modal display-block').addClass('modal display-none');;
  };


  render() {
    return (
      <div>
        <div style={{ height: "100vh" }}>
        <h2>TEST PAGE</h2>
        

        <button onClick={this.showModal}>
          Launch Form modal
        </button>
        <div className="modal display-none" id="modalChooseMatch" tabIndex="-" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalLabel">Trọn trận đấu</h5>
                  <button type="button" className="close" data-dismiss="modal" onClick={this.hideModal} aria-label="Close">
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
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hideModal}>Cancel</button>
                </div>
              </div>
            </div>
          </div>

          </div>
      </div>
    );
  }
}

export default TestContainer;
