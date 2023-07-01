import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import '../src/assets/css/style.css';
import { BrowserRouter, Route, HashRouter } from 'react-router-dom'
import HomeContainer from './containers/home.container';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import ChamDiemDkContainer from './containers/chamDiemDk.container';
import ChamDiemHdContainer from './containers/chamDiemHd.container';
import GiamDinhThiQuyenContainer from './containers/giamDinhThiQuyen.container';
import GiamDinhDkContainer from './containers/giamDinhDk.container';
import SettingContainer from './containers/setting.container';
import LoginContainer from './containers/login.container';
import SignupContainer from './containers/signup.container';

ReactDOM.render(
  <HashRouter>
    <div>
      <Route path="/" exact component={HomeContainer} />
      <Route path="/test" component={TestContainer} />
      <Route path="/thong-tin-doi-khang" component={InformationDkContainer} />
      <Route path="/giam-sat-doi-khang" component={ChamDiemDkContainer} />
      <Route path="/giam-sat-thi-quyen" component={ChamDiemHdContainer} />
      <Route path="/giam-dinh-thi-quyen" component={GiamDinhThiQuyenContainer} />
      <Route path="/giam-dinh-doi-khang" component={GiamDinhDkContainer} />
      <Route path="/thiet-dat" component={SettingContainer} />
      <Route path="/login" component={LoginContainer} />
      <Route path="/signup" component={SignupContainer} />
    </div>
  </HashRouter>,
  document.getElementById('root')
);
