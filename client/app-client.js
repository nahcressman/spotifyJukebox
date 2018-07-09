// src/app-client.js
import React from 'react';
import ReactDOM from 'react-dom';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware} from 'redux';
import { Provider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { BrowserRouter } from 'react-router-dom';
import RootReducer from './reducers';
import SpotifyJukeboxApp from './components/SpotifyJukeboxApp';

const loggerMiddleware = createLogger();
const initialReduxState = typeof(window) !== 'undefined' ? JSON.parse(window.__REDUX_STATE__) : {};

const rootStore = createStore(
	RootReducer,
	initialReduxState,
	composeWithDevTools(
		applyMiddleware(
			thunkMiddleware,
			loggerMiddleware
		)
	)
);

window.onload = () => {
  ReactDOM.render((
  	<Provider store={rootStore}>
  		<BrowserRouter>
  			<SpotifyJukeboxApp />
		</BrowserRouter>
	</Provider>
  ), document.getElementById('main'));
};
