import React, { Component } from 'react';
import logo from '../assets/img/logo.png';
import { Button } from '../components/ui';

interface LoginContainerProps {}

/**
 * Trang dang nhap.
 *
 * Man hinh nay truoc day la HTML tran khong co lop trang tri nao - o nhap
 * khong vien, nut khong mau. Nay dung chung ngon ngu voi phan con lai cua app.
 * Phan xu ly dang nhap chua duoc noi voi Firebase, form van chi la giao dien.
 */
class LoginContainer extends Component<LoginContainerProps> {
  constructor(props: LoginContainerProps) {
    super(props);
    document.title = 'Đăng nhập - Cóc Vương';
  }

  render() {
    return (
      <div data-accent="brand" className="min-h-screen flex items-center justify-center p-4 select-text
        bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex bg-white p-3 rounded-card shadow-card mb-4">
              <img src={logo} alt="Cóc Vương" className="h-12 w-auto" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Đăng nhập</h1>
            <p className="text-sm text-slate-500 m-0">Hệ thống chấm điểm Vovinam</p>
          </div>

          <form className="bg-white rounded-card shadow-card border border-slate-100 p-5 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-slate-600 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ten@email.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-control bg-white
                  text-slate-800 placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-slate-600 mb-1.5">
                Mật khẩu
              </label>
              <input
                id="login-password"
                name="pass"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-200 rounded-control bg-white
                  text-slate-800 placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
              />
            </div>

            <Button type="submit" variant="primary" size="lg" block>Đăng nhập</Button>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex-1 h-px bg-slate-200" />
              hoặc
              <span className="flex-1 h-px bg-slate-200" />
            </div>

            <Button variant="secondary" size="lg" block icon="fa-brands fa-google">
              Tiếp tục với Google
            </Button>
          </form>
        </div>
      </div>
    );
  }
}

export default LoginContainer;
