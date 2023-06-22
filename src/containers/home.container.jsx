import React, { Component } from 'react';
import { database } from '../firebase';

class HomeContainer extends Component {
  constructor(props) {
    super(props);
    const me = this;
    this.ref = database.ref();


  }










  render() {
    return (
      <div>

        <p>
          Welcome Home
        </p>

        <main>
          <h1><b>Auth with</b> <span>Firebase</span> <b>and</b> <span>React</span></h1>
          <section>
          <a href="/login">Login</a><br />
          <a href="/signup">Signup</a><br />
          </section>
        </main>


        <div className="body login">
          <h1>
            <a href="/login">Login</a><br />
            <br />
            <a href="/signup">Signup</a><br />
            <br />

            <a href="./info-dk">Info</a><br />
            <br />
            <a href="./setting">Setting</a><br />
            <br />
            <a href="./cham-diem-dk">Chấm đối kháng</a><br />
            <a href="./giam-dinh-dk">Giám Định Đối kháng</a><br />
            <br />
            <a href="./cham-diem-hd">Chấm điểm Quyền</a><br />
            <a href="./giam-dinh-hd">Giám Định Quyền</a><br />
          </h1>
        </div>


      </div>
    );
  }
}

export default HomeContainer;
