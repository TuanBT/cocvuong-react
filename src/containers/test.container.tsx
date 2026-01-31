import React, { Component } from 'react';

interface TestContainerProps {}

interface TestContainerState {}

class TestContainer extends Component<TestContainerProps, TestContainerState> {
  constructor(props: TestContainerProps) {
    super(props);
    document.title = 'Test';
  }

  componentDidMount() {
    this.main();
  }

  main() {
    // Test logic here
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
