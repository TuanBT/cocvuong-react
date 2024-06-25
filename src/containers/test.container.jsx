import React, { Component } from 'react';

class TestContainer extends Component {
  constructor(props) {
    document.title = 'Test';
    super(props);
  }

  componentDidMount() {
    this.main();
  }

  main() {

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
