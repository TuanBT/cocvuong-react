import React, { Component } from 'react';

class LoginContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>

        <div className="container-auth">
          <h2>Login</h2>

          <form>
            <input
              name="email"
              type="email"
              placeholder="E-mail"
            />
            <input
              name="pass"
              type="password"
              placeholder="Password"
            />

            <div className="container-buttons">
              <button type="submit">Log In</button>
              <button type="button"> Google </button>
            </div>
          </form>
        </div>


      </div>
    );
  }
}

export default LoginContainer;
