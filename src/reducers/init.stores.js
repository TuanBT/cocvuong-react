import { createStore, applyMiddleware } from 'redux';
import { createBrowserHistory } from 'history'
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import { routerMiddleware } from 'react-router-redux';

export const history = createBrowserHistory();
const routingMiddleware = routerMiddleware(history);
const logger = createLogger();

export const store = createStore(applyMiddleware(routingMiddleware, thunk, logger));
