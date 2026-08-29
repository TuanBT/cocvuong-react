import React, { Component } from 'react';
import GoogleSignInCard from './GoogleSignInCard';
import { AppUser, ensureAnonymous, onAuthChanged } from '../../services/authService';

interface AuthGateProps {
  title?: string;
  reason?: string;
  /**
   * Cho phien AN DANH di qua (che do dung thu).
   *
   * Chi dung cho giai thu: 12.5(b) hua "bam mot nut la dung thu duoc ngay,
   * khong can ca Google". Tuyet doi khong bat cho giai that.
   */
  allowAnonymous?: boolean;
  /** Nhan tai khoan da dang nhap; chi duoc goi khi chac chan co nguoi that. */
  children: (user: AppUser) => React.ReactNode;
}

interface AuthGateState {
  user: AppUser | null;
  ready: boolean;
}

/**
 * Bao cac trang chi danh cho nguoi da dang nhap Google.
 *
 * Ba trang thai, khong duoc gop:
 * 1. **Chua biet** — Firebase dang khoi phuc phien tu localStorage. Phai hien
 *    man cho, neu khong nguoi dang co phien se thay nhay mot cai man dang
 *    nhap moi lan tai trang.
 * 2. **Chua dang nhap / chi co phien an danh** — hien nut Google. Phien an danh
 *    (cua giam dinh) KHONG duoc tinh la dang nhap: no khong gan voi ai ca.
 * 3. **Da dang nhap** — dung trang that.
 *
 * `children` la ham chu khong phai node: trang con can uid de loc giai va
 * doc phan cong, nen phai nhan duoc tai khoan chu khong chi duoc cho vao.
 */
class AuthGate extends Component<AuthGateProps, AuthGateState> {
  unsubscribe: (() => void) | null = null;

  state: AuthGateState = { user: null, ready: false };

  componentDidMount() {
    this.unsubscribe = onAuthChanged((user) => {
      const ok = user && (this.props.allowAnonymous || !user.isAnonymous);
      this.setState({ user: ok ? user : null, ready: true });

      // Che do dung thu: chua co phien nao thi ky ngam, khong hoi gi nguoi dung
      if (!user && this.props.allowAnonymous) {
        void ensureAnonymous().catch(() => undefined);
      }
    });
  }

  componentWillUnmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  render() {
    const { user, ready } = this.state;
    const { title, reason, children } = this.props;

    if (!ready) {
      return (
        <div data-accent="brand" className="min-h-screen flex flex-col items-center justify-center
          gap-3 bg-slate-50 text-slate-500">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl text-accent-600" aria-hidden="true" />
          <p className="m-0 text-sm">Đang kiểm tra đăng nhập…</p>
        </div>
      );
    }

    if (!user) {
      return <GoogleSignInCard title={title} reason={reason} />;
    }

    return <>{children(user)}</>;
  }
}

export default AuthGate;
