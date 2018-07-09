// src/components/SpotifyJukeboxApp
import React, { Component } from 'react';
import {
	Route,
	Link
} from 'react-router-dom';
import HostView from './HostView';

class SpotifyJukeboxApp extends Component {

	render() {
		return (
			<div className="app-content">
				<header>
					<Link
						className="nav-link"
						to="/">
						Spotify Jukebox
					</Link>
				</header>
				<Route 
					exact
					path="/"
					render={() => (
						<div className="home-nav">
							<div className="nav-section">	
								<button className="nav-link-container">
									<Link 
										className="nav-link"
										to="/host">
										Host a jukebox
									</Link>
								</button>
							</div>
							<div className="nav-section">
								<button className="nav-link-container">
									<Link 
										className="nav-link"
										to="/join">
										Join an existing jukebox
									</Link>
								</button>
							</div>
						</div>
				)} />
				<Route 
					path="/host"
					component={HostView}
				/>
				<Route 
					path="/join"
					render={() => (
						<div> Here is a participant view </div>
				)} />
			</div>
		);
	}
}

export default SpotifyJukeboxApp;