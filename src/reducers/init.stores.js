import { createStore, applyMiddleware } from 'redux';
import createHistory from 'history/createBrowserHistory';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import { routerMiddleware } from 'react-router-redux';

export const history = createHistory();
const routingMiddleware = routerMiddleware(history);
const logger = createLogger();

export const store = createStore(applyMiddleware(routingMiddleware, thunk, logger));
