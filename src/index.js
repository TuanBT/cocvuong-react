import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Route } from 'react-router-dom'
import { Provider } from 'react-redux';
import {store, history} from './reducers/init.stores';
import { ConnectedRouter } from 'react-router-redux';
import LoginContainer from './containers/login.container';
import FirebaseContainer from './containers/firebase.container';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import ChamDiemDkContainer from './containers/chamDiemDk.container';
import ChamDiemHdContainer from './containers/chamDiemHd.container';
import GiamDinhHdContainer from './containers/giamDinhHd.container';
import GiamDinhDkContainer from './containers/giamDinhDk.container';
import { messaging } from './firebase';

ReactDOM.render(
  <Provider store={store}>
      <ConnectedRouter history={history}>
        <div>
          <Route path="/" exact component={LoginContainer}/>
          <Route path="/fb" component={FirebaseContainer}/>
          <Route path="/test" component={TestContainer}/>
          <Route path="/info-dk" component={InformationDkContainer}/>
          <Route path="/cham-diem-dk" component={ChamDiemDkContainer}/>
          <Route path="/cham-diem-hd" component={ChamDiemHdContainer}/>
          <Route path="/giam-dinh-hd" component={GiamDinhHdContainer}/>
          <Route path="/giam-dinh-dk" component={GiamDinhDkContainer}/>
        </div>
      </ConnectedRouter>
  </Provider>,
  document.getElementById('root')
);

// logging our messaging notification
messaging.onMessage(payload => {
  console.log(payload);
})
