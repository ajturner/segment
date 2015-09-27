(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _portal = require('./portal');

var _portal2 = _interopRequireDefault(_portal);

var _service = require('./service');

var _service2 = _interopRequireDefault(_service);

var _layer = require('./layer');

var _layer2 = _interopRequireDefault(_layer);

module.exports = {
    Layer: _layer2['default'],
    Service: _service2['default'],
    Portal: _portal2['default']
};

},{"./layer":3,"./portal":4,"./service":5}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _arcgis = require('./arcgis');

var _user = require('./user');

var _user2 = _interopRequireDefault(_user);

var VERSION = '0.1.0';
exports.VERSION = VERSION;

var fields = [{ "name": "ObjectID",
  "type": "esriFieldTypeInteger",
  "alias": "ObjectID",
  "sqlType": "sqlTypeInteger",
  "nullable": false,
  "editable": false,
  "domain": null,
  "defaultValue": null
}, { "name": "Miles",
  "type": "esriFieldTypeInteger",
  "alias": "Miles"
}, { "name": "Efficiency",
  "type": "esriFieldTypeInteger",
  "alias": "Efficiency"
}, {
  "name": "Created",
  "type": "esriFieldTypeDate",
  "alias": "Created"
}];

function createLayer(_service) {
  return layer.create({ service: _service, definition: { name: "VersionLayer", fields: fields } });
}

function createService(_owner) {
  return service.create({ user: _owner, name: 'VersionTest' + Math.floor(Math.random(1000) * 1000) });
};

function createReplica(_layer) {
  return _layer.createReplica();
}

function addFeatures() {
  var feature = {
    "attributes": {
      "Miles": Math.floor(Math.random() * 10000),
      "Efficiency": Math.floor(Math.random() * 80),
      "Created": new Date().toISOString()
    },
    "geometry": { "x": -118.15, "y": 33.80 }
  };
  var mods = {
    adds: JSON.stringify([feature]),
    updates: [],
    deletes: []
  };
  layer.applyEdits(mods);
  return false;
}

function syncLayer() {
  layer.sync().then(function (u) {
    addVersion(layer);
  });
  return false;
}

function addVersion(_layer) {
  var sourceVersion = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var logger = arguments.length <= 2 || arguments[2] === undefined ? "versions" : arguments[2];

  var newDiv = document.createElement("li");
  var mods = _layer.changeStatistics;

  var versionCompare = [];
  if (sourceVersion !== null) {
    versionCompare.push(sourceVersion);
  }
  versionCompare.push(_layer.currentVersion);
  newDiv.innerHTML = versionCompare.join(" -> ") + ' | ' + mods.adds + ' added | ' + mods.updates + ' updated | ' + mods.deletes + ' deleted';

  newDiv.dataset.version = _layer.currentVersion;
  newDiv.onclick = getVersion;

  var currentDiv = document.getElementById(logger);
  currentDiv.appendChild(newDiv);
}
function getVersion(request) {
  var logger = arguments.length <= 1 || arguments[1] === undefined ? "compare" : arguments[1];

  var version = request;
  if (request.target) {
    // an event
    version = event.target.dataset.version;
  }
  return layer.sync({ version: version }).then(function (u) {
    addVersion(layer, version, logger);
  });
}

function addControl(link) {
  var newDiv = document.createElement("li");
  var newLink = document.createElement("a");
  var linkText = document.createTextNode(link.text);
  newLink.appendChild(linkText);
  newLink.href = "#";
  newLink.id = link.id;
  newLink.onclick = link.onclick;
  newDiv.appendChild(newLink);
  var currentDiv = document.getElementById("controls");
  currentDiv.appendChild(newDiv);
}

function setStatus(msg) {
  var statusMsg = document.createTextNode(msg);
  document.getElementById("status").appendChild(statusMsg);
}

function controlService() {
  username = document.getElementById('username').value;
  token = document.getElementById('token').value;

  user = new _user2['default']({ token: token, portal: portal });
  service = new _arcgis.Service({ token: token, portal: portal });
  layer = new _arcgis.Layer({ token: token, portal: portal });

  document.getElementById("createService").parentNode.remove();
  document.getElementById('versionQueryAction').onclick = function (event) {
    getVersion(document.getElementById('versionQuery').value, "compare");
    return false;
  };

  user.find(username).then(createService).then(createLayer).then(createReplica).then(function () {
    document.getElementById("service").innerHTML = '<a href="' + service.url + '" target="_new">Service</a>';
    document.getElementById("layers").innerHTML = '<a href="' + layer.url + '" target="_new">Layer</a>';;
  }).then(syncLayer).then(function () {
    setStatus("Layer Created");
  }).then(function () {
    var newLinks = [{ id: "addFeature", text: "Add Features", onclick: addFeatures }, { id: "getUpdates", text: "Get Updates", onclick: syncLayer }];
    for (var link in newLinks) {
      addControl(newLinks[link]);
    }
  });
}

var portal = "http://www.arcgis.com/sharing/rest";
var user, service, layer, token, username;
function initialize() {
  addControl({ id: "createService", text: "Create Service", onclick: controlService });
  setStatus("...");
}
// Not bothering with ES6 to body onload...
window.setTimeout(initialize, 1000);

},{"./arcgis":1,"./user":6}],3:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _portal = require('./portal');

var _portal2 = _interopRequireDefault(_portal);

var Layer = (function (_Portal) {
	_inherits(Layer, _Portal);

	function Layer(options) {
		_classCallCheck(this, Layer);

		_Portal.call(this, options);
		this.definition = {};
		// Override the defaults
		Object.assign(this.definition, options.definition ? options.definition : { layers: [] });
	}

	Layer.prototype.find = function find(options) {
		return this.get(options.url);
	};

	Layer.prototype.create = function create() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		if (options.service !== undefined) {
			this.service = options.service;
		}
		Object.assign(layers, this.defaultDefinition.layers[0], options.definition);
		this.definition.layers[0] = layers;
		var requestUrl = this.service.adminUrl + "/addToDefinition";
		var requestBody = { addToDefinition: JSON.stringify(this.definition) };

		return this.post(requestUrl, requestBody);
	};

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Sync_workflow_examples/02r3000000rw000000/
	// Create Replica	

	Layer.prototype.createReplica = function createReplica() {
		var requestBody = {
			"geometry": JSON.stringify({ "xmin": -179, "ymin": -80, "xmax": 179, "ymax": 80 }),
			"geometryType": "esriGeometryEnvelope",
			"inSR": 4326,
			"layers": this.index,
			"replicaName": "segment",
			"returnAttachments": true,
			"returnAttachmentsDataByUrl": true,
			"transportType": "esriTransportTypeEmbedded",
			"async": false,
			"syncModel": "perReplica",
			"dataFormat": "json",
			"f": "json" };
		var requestUrl = this.service.url + "/createReplica";
		return this.post(requestUrl, requestBody);
	};

	Layer.prototype.sync = function sync() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		var requestBody = {
			"replicaID": "{" + this.replicaID + "}",
			"replicaServerGen": options.version !== undefined ? options.version : this.replicaServerGen,
			"transportType": "esriTransportTypeEmbedded",
			"closeReplica": false,
			"returnIdsForAdds": false,
			"returnAttachmentsDataByUrl": true,
			"syncDirection": "download",
			"async": false,
			"dataFormat": "json",
			"f": "json"
		};
		var requestUrl = this.service.url + "/synchronizeReplica";
		return this.post(requestUrl, requestBody);
	};

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/

	Layer.prototype.applyEdits = function applyEdits(options) {
		var requestBody = options;
		var requestUrl = this.url + "/applyEdits";
		return this.post(requestUrl, requestBody);
	};

	_createClass(Layer, [{
		key: "defaultDefinition",
		get: function get() {
			return {
				"layers": [{
					"name": "New Layer",
					"type": "Feature Layer",
					"displayField": "",
					"description": "",
					"copyrightText": "",
					"defaultVisibility": true,
					"relationships": [],
					"isDataVersioned": false,
					"supportsRollbackOnFailureParameter": true,
					"supportsAdvancedQueries": true,
					"geometryType": "esriGeometryPoint",
					"minScale": 0,
					"maxScale": 0,
					"extent": {
						"xmin": -179,
						"ymin": -80,
						"xmax": 179,
						"ymax": 80,
						"spatialReference": {
							"wkid": 4326
						}
					},
					"allowGeometryUpdates": true,
					"hasAttachments": false,
					"htmlPopupType": "esriServerHTMLPopupTypeNone",
					"hasM": false,
					"hasZ": false,
					"objectIdField": "ObjectID",
					"globalIdField": "",
					"typeIdField": "",
					"fields": [{
						"name": "ObjectID",
						"type": "esriFieldTypeInteger",
						"alias": "ObjectID",
						"sqlType": "sqlTypeInteger",
						"nullable": false,
						"editable": false,
						"domain": null,
						"defaultValue": null
					}],
					"maxRecordCount": 1000,
					"capabilities": "Query, Editing, Create, Update, Delete, Sync"
				}] };
		}
	}, {
		key: "index",
		get: function get() {
			return this.layers.length - 1;
		}
	}, {
		key: "url",
		get: function get() {
			return this.service.encodedServiceURL + "/" + this.index;
		}
	}, {
		key: "extent",
		get: function get() {
			return [-104, 35.6, -94.32, 41];
		}
	}, {
		key: "currentVersion",
		get: function get() {
			return this.replicaServerGen;
		}

		// Get the Changelog statistics
	}, {
		key: "changeStatistics",
		get: function get() {
			var changes = this.edits.length;
			var mods = { adds: 0, updates: 0, deletes: 0 };
			for (var rev in this.edits) {
				mods.adds += this.edits[rev].features.adds.length;
				mods.updates += this.edits[rev].features.updates.length;
				mods.deletes += this.edits[rev].features.deleteIds.length;
			}
			return mods;
		}
	}]);

	return Layer;
})(_portal2["default"]);

exports["default"] = Layer;
module.exports = exports["default"];

},{"./portal":4}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Portal = (function () {
	function Portal(options) {
		_classCallCheck(this, Portal);

		this.arcgis = options.portal !== undefined ? options.portal : 'https://www.arcgis.com/sharing/rest';
		this.token = options.token;
	}

	Portal.serialize = function serialize(obj) {
		var str = [];
		for (var p in obj) if (obj.hasOwnProperty(p)) {
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
		}
		return str.join("&");
	};

	Portal.prototype.get = function get(requestUrl) {
		var requestParams = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		var self = this;
		return fetch(requestUrl + "?f=json&token=" + self.token + "&" + Portal.serialize(requestParams), {
			method: 'get',
			headers: {}
		}).then(function (response) {
			return response.json();
		}).then(function (body) {
			Object.assign(self, body);
			return new Promise(function (resolve, reject) {
				resolve(self);
			});
		})["catch"](function (error) {
			console.log('request failed', error);
		});
	};

	Portal.prototype.post = function post(requestUrl, requestBody) {
		var self = this;
		return fetch(requestUrl + "?f=json&token=" + self.token, {
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			},
			body: Portal.serialize(requestBody)
		}).then(function (response) {
			return response.json();
		}).then(function (body) {
			Object.assign(self, body);
			return new Promise(function (resolve, reject) {
				resolve(self);
			});
		})["catch"](function (error) {
			console.log('request failed', error);
		});
	};

	return Portal;
})();

exports["default"] = Portal;
module.exports = exports["default"];

},{}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _portal = require('./portal');

var _portal2 = _interopRequireDefault(_portal);

var _layer = require('./layer');

var _layer2 = _interopRequireDefault(_layer);

var Service = (function (_Portal) {
	_inherits(Service, _Portal);

	function Service(options) {
		_classCallCheck(this, Service);

		_Portal.call(this, options);
		this.definition = {
			"name": "",
			"serviceDescription": "",
			"hasStaticData": false,
			"maxRecordCount": 1000,
			"supportedQueryFormats": "JSON",
			"capabilities": "Create,Delete,Query,Update,Editing,Sync",
			"description": "",
			"copyrightText": "",
			"spatialReference": {
				"wkid": 102100
			},
			"initialExtent": {
				"xmin": -179,
				"ymin": -80,
				"xmax": 179,
				"ymax": 80,
				"spatialReference": { "wkid": 4326 } },
			"allowGeometryUpdates": true,
			"units": "esriMeters",
			"xssPreventionInfo": {
				"xssPreventionEnabled": true,
				"xssPreventionRule": "InputOnly",
				"xssInputRule": "rejectInvalid"
			}
		};
	}

	Service.prototype.create = function create() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		this.user = options.user; // TODO: add error handling if user is not valid.
		this.definition.name = options.name ? options.name : 'EmptyServiceName' + Math.random(1000); // sorry! @ajturner

		var requestUrl = this.arcgis + '/content/users/' + this.user.username + '/createService';
		var requestBody = {
			createParameters: JSON.stringify(this.definition),
			outputType: 'featureService'
		};
		return this.post(requestUrl, requestBody);
	};

	_createClass(Service, [{
		key: 'url',
		get: function get() {
			return this.encodedServiceURL;
		}
	}, {
		key: 'adminUrl',
		get: function get() {
			return this.url.replace("rest/services", "rest/admin/services");
		}
	}]);

	return Service;
})(_portal2['default']);

exports['default'] = Service;
module.exports = exports['default'];

},{"./layer":3,"./portal":4}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _portal = require('./portal');

var _portal2 = _interopRequireDefault(_portal);

var User = (function (_Portal) {
	_inherits(User, _Portal);

	function User(options) {
		_classCallCheck(this, User);

		_Portal.call(this, options);
		this.tags = [];
	}

	User.prototype.find = function find(username, cb) {
		this.username = username;
		var requestUrl = this.arcgis + '/community/users/' + this.username;
		return this.get(requestUrl);
	};

	User.prototype.update = function update(tags) {
		var requestUrl = this.arcgis + '/community/users/' + username + '/update';
		var requestBody = { tags: tags };
		return this.post(requestUrl, requestBody);
	};

	return User;
})(_portal2['default']);

exports['default'] = User;
module.exports = exports['default'];

},{"./portal":4}]},{},[2]);
