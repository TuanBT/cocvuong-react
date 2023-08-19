import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import '../src/assets/css/style.css';
import { BrowserRouter, Route, HashRouter } from 'react-router-dom'
import HomeContainer from './containers/home.container';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import GiamSatDoiKhangContainer from './containers/giamSatDoiKhang.container';
import GiamSatDoiKhang2Container from './containers/giamSatDoiKhang2.container';
import GiamSatThiQuyenContainer from './containers/giamSatThiQuyen.container';
import GiamDinhThiQuyenContainer from './containers/giamDinhThiQuyen.container';
import GiamDinhDoiKhangContainer from './containers/giamDinhDoiKhang.container';
import GiamDinhDoiKhang2Container from './containers/giamDinhDoiKhang2.container';
import SettingContainer from './containers/setting.container';
import LoginContainer from './containers/login.container';
import SignupContainer from './containers/signup.container';

ReactDOM.render(
  <HashRouter>
    <div>
      <Route path="/" exact component={HomeContainer} />
      <Route path="/test" component={TestContainer} />
      <Route path="/thong-tin-doi-khang" component={InformationDkContainer} />
      <Route path="/giam-sat-doi-khang" component={GiamSatDoiKhangContainer} />
      <Route path="/giam-sat-doi-khang-2" component={GiamSatDoiKhang2Container} />
      <Route path="/giam-sat-thi-quyen" component={GiamSatThiQuyenContainer} />
      <Route path="/giam-dinh-thi-quyen" component={GiamDinhThiQuyenContainer} />
      <Route path="/giam-dinh-doi-khang" component={GiamDinhDoiKhangContainer} />
      <Route path="/giam-dinh-doi-khang-2" component={GiamDinhDoiKhang2Container} />
      <Route path="/thiet-dat" component={SettingContainer} />
      <Route path="/login" component={LoginContainer} />
      <Route path="/signup" component={SignupContainer} />
    </div>
  </HashRouter>,
  document.getElementById('root')
);
