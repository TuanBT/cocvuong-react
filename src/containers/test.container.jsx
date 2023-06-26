import React, { Component, useState } from 'react';
import $ from 'jquery';
import "../assets/css/style.css";

class TestContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
    };

    }

  render() {
    return (
      <div>
        <div style={{ height: "100vh" }}>
          <h2>TEST PAGE</h2>



        </div>
      </div>
    );
  }
}

export default TestContainer;
