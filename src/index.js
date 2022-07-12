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
import SettingContainer from './containers/setting.container';
import Global from './containers/global';
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
          <Route path="/setting" component={SettingContainer}/>
          <Route path="/global" component={global}/>
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
