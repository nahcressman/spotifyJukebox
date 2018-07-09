import rp from 'request-promise';

export const BEGIN_SPOTIFY_LOGOUT = 'BEGIN_SPOTIFY_LOGOUT';
export const CONFIRM_SPOTIFY_LOGOUT = 'CONFIRM_SPOTIFY_LOGOUT';

export function beginSpotifyLogout() {
	return {
		type: BEGIN_SPOTIFY_LOGOUT
	}
}

export function confirmSpotifyLogout() {
	return {
		type: CONFIRM_SPOTIFY_LOGOUT
	};
}

export function doSpotifyLogout() {
	return function(dispatch) {
		dispatch(beginSpotifyLogout());

		rp({
			uri: HOST_DOMAIN + 'api/logout'
		}).then(response => {
			dispatch(confirmSpotifyLogout());
		})
	}
}
