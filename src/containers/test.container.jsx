import React, { Component } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class TestContainer extends Component {
  constructor(props) {
    super(props);

    this.state = { values: "Init" }

    this.displays = this.displays.bind(this);

    toast.error("Error Notification !", {
      position: toast.POSITION.TOP_LEFT
    });

  }

  notify = () => toast.success("Wow so easy!");

  displays = () => {
    return 'display';
  }

  render() {
    return (
      <div>
        <h2>TEST PAGE</h2>
        <div>{this.displays}</div>
        <h1>{this.state.values}</h1>
        

        <button onClick={this.notify}>Notify!</button>
        {/* https://fkhadra.github.io/react-toastify/positioning-toast */}
        <ToastContainer />

      </div>
    );
  }
}

export default TestContainer;
