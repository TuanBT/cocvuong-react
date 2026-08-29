import React, { Component } from 'react';
import GoogleSignInCard from '../components/auth/GoogleSignInCard';
import { onAuthChanged } from '../services/authService';

interface LoginContainerProps {
  history?: { push: (path: string) => void };
}

interface LoginContainerState {
  signedIn: boolean;
}

/**
 * Trang dang nhap.
 *
 * Ban cu la mot form email/mat khau chua noi voi Firebase — chi la giao dien.
 * Nay chi con **mot nut Google**: bo han duong mat khau la bo luon kho mat
 * khau chung dang nam cong khai trong `commonSetting`.
 *
 * Khong co trang "Tao tai khoan": dang nhap Google lan dau la co tai khoan.
 */
class LoginContainer extends Component<LoginContainerProps, LoginContainerState> {
  unsubscribe: (() => void) | null = null;
  state: LoginContainerState = { signedIn: false };

  constructor(props: LoginContainerProps) {
    super(props);
    document.title = 'Đăng nhập - Cóc Vương';
  }

  componentDidMount() {
    this.unsubscribe = onAuthChanged((user) => {
      this.setState({ signedIn: !!user && !user.isAnonymous });
    });
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  goHome = () => {
    if (this.props.history) this.props.history.push('/');
    else window.location.href = '/';
  };

  render() {
    if (this.state.signedIn) {
      return (
        <div data-accent="brand" className="min-h-screen flex flex-col items-center justify-center
          gap-4 p-6 text-center bg-slate-50">
          <i className="fa-solid fa-circle-check text-4xl text-emerald-500" aria-hidden="true" />
          <p className="m-0 text-slate-600">Bạn đã đăng nhập.</p>
          <button type="button" onClick={this.goHome}
            className="px-5 py-3 rounded-control bg-accent-600 text-white font-medium">
            Về trang chủ
          </button>
        </div>
      );
    }

    return (
      <GoogleSignInCard
        title="Đăng nhập"
        reason="Dành cho ban tổ chức và giám sát."
        onSignedIn={this.goHome}
      />
    );
  }
}

export default LoginContainer;
