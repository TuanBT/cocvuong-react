import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import './assets/css/style.css';
import { Route, BrowserRouter } from 'react-router-dom';
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
import LoginContainer from './containers/login.container';
import SignupContainer from './containers/signup.container';
import ReactGA from 'react-ga4';
import { ErrorBoundary } from './components/common';
import { setupElectronBridgeAutoConnect } from './services/bridgeService';

// Extend Window interface for GA_INITIALIZED and CocVuong Bridge
declare global {
  interface Window {
    GA_INITIALIZED?: boolean;
    __COCVUONG_BRIDGE__?: {
      url: string;
      localIP: string;
      port: number;
      isElectron: boolean;
    };
    cocvuongElectron?: {
      isElectron: boolean;
      getBridgeInfo: () => Promise<any>;
      onBridgeReady: (callback: (info: any) => void) => void;
    };
  }
}

// Initialize GA4 - Only once
if (!window.GA_INITIALIZED) {
  ReactGA.initialize('G-HPGXRB180Q');
  window.GA_INITIALIZED = true;
}

// Track pageview
ReactGA.send({ hitType: "pageview", page: window.location.pathname });

// Setup auto-connect nếu đang chạy trong CocVuong Desktop (Electron)
setupElectronBridgeAutoConnect();

ReactDOM.render(
  <ErrorBoundary>
    <BrowserRouter>
      <div>
        <Route path="/" exact component={HomeContainer} />
        <Route path="/test" component={TestContainer} />
        <Route path="/thong-tin-doi-khang" component={InformationDkContainer} />
        <Route path="/thong-tin-thi-quyen" component={InformationTqContainer} />
        <Route path="/giam-sat-doi-khang" component={GiamSatDoiKhangContainer} />
        <Route path="/giam-sat-thi-quyen" component={GiamSatThiQuyenContainer} />
        <Route path="/giam-dinh-thi-quyen" component={GiamDinhThiQuyenContainer} />
        <Route path="/giam-dinh-doi-khang" component={GiamDinhDoiKhangContainer} />
        <Route path="/thiet-dat" component={SettingContainer} />
        <Route path="/tao-giai" component={CreateTournamentContainer} />
        <Route path="/login" component={LoginContainer} />
        <Route path="/signup" component={SignupContainer} />
      </div>
    </BrowserRouter>
  </ErrorBoundary>,
  document.getElementById('root')
);
