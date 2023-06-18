import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';

class LoginContainer extends Component {
  render() {
    return (
      <div className="login">
        <p>
          <FormattedMessage
            id={'Login.title'}
            defaultMessage={'Login'}
            values={{}}
          />
        </p>
        <h1>
          {/*<a href="./setting.html">Setting</a><br/>*/}
          <a href="./info-dk">Info</a><br />
          <br />
          <a href="./cham-diem-dk">Chấm đối kháng</a><br />
          <a href="./giam-dinh-dk">Giám Định Đối kháng</a><br />
          <br />
          <a href="./cham-diem-hd">Chấm điểm Quyền</a><br />
          <a href="./giam-dinh-hd">Giám Định Quyền</a><br />
        </h1>
      </div>
    );
  }
}

export default LoginContainer;
