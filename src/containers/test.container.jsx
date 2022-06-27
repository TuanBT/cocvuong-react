import React, { Component } from 'react';
import { database } from '../firebase';

class TestContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {values : "Init"}

    this.ref = database.ref('/room');

    this.displays = this.displays.bind(this);


    this.ref.on('value', (snapshot) => {
      const value = snapshot.val();
      this.setState({ values: JSON.stringify(value) })
      console.log(this.state.values);
    });
  }


  displays() {
    return 'display';
  }

  render() {
    return (
      <div>
        <div onLoad=''></div>
        <div>{this.displays()}</div>
        <h1>{this.state.values}</h1>
        <h2>TEST</h2>
      </div>
    );
  }
}

export default TestContainer;
