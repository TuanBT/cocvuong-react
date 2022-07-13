import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Route } from 'react-router-dom'
import { Provider } from 'react-redux';
import {store, history} from './reducers/init.stores';
import { ConnectedRouter } from 'react-router-redux';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import SettingContainer from './containers/setting.container';
import GiamDinhHdContainer from './containers/giamdinhHD.container';
import Global from './containers/global';
import { messaging } from './firebase';

ReactDOM.render(
  <Provider store={store}>
      <ConnectedRouter history={history}>
        <div>
          <Route path="/" exact component={TestContainer}/>
          <Route path="/test" component={TestContainer}/>
          <Route path="/info-dk" component={InformationDkContainer}/>
          <Route path="/setting" component={SettingContainer}/>
          <Route path="/gd-hd" component={GiamDinhHdContainer}/>
          <Route path="/global" component={global}/>
        </div>
      </ConnectedRouter>
  </Provider>,
  document.getElementById('root')
);

// logging our messaging notification
messaging.onMessage(payload => {
  console.log(payload);
})
