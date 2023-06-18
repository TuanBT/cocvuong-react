import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Route } from 'react-router-dom'
import { Provider } from 'react-redux';
import {store, history} from './reducers/init.stores';
import registerServiceWorker from './registerServiceWorker';
import { ConnectedRouter } from 'react-router-redux';
import LoginContainer from './containers/login.container';
import DashboardContainer from './containers/dashboard.container';
import FirebaseContainer from './containers/firebase.container';
import TestContainer from './containers/test.container';
import InformationDkContainer from './containers/infomationDK.container';
import ChamDiemDkContainer from './containers/chamDiemDk.container';
import ChamDiemHdContainer from './containers/chamDiemHd.container';
import GiamDinhHdContainer from './containers/giamDinhDk.container';
import GiamDinhDkContainer from './containers/giamDinhHd.container';
import { addLocaleData, IntlProvider } from 'react-intl';
import en from 'react-intl/locale-data/en';
import es from 'react-intl/locale-data/es';
// Our translated strings
import localeData from './translation/translation.json';
import { messaging } from './firebase';

addLocaleData([...en, ...es]);

// Try full locale, try locale without region code, fallback to 'en'
const messages = localeData.en;
const language = 'en';

ReactDOM.render(
  <Provider store={store}>
    <IntlProvider locale={language} messages={messages}>
      <ConnectedRouter history={history}>
        <div>
          <Route path="/" exact component={LoginContainer}/>
          <Route path="/dashboard" component={DashboardContainer}/>
          <Route path="/fb" component={FirebaseContainer}/>
          <Route path="/test" component={TestContainer}/>
          <Route path="/info-dk" component={InformationDkContainer}/>
          <Route path="/cham-diem-dk" component={ChamDiemDkContainer}/>
          <Route path="/cham-diem-hd" component={ChamDiemHdContainer}/>
          <Route path="/giam-dinh-hd" component={GiamDinhHdContainer}/>
          <Route path="/giam-dinh-dk" component={GiamDinhDkContainer}/>
        </div>
      </ConnectedRouter>
    </IntlProvider>
  </Provider>,
  document.getElementById('root')
);
registerServiceWorker();

// logging our messaging notification
messaging.onMessage(payload => {
  console.log(payload);
})
