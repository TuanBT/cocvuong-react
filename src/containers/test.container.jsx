import React, { Component } from 'react';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";

class TestContainer extends Component {
  constructor(props) {
    super(props);
    this.db = Firebase();
  }

  componentDidMount() {
    this.main();
  }

  main() {
    let password = "H";
    get(child(ref(this.db), 'pass/firstPass')).then((snapshot) => {
      if (password === snapshot.val()) {
        console.log('ss');
      } else {
        console.log('fail');
      }
    }).catch((error) => {
      console.error(error);
    });

  }


  render() {
    return (
      <div>
        <div style={{ height: "100vh" }}>
          <h2>TEST PAGE</h2>


          {/* https://www.youtube.com/watch?v=1TIVdIOIX64&ab_channel=TheAmazingCodeverse */}
          {/* https://firebase.google.com/docs/database/web/read-and-write */}


        </div>
      </div>
    );
  }
}

export default TestContainer;
