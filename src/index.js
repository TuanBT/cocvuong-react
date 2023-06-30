import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import '../src/assets/css/style.css';
import { BrowserRouter, Route } from 'react-router-dom'
import HomeContainer from './containers/home.container';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import ChamDiemDkContainer from './containers/chamDiemDk.container';
import ChamDiemHdContainer from './containers/chamDiemHd.container';
import GiamDinhHdContainer from './containers/giamDinhHd.container';
import GiamDinhDkContainer from './containers/giamDinhDk.container';
import SettingContainer from './containers/setting.container';
import LoginContainer from './containers/login.container';
import SignupContainer from './containers/signup.container';

ReactDOM.render(
  <BrowserRouter>
    <div>
      <Route path="/" exact component={HomeContainer} />
      <Route path="/test" component={TestContainer} />
      <Route path="/info-dk" component={InformationDkContainer} />
      <Route path="/cham-diem-dk" component={ChamDiemDkContainer} />
      <Route path="/cham-diem-hd" component={ChamDiemHdContainer} />
      <Route path="/giam-dinh-hd" component={GiamDinhHdContainer} />
      <Route path="/giam-dinh-dk" component={GiamDinhDkContainer} />
      <Route path="/setting" component={SettingContainer} />
      <Route path="/login" component={LoginContainer} />
      <Route path="/signup" component={SignupContainer} />
    </div>
  </BrowserRouter>,
  document.getElementById('root')
);
