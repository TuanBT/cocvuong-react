import React, { Component } from 'react';
import { database } from '../firebase';

class LoginContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();



  }










  render() {
    return (
      <div>

       login


      </div>
    );
  }
}

export default LoginContainer;
