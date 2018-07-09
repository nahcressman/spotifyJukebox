import express from 'express';
import sessions from 'client-sessions';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import SpotifyJukeboxApp from '../client/components/SpotifyJukeboxApp';
import Spotify from './lib/spotify';
import { StaticRouter } from 'react-router';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import RootReducer from '../client/reducers';

import expressWs from 'express-ws';

import dotenv from 'dotenv';
dotenv.config();

var app = express();
expressWs(app);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const logRequest = (req) => {
	console.log('received request: ');
	console.log(JSON.stringify({
		headers: req.headers,
		originalUrl: req.originalUrl
	}));
}

app.use(sessions({
	cookieName: 'spotifyJukebox', // cookie name dictates the key name added to the request object 
	secret: process.env.MM_SESSION_SECRET, // should be a large unguessable string 
	duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms. 24 hours
}));

app.use(function(req,res,next) {
	if(req.spotifyJukebox &&
		req.spotifyJukebox.userDetails &&
		req.spotifyJukebox.expirationTime) {
		console.log("User has a previous session stored. id: " + req.spotifyJukebox.userDetails.id);
		var now = new Date();
		if(req.spotifyJukebox.expirationTime < now.getTime()) {
			console.log("auth token expired, resetting session")
			req.spotifyJukebox.reset();
		}
	}
	
	next();
});

app.use(express.static('dist'));


let buildReduxState = (req) => {
	return ({
		loginState: {
			loggedIn: req.spotifyJukebox && 
				typeof req.spotifyJukebox.auth_token !== 'undefined'
		}
	});
}

app.get('/*', (req, res) => {
	const context = {};

	const store = createStore(RootReducer, buildReduxState(req));
	const markup = renderToString(
		<Provider store={store}>
			<StaticRouter location={req.url} context={context}>
				<SpotifyJukeboxApp />
			</StaticRouter>
		</Provider>
	);
	const finalState = store.getState();
	return res.render('index.ejs', { 
		reactOutput: markup,
		reduxState: JSON.stringify(finalState)
	});
});

let listenPort = process.env.PORT || '3000';

app.listen(listenPort, function() {
	console.log(`running on port ${listenPort}`);
});