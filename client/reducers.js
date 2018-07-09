import { combineReducers } from 'redux'
import * as actionCreators from './actions'


const defaultLoginState = {
	loggedIn: false
}

function loginState(state = defaultLoginState, action) {
	switch (action.type) {
		case actionCreators.CONFIRM_SPOTIFY_LOGOUT:
			return Object.assign({}, state, {
				loggedIn: false
			});
		default:
			return state;
	}
}

const rootReducer = combineReducers({
	loginState
});

export default rootReducer