import React, { Component } from 'react';
import { database } from '../firebase';

class TestContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h2>TEST PAGE</h2>
      </div>
    );
  }
}

export default TestContainer;
