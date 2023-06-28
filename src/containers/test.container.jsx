import React, { Component, useEffect } from 'react';
import $ from 'jquery';
import { database } from '../firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class TestContainer extends Component {
  constructor(props) {
    super(props);
    this.ref = database.ref();

    this.state = {
      data: []
    };

  }

  componentDidMount() {
    this.showPasswordModal();
  }
  
  verifyPassword = () => {
    var password = $('#txtPassword').val();

    if (password != null && password != "") {
      this.ref.child('pass/firstPass').once('value', (snapshot) => {
        if (password == snapshot.val()) {
          this.hidePasswordModal();
          this.main();
        } else {
          toast.error("Sai mật khẩu!");
        }
      })
    } else {
      toast.error("Sai mật khẩu!");
    }
  }

  main(){
    
  }


  showPasswordModal = () => {
    $('#passwordModal').removeClass('modal display-none').addClass('modal display-block');
  };
  hidePasswordModal = () => {
    $('#passwordModal').removeClass('modal display-block').addClass('modal display-none');;
  };

  render() {
    return (
      <div>
        <div style={{ height: "100vh" }}>
          <h2>TEST PAGE</h2>

          <div className="modal display-none" id="passwordModal" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="fa-solid fa-lock"></i> Vui lòng nhập mật khẩu</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={this.hidePasswordModal}></button>
                </div>
                <div className="modal-body">
                  <div className="input-group mb-3">
                    <span className="input-group-text"><i className="fa fa-key" aria-hidden="true"></i></span>
                    <input type="password" className="form-control" placeholder="Mật khẩu" id="txtPassword" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary ok-button" onClick={this.verifyPassword}>OK</button>
                  <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.hidePasswordModal} >Cancel</button>
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
