var querystring = require('querystring');
var fs = require('fs');
var request = require('request');
var rp = require('request-promise');
var async = require('async');

var SPOTIFY_API_BASE = 'api.spotify.com';
var SPOTIFY_SEARCH_ENDPOINT = '/v1/search';
var SPOTIFY_ME_ENDPOINT = 'v1/me';
var SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
var SPOTIFY_CREATE_PLAYLIST_URL = 'https://api.spotify.com/v1/users/{user_id}/playlists';
var SPOTIFY_PLAYLIST_URL = 'https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}';
var SPOTIFY_PLAYLIST_TRACKS_URL = 'https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks';
var SPOTIFY_ARTISTS_URL = 'https://api.spotify.com/v1/artists';
var SPOTIFY_AUDIO_FEATURES_URL = 'https://api.spotify.com/v1/audio-features';
var SPOTIFY_PLAYBACK_URL = 'https://api.spotify.com/v1/me/player';
var SPOTIFY_ADD_SONG_TO_PLAYLIST_URL = 'https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks';

var ARTIST_TYPE = "artist";
var TRACK_TYPE = "track";
var ALBUM_TYPE = "album";

var SPOTIFY_ACCOUNTS_BASE = 'accounts.spotify.com';
var SPOTIFY_TOKEN_PATH = '/api/token';
var SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

let getAuthRedirectURI = () => `${process.env.HOST_DOMAIN}loggedIn`;

var TRACK_FEATURES = [
	{
		name: "acousticness",
		percentage: true
	},
	{
		name: "danceability",
		percentage: true
	},
	{
		name: "energy",
		percentage: true
	},
	{
		name: "instrumentalness",
		percentage: true
	},
	{
		name: "liveness",
		percentage: true
	},
	{
		name: "mode",
		percentage: true
	},
	{
		name: "speechiness",
		percentage: true
	},
	{
		name: "tempo",
		percentage: false
	},
	{
		name: "valence",
		percentage: true
	}];

const Spotify = {
	
	getUserDetails: (authToken, callback) => {
	console.log("Spotify.getUserDetails: getting user details with authToken " + authToken);

	request({
		url: SPOTIFY_ME_URL,
		headers: {
			'Authorization': 'Bearer ' + authToken
		}},
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				callback(JSON.parse(body));
			}
			else {
				callback(null);
			}
		});
	},

	getToken: (authCode, state, callback) => {
		console.log("Spotify.getToken: requesting access token");

		request({
			uri: SPOTIFY_TOKEN_URL,
			method: "POST",
			haders: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				grant_type: "authorization_code",
				code: authCode,
				redirect_uri: getAuthRedirectURI(),
				client_id: process.env.MM_SPOTIFY_CLIENT_ID,
				client_secret: process.env.MM_SPOTIFY_SECRET
			}
		},
			function(error, response, body) {
				if (!error) {
					var results = JSON.parse(body);
					var expirationTime = new Date();
					if(results.access_token) {
			  			console.log("access_token is " + results.access_token);
			  		}
			  		if(results.refresh_token) {
			  			console.log("refresh_token is " + results.refresh_token);
			  		}
			  		if(results.expires_in) {
			  			expirationTime = new Date().getTime() + (results.expires_in * 1000);
			  			console.log("expires at " + expirationTime);
			  		}

			  		callback(true, results.access_token, results.refresh_token, expirationTime);
				}
				else {
					callback(null);
				}
			});
	},

	searchByType: (query, searchType, authToken, callback) => {
		console.log(`searchByType: looking for ${searchType} objects named ${query}`);
		var requestType = '';
		switch (searchType) {
			case 'artist': 
				requestType = ARTIST_TYPE;
				break;
			case 'track':
				requestType = TRACK_TYPE;
				break;
			case 'album':
				requestType = ALBUM_TYPE;
				break;
			default:
				requestType = ARTIST_TYPE;
				break;
		}
		
		var queryParameters = querystring.stringify({q: query, type: requestType});
		var queryPath = 'https://' + SPOTIFY_API_BASE + SPOTIFY_SEARCH_ENDPOINT + '?' + queryParameters;
		console.log("initiating request to " + queryPath);

		request({
			url: queryPath,
			headers: {
				'Authorization': 'Bearer ' + authToken
			}},
			function(error, response, body) {
				if (!error) {
					console.log("searchByType: request to spotify api succeeded");
					
					var bodyJSON = JSON.parse(body);
					var resultSet = {};
					var returnList = [];
					switch (requestType) {
						case ARTIST_TYPE:
							resultSet = bodyJSON.artists;
							break;
						case TRACK_TYPE:
							resultSet = bodyJSON.tracks;
							break;
						case ALBUM_TYPE:
							resultSet = bodyJSON.albums;
							break;
						default:
							resultSet = bodyJSON.tracks;
							break;
					}

					if(resultSet) {
						console.log("parsing through resultSet: " + resultSet.toString())
						returnList = resultSet.items;
					}

					console.log("searchByType: sending data back to callback");
					callback(returnList);
				}
				else {
					console.log("searchByType: request failed");
					callback(null);
				}
			}
		);
	},

	getUserPlaylists: (userId, authToken, callback) => {
		const playlistUrl = SPOTIFY_PLAYLIST_URL.replace('{user_id}', userId).replace('{playlist_id}', '');

		rp({
			uri: playlistUrl,
			headers: {
				'Authorization': 'Bearer ' + authToken
			},
			qs: {
				limit: 50
			},
			json: true
		}).then( (playlistsResponse) => {
			const returnList = playlistsResponse.items
				.filter( (playlist) => playlist.owner.id === userId )
				.map( (playlistItem) => ({
					id: playlistItem.id,
					name: playlistItem.name,
					numTracks: playlistItem.tracks.total
				}));
			callback({
				results: returnList,
				status: 200
			});
		}).catch(error => ({results: null, status: 500}));
	},

	getPlaylistAudioFeatures: (userId, playlistId, authToken, callback) => {
		//get the list of user playlists to find the url for the playlist
		var playlistUrl = SPOTIFY_PLAYLIST_URL.replace('{user_id}', userId).replace('{playlist_id}', '');
		
		rp({
			uri: playlistUrl,
			headers: {
				'Authorization': 'Bearer ' + authToken
			}
		}).then(response => {
			var responseJSON = JSON.parse(response);
			var thePlaylist = responseJSON.items.find( playlistObject => playlistObject.id === playlistId);
			var playlistTracksUrl = thePlaylist.tracks.href;

			//first: get the number of items, and the limit for each transaction
			rp({
				uri: playlistTracksUrl,
				qs: {
					fields: "total,limit"
				},
				headers: {
					'Authorization': 'Bearer ' + authToken
				}
			}).then( response => {
				var responseJSON = JSON.parse(response);
				var limit = responseJSON.limit;
				var total = responseJSON.total;
				
				//find out how many tracks we have and set up urls to fetch them in chunks
				var trackURLs = [];
				for (let i = 0; i < total; i+=limit) {
					var queryParameters = querystring.stringify({limit: limit, offset: i});
					var trackPath = playlistTracksUrl + '?' + queryParameters;
					trackURLs.push(trackPath);
				}

				//now that we know how many tracks we have and the urls to get those tracks let's get them!
				var trackIds = [];
				async.concat(trackURLs, function (trackURL, asyncCallback) {
					rp({
						uri: trackURL,
						headers: {
							'Authorization': 'Bearer ' + authToken
						}
					}).then( response => {
						//we've received our result. Let's now build id lists to send off to audio features endpoint
						var trackObjects = JSON.parse(response);
						var idString = trackObjects.items.reduce( (acc, cur) => acc += cur.track.id + ',', '').slice(0, -1);
						rp({
							uri: SPOTIFY_AUDIO_FEATURES_URL,
							qs: {
								ids: idString
							},
							headers: {
								'Authorization': 'Bearer ' + authToken
							}
						}).then( response => {
							var audioFeatures = JSON.parse(response).audio_features;
							asyncCallback(null, audioFeatures);
						}).catch (reason => {
							callback({status: reason.statusCode, results: {"error":"getting audio features failed"}});	
						})
					}).catch(reason => {
						callback({status: reason.statusCode, results: {"error":"getting track list failed"}});
					});
				}, function(err, result) {
				 	if(!err) {
				 		//async has completed. reduce the features down into a single average.
				 		console.log('async finished. Averaging features');
				 		
				 		//average all of the feature values together
				 		var reducedFeatures = result.reduce( (acc, cur) => {
				 			TRACK_FEATURES.forEach( featureType => {
				 				acc[featureType.name] += cur[featureType.name];
				 			});
				 			return acc;
				 		});
				 		//format the results based on type
				 		var averageFeatures = TRACK_FEATURES.map( featureType => {
				 			return {
				 				name: featureType.name,
				 				percentage: featureType.percentage,
				 				value: featureType.percentage ? 
				 						(reducedFeatures[featureType.name] / total * 100).toFixed(1) :
				 						(reducedFeatures[featureType.name] / total).toFixed(1)
				 			};
				 		});
				 		
				 		//send back to server
				 		callback({status: 200, results: {
				 			playlistName: thePlaylist.name,
				 			features: averageFeatures
				 		}});
				 	}
				 	else {
				 		callback({status: 500, results: {"error":"something happened during async fetch of features"}});;
				 	}
				 });
			}).catch(reason => {
				callback({status: reason.statusCode, results: {"error":"getting the playlist details failed"}})
			});
		}).catch(reason => {
			callback({status: reason.statusCode, results: {"error":"couldn't get the list of user playlists"}})
		});
	},

	getPlaylistGenres: (userId, playlistId, authToken, callback) => {
		//get the list of user playlists
		var playlistUrl = SPOTIFY_PLAYLIST_URL.replace('{user_id}', userId).replace('{playlist_id}', '');

		rp({
			uri: playlistUrl,
			headers: {
				'Authorization': 'Bearer ' + authToken
			}
		}).then(response => {
			var responseJSON = JSON.parse(response);
			var thePlaylist = responseJSON.items.find( playlistObject => playlistObject.id === playlistId);
			rp({
				uri: thePlaylist.tracks.href,
				headers: {
					'Authorization': 'Bearer ' + authToken
				}
			}).then( response => {

				/*******
					GET THE GENRES
				********/
				var trackList = JSON.parse(response);
				var flattenedArtistIds = [];
				trackList.items.forEach( function (singleTrack) {
					singleTrack.track.artists.forEach( function (singleArtist) {
						flattenedArtistIds.push(singleArtist.id);
					});
				});

				//get each of the ids in groups of 50
				var fiftyArtistChunks = [];
				for(var i = 0; i<flattenedArtistIds.length; i+=50) {
					fiftyArtistChunks.push(flattenedArtistIds.slice(i, i+50));
				}

				//make requests to spotify to get artist details
				async.concat(fiftyArtistChunks, function (artistChunk, asyncCallback) {
					//form query string using artist ids
					var idString = artistChunk.reduce( (acc, cur) => acc += cur + ',', '').slice(0, -1);
					rp({
						uri:SPOTIFY_ARTISTS_URL,
						qs: {
							'ids': idString
						},
						headers: {
							'Authorization': 'Bearer ' + authToken
						}
					}).then( response => {
						var artistObjects = JSON.parse(response);
						var accumulatedGenres = [];

						//pull out the individual genres from each of the (up to 50) artists.
						//return an array of genre+artist objects for accumulating
						artistObjects.artists.forEach( function(singleArtistObject) {
							singleArtistObject.genres.forEach( function(singleGenre) {
								accumulatedGenres.push({
									genre: singleGenre, 
									artistDetails: {
										artistId: singleArtistObject.id, 
										artistName: singleArtistObject.name	
									}								
								});
							});
						});
						asyncCallback(null, accumulatedGenres);
					})
				}, function(err, result) {
				 	if(!err) {
				 		//async has completed. dedup genre entries and accumulate artists, send back result
				 		console.log('async finished');
				 		var responseArray = [];
				 		result.forEach(function (genreEntry) {
				 			var existsIndex = responseArray.findIndex( (element) => element.genre === genreEntry.genre);
				 			if(existsIndex !== -1) {
				 				responseArray[existsIndex].artistDetails.push(genreEntry.artistDetails);
				 			}
				 			else {
				 				responseArray.push( {
				 					genre: genreEntry.genre,
				 					artistDetails: [genreEntry.artistDetails]
				 				});
				 			}
				 		});
				 		responseArray.sort( (a, b) => b.artistDetails.length - a.artistDetails.length);
				 		callback({status: 200, results: {
				 			playlistName: thePlaylist.name,
				 			items: responseArray,
				 			totalArtists: flattenedArtistIds.length
				 		}});
				 	}
				 	else {
				 		callback({status: 500, results: {"error":"something happened while mapping artists and genres"}});;
				 	}
				})
			}).catch(reason => {
				callback({status: reason.statusCode, results: {"error":"getting the tracks failed"}})
			});
		}).catch(reason => {
			callback({status: reason.statusCode, results: {"error":"getting the playlist failed"}})
		});	
	},

	getPlaybackDetails: (authToken) => {
		return rp({
			uri: SPOTIFY_PLAYBACK_URL,
			headers: {
				'Authorization': 'Bearer ' + authToken
			}
		}).then(response => JSON.parse(response));
	},

	getPlaylistDetails: (userId, playlistId, authToken) => {
		let playlistUrl = SPOTIFY_PLAYLIST_URL.replace('{user_id}', userId).replace('{playlist_id}', '');
		let playlistObject = undefined;
		let playlistTracks = undefined;

		return rp({
			uri: playlistUrl,
			headers: {
				'Authorization': 'Bearer ' + authToken
			}
		}).then(response => {
			let responseJSON = JSON.parse(response);
			playlistObject = responseJSON.items.find( playlistObject => playlistObject.id === playlistId);

			return rp({
				uri: playlistObject.tracks.href,
				headers: {
					'Authorization': 'Bearer ' + authToken
				}
			});
		}).then(response => {
			let responseJSON = JSON.parse(response);
			playlistTracks =  responseJSON;
			return ({
				playlist: playlistObject,
				tracks: playlistTracks
			});
		});
	},

	getOnePlaylist: (userId, playlistId, authToken) => {
		let playlistUrl = SPOTIFY_PLAYLIST_URL.replace('{user_id}', userId).replace('{playlist_id}', '');

		return rp({
			uri: playlistUrl,
			headers: {
				'Authorization': 'Bearer ' + authToken
			},
			json: true
		});
	},

	createNewPlaylist: (userId, authToken, playlistName, description) => {
		let createUrl = SPOTIFY_CREATE_PLAYLIST_URL.replace('{user_id}', userId);

		return rp({
			method: 'POST',
			uri: createUrl,
			body: {
				name: playlistName,
				description: description
			},
			headers: {
				'Authorization': 'Bearer ' + authToken
			},
			json: true
		});
	},

	getGenericSpotifyUrl: (url, authToken) => {
		return rp({
			uri: url,
			headers: {
				'Authorization': 'Bearer ' + authToken
			},
			json: true
		});
	},

//'https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks';
	addSongToPlaylist: (userId, authToken, playlistId, songURI) => {
		let addURL = SPOTIFY_ADD_SONG_TO_PLAYLIST_URL.replace('{user_id}', userId)
			.replace('{playlist_id}', playlistId);

		return rp({
			method: 'POST',
			uri: addURL,
			body: {
				uris: [songURI]
			},
			headers: {
				'Authorization': 'Bearer ' + authToken
			},
			json: true
		});
	}
}

export default Spotify;
