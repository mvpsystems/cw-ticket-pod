/**
 * ConnectWise Hosted API Client — v1.0
 * Source: https://developer.connectwise.com/Hosted_APIs
 *
 * Include this file in your web application to enable communication
 * with ConnectWise PSA when your app is embedded as an iframe (pod or tab).
 *
 * Usage:
 *   var cwApi = new ConnectWiseHostedAPI('https://na.myconnectwise.net', {
 *     eventHandlers: [
 *       { event: 'onLoad',     callback: function(data) { ... } },
 *       { event: 'beforeSave', callback: function(data) { data.onSuccess(); } }
 *     ]
 *   });
 *
 *   cwApi.post({ request: 'getMemberAuthentication' }, function(auth) { ... });
 *   cwApi.post({ request: 'setDirty', args: { dirty: true } });
 *   cwApi.post({ request: 'openScreen', args: { newTab: true, screen: 'ticket', id: 123 } });
 *   cwApi.post({ request: 'refreshScreen', args: {} });
 */
ConnectWiseHostedAPI = (function () {

	var version = "1.0";

	var _debug;
	var _origin;
	var _frameID;

	var _callbacks = {};

	var connectWiseHostedAPIConstructor = function ConnectWiseHostedAPIConstructor(origin, handlers, debug) {

		if (false == (this instanceof ConnectWiseHostedAPI)) {
			return new ConnectWiseHostedAPI();
		}

		// Guard: must be running inside an iframe
		if (window === parent) {
			log("No parent to send messages to or receive messages from");
			return;
		}

		_self = this;
		_debug = debug;
		_origin = origin;

		registerHandlers(handlers);

		window.addEventListener('message', function (e) {
			messageReceiver(e);
		}, false);

		ready();
	};

	function registerHandlers(handlers) {
		if (handlers === null) return;
		validateHandlers(handlers);
		handlers.eventHandlers.forEach(function register(handler) {
			_callbacks[handler.event + ""] = handler.callback;
		});
	}

	function validateHandlers(handlers) {
		if (!handlers.eventHandlers) {
			throw new Error("invalid handler format — expected { eventHandlers: [...] }");
		}
	}

	function messageReceiver(e) {
		log("received message " + e.data);
		var json = JSON.parse(e.data);

		if (json.MessageFrameID) {
			log("setting frameID to " + json.MessageFrameID);
			_self._frameID = json.MessageFrameID;
			return;
		}

		if (json.response) {
			if (_callbacks[json.response] !== null) {
				_callbacks[json.response](json.data);
				_callbacks[json.response] = null;
			}
			return;
		}

		if (json.event && _callbacks[json.event]) {
			json.data.onSuccess = function () {
				_self._postMessage({ 'event': json.event, '_id': json._id, 'result': 'success' });
			};
			json.data.onFailure = function (data) {
				_self._postMessage({ 'event': json.event, '_id': json._id, 'result': 'failure', 'errors': data });
			};
			_callbacks[json.event](json.data);
		} else {
			_self._postMessage({ 'event': json.event, '_id': json._id, 'result': 'success' });
		}
	}

	function ready() {
		_self._postMessage({ 'message': 'ready' });
	}

	connectWiseHostedAPIConstructor.prototype.post = function (message, callback) {
		if (typeof callback !== "undefined") {
			_callbacks[message.request.toLowerCase() + ""] = callback;
		}
		// Prefix request to avoid collision with Vendor Hosted API
		message.hosted_request = message.request;
		delete message.request;
		_self._postMessage(message);
	};

	connectWiseHostedAPIConstructor.prototype._postMessage = function (message) {
		if (this._frameID != null) {
			message['frameID'] = this._frameID;
		}
		log("posting message " + JSON.stringify(message));
		parent.postMessage(JSON.stringify(message), _origin);
	};

	function log(msg) {
		if (_debug == true) {
			console.log("ConnectWiseHostedAPI: " + msg);
		}
	}

	return connectWiseHostedAPIConstructor;
}());
