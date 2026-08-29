import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './assets/css/style.css';
import { Route, BrowserRouter, RouteComponentProps } from 'react-router-dom';
import HomeContainer from './containers/home.container';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import InformationTqContainer from './containers/infomationTq.container';
import GiamSatDoiKhangContainer from './containers/giamSatDoiKhang.container';
import GiamSatThiQuyenContainer from './containers/giamSatThiQuyen.container';
import GiamDinhThiQuyenContainer from './containers/giamDinhThiQuyen.container';
import GiamDinhDoiKhangContainer from './containers/giamDinhDoiKhang.container';
import SettingContainer from './containers/setting.container';
import CreateTournamentContainer from './containers/createTournament.container';
import EnterCodeContainer from './containers/enterCode.container';
import AdminContainer from './containers/admin.container';
import LoginContainer from './containers/login.container';
import ReactGA from 'react-ga4';
import { ErrorBoundary } from './components/common';
import { AuthGate } from './components/auth';
import RequestAccessPanel from './components/tournament/RequestAccessPanel';

// Extend Window interface for GA_INITIALIZED
declare global {
  interface Window {
    GA_INITIALIZED?: boolean;
  }
}

// Initialize GA4 - Only once
if (!window.GA_INITIALIZED) {
  ReactGA.initialize('G-HPGXRB180Q');
  window.GA_INITIALIZED = true;
}

// Track pageview
ReactGA.send({ hitType: "pageview", page: window.location.pathname });

/**
 * Ba tang cong, theo dung thu tu:
 *
 *   AuthGate            -> phai co tai khoan Google that
 *   RequestAccessPanel  -> phai duoc chu giai duyet, va da biet truc san nao
 *   Container           -> vao thang tran, khong hoi gi them
 *
 * Giam dinh KHONG di qua tang nao ca: ho vao bang ma o `/vao`, va man cham
 * diem tu doc phien tu `codeSession`.
 */
const supervisorRoute = (
  kind: 'combat' | 'martial',
  render: (props: any) => React.ReactNode
) => {
  // `?demo=1` la duong cua nut "Dung thu ngay": phien an danh, giai thu,
  // khong Google, khong duyet. Chi ap dung cho giai thu.
  const demo = new URLSearchParams(window.location.search).get('demo') === '1';

  return (
    <AuthGate
      title={kind === 'combat' ? 'Giám sát đối kháng' : 'Giám sát thi quyền'}
      reason="Đăng nhập để hệ thống biết bạn trực sân nào."
      allowAnonymous={demo}
    >
      {(user) => (
        <RequestAccessPanel user={user} kind={kind} demo={demo}>
          {(access) => render({ user, access })}
        </RequestAccessPanel>
      )}
    </AuthGate>
  );
};

ReactDOM.render(
  <ErrorBoundary>
    <BrowserRouter>
      <div>
        <Route path="/" exact component={HomeContainer} />
        <Route path="/test" component={TestContainer} />

        {/* Trang thong tin van public — nguoi ngoai chi doc */}
        <Route path="/thong-tin-doi-khang" component={InformationDkContainer} />
        <Route path="/thong-tin-thi-quyen" component={InformationTqContainer} />

        <Route
          path="/giam-sat-doi-khang"
          render={() => supervisorRoute('combat', (p) => <GiamSatDoiKhangContainer {...p} />)}
        />
        <Route
          path="/giam-sat-thi-quyen"
          render={() => supervisorRoute('martial', (p) => <GiamSatThiQuyenContainer {...p} />)}
        />

        {/* Duong vao cua giam dinh: mot man hinh, hai chu so */}
        <Route
          path="/vao"
          render={(props: RouteComponentProps) => <EnterCodeContainer history={props.history} />}
        />
        <Route
          path="/giam-dinh-thi-quyen"
          render={(props: RouteComponentProps) => <GiamDinhThiQuyenContainer history={props.history} />}
        />
        <Route
          path="/giam-dinh-doi-khang"
          render={(props: RouteComponentProps) => <GiamDinhDoiKhangContainer history={props.history} />}
        />

        <Route
          path="/thiet-dat"
          render={() => (
            <AuthGate title="Thiết đặt" reason="Trang này dành cho chủ giải.">
              {(user) => <SettingContainer user={user} />}
            </AuthGate>
          )}
        />
        <Route
          path="/tao-giai"
          render={() => (
            <AuthGate title="Tạo giải" reason="Đăng nhập để giải mới thuộc về tài khoản của bạn.">
              {(user) => <CreateTournamentContainer user={user} />}
            </AuthGate>
          )}
        />
        <Route
          path="/quan-tri"
          render={() => (
            <AuthGate title="Quản trị" reason="Trang này chỉ dành cho quản trị viên.">
              {(user) => <AdminContainer user={user} />}
            </AuthGate>
          )}
        />

        <Route path="/login" component={LoginContainer} />
      </div>
    </BrowserRouter>
  </ErrorBoundary>,
  document.getElementById('root')
);
