(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":2}],2:[function(require,module,exports){
(function() {
  'use strict';

  if (self.fetch) {
    return
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = name.toString();
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = value.toString();
    }
    return value
  }

  function Headers(headers) {
    this.map = {}

    var self = this
    if (headers instanceof Headers) {
      headers.forEach(function(name, values) {
        values.forEach(function(value) {
          self.append(name, value)
        })
      })

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        self.append(name, headers[name])
      })
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  // Instead of iterable for now.
  Headers.prototype.forEach = function(callback) {
    var self = this
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      callback(name, self.map[name])
    })
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  var support = {
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob();
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self
  }

  function Body() {
    this.bodyUsed = false


    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (!body) {
        this._bodyText = ''
      } else {
        throw new Error('unsupported BodyInit type')
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(url, options) {
    options = options || {}
    this.url = url

    this.credentials = options.credentials || 'omit'
    this.headers = new Headers(options.headers)
    this.method = normalizeMethod(options.method || 'GET')
    this.mode = options.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && options.body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(options.body)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = xhr.getAllResponseHeaders().trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this._initBody(bodyInit)
    this.type = 'default'
    this.url = null
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
  }

  Body.call(Response.prototype)

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function(input, init) {
    // TODO: Request constructor should accept input, init
    var request
    if (Request.prototype.isPrototypeOf(input) && !init) {
      request = input
    } else {
      request = new Request(input, init)
    }

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return;
      }

      xhr.onload = function() {
        var status = (xhr.status === 1223) ? 204 : xhr.status
        if (status < 100 || status > 599) {
          reject(new TypeError('Network request failed'))
          return
        }
        var options = {
          status: status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(name, values) {
        values.forEach(function(value) {
          xhr.setRequestHeader(name, value)
        })
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})();

},{}],3:[function(require,module,exports){
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

},{"./layer":5,"./portal":6,"./service":7}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _arcgis = require('./arcgis');

var _user = require('./user');

var _user2 = _interopRequireDefault(_user);

// module.exports = {
//   User: User,
//   Portal: Portal,
//   Service: Service,
//   Layer: Layer
// }
var VERSION = '0.1.0';
exports.VERSION = VERSION;
var fields = [{ "name": "ObjectID",
  "type": "esriFieldTypeOID",
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
  // console.log("Create Layer - Service:", _service);
  return layer.create({ service: _service, definition: { name: "VersionLayer", fields: fields } });
}

function createService(_owner) {
  return service.create({ user: _owner, name: 'VersionTest' + Math.floor(Math.random(1000) * 1000) });
};

function createReplica(_layer) {
  return _layer.createReplica();
}

// For demo purposes.
function addFeaturesSync() {
  return addFeatures(true);
};
function addFeatures() {
  var sync = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

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
  layer.applyEdits(mods).then(function () {
    if (sync == true) {
      syncLayer();
    }
  });
  return false;
}

function syncLayer() {
  service.sync().then(function (u) {
    // console.log("syncLayer", u)
    showVersion(layer);
  });
  return false;
}

function showVersion(_layer) {
  var sourceVersion = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var logger = arguments.length <= 2 || arguments[2] === undefined ? "versions" : arguments[2];

  var newDiv = document.createElement("li");
  var mods = _layer.changeStatistics;

  var versionCompare = [];
  if (sourceVersion !== null) {
    versionCompare.push(sourceVersion);
  }
  versionCompare.push(_layer.version);
  newDiv.innerHTML = versionCompare.join(" -> ") + ' | ' + mods.adds + ' added | ' + mods.updates + ' updated | ' + mods.deletes + ' deleted';

  newDiv.dataset.version = _layer.version;
  newDiv.onclick = getVersion;

  var currentDiv = document.getElementById(logger);
  currentDiv.insertBefore(newDiv, currentDiv.firstChild);
}
function getVersion(request) {
  var logger = arguments.length <= 1 || arguments[1] === undefined ? "compare" : arguments[1];

  var version = request;
  if (request.target) {
    // an event
    version = event.target.dataset.version;
  }
  return layer.sync({ version: version }).then(function (u) {
    showVersion(layer, version, logger);
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
    var newLinks = [{ id: "addFeature", text: "Add Features (Sync Update)", onclick: addFeaturesSync }, { id: "addFeature", text: "Add Features", onclick: addFeatures }, { id: "getUpdates", text: "Get Updates", onclick: syncLayer }];
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

},{"./arcgis":3,"./user":8}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _portal = require('./portal');

var _portal2 = _interopRequireDefault(_portal);

var _service = require('./service');

var _service2 = _interopRequireDefault(_service);

var Layer = (function (_Portal) {
	_inherits(Layer, _Portal);

	function Layer() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		_classCallCheck(this, Layer);

		_Portal.call(this, options);
		this.definition = {};
		// Override the defaults
		Object.assign(this.definition, options.definition ? options.definition : { layers: [] });
	}

	// This can probably be less cally

	Layer.prototype.find = function find(options) {
		var self = this;
		this.encodedLayerURL = options.url;
		return this.get(options.url).then(this.fetchService);
	};

	// Are Replicas returned per layer index?

	// If we Layer.find() then we need to get the service metadata

	Layer.prototype.fetchService = function fetchService(_layer) {
		var self = _layer;
		var service = new _service2['default']({ portal: self.portal, token: self.token });
		return service.fetch(self.serviceUrl).then(function (s) {
			self.service = s;
			return new Promise(function (resolve, reject) {
				resolve(self);
			});
		});
	};

	Layer.prototype.create = function create() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		if (options.service !== undefined) {
			this.service = options.service;
		}
		var layers = {};
		Object.assign(layers, this.defaultDefinition.layers[0], options.definition);
		Object.assign(this, layers);
		this.definition.layers[0] = layers;
		var requestUrl = this.service.adminUrl + '/addToDefinition';
		var requestBody = { addToDefinition: JSON.stringify(this.definition) };

		return this.post(requestUrl, requestBody);
	};

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Sync_workflow_examples/02r3000000rw000000/
	// Create Replica	

	Layer.prototype.createReplica = function createReplica() {
		var self = this;
		// we get back a Service and need to return back this layer
		return this.service.createReplica(this.index).then(function (u) {
			return new Promise(function (resolve, reject) {
				return resolve(self);
			});
		});
	};

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/

	Layer.prototype.applyEdits = function applyEdits(options) {
		var requestBody = options;
		var requestUrl = this.url + "/applyEdits";
		return this.post(requestUrl, requestBody);
	};

	// Proxy to Service#sync

	Layer.prototype.sync = function sync() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		return this.service.sync(options);
	};

	_createClass(Layer, [{
		key: 'edits',
		get: function get() {
			return this.service.edits[this.index];
		}
	}, {
		key: 'serviceUrl',
		get: function get() {
			return this.encodedLayerURL.replace(/\/[\d]+$/, "");
		}
	}, {
		key: 'defaultDefinition',
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
		key: 'index',
		get: function get() {
			var self = this;
			return this.id || this.layers.filter(function (e) {
				return e.name == self.name;
			})[0].id;
		}
	}, {
		key: 'url',
		get: function get() {
			return this.service.url + '/' + this.index;
		}
	}, {
		key: 'extent',
		get: function get() {
			return [-180, -79, 180, 79];
		}
	}, {
		key: 'version',
		get: function get() {
			return this.service.version;
		}

		// Get the Changelog statistics
	}, {
		key: 'changeStatistics',
		get: function get() {
			var mods = { adds: 0, updates: 0, deletes: 0 };
			if (this.edits) {
				var changes = this.edits.features;
				mods.adds += changes.adds.length;
				mods.updates += changes.updates.length;
				mods.deletes += changes.deleteIds.length;
			}
			return mods;
		}
	}]);

	return Layer;
})(_portal2['default']);

exports['default'] = Layer;
module.exports = exports['default'];

},{"./portal":6,"./service":7}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

require('isomorphic-fetch');

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
		var merge = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

		var self = this;
		return fetch(requestUrl + '?f=json&token=' + this.token + '&' + Portal.serialize(requestParams), {
			method: 'get',
			headers: {}
		}).then(function (response) {
			return response.json();
		}).then(function (body) {
			var returnValue = body;
			if (merge) {
				Object.assign(self, body);
				returnValue = self;
			}
			return new Promise(function (resolve, reject) {
				resolve(returnValue);
			});
		})['catch'](function (error) {
			console.log('request failed', error);
		});
	};

	Portal.prototype.post = function post(requestUrl, requestBody) {
		var self = this;
		return fetch(requestUrl + '?f=json&token=' + this.token, {
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
		})['catch'](function (error) {
			console.log('request failed', error);
		});
	};

	return Portal;
})();

exports['default'] = Portal;
module.exports = exports['default'];

},{"isomorphic-fetch":1}],7:[function(require,module,exports){
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

	function Service() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		_classCallCheck(this, Service);

		_Portal.call(this, options);
	}

	Service.defaultDefinition = function defaultDefinition() {
		return {
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
	};

	Service.prototype.fetch = function fetch() {
		var _url = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

		if (_url === null) {
			_url = this.url;
		} else {
			this.encodedServiceURL = _url;
		}

		return this.get(this.url, {});
	};

	// TODO: merge options and default definition

	Service.prototype.create = function create() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		this.user = options.user; // TODO: add error handling if user is not valid.
		this.definition = Service.defaultDefinition();
		this.definition.name = options.name ? options.name : 'EmptyServiceName' + Math.random(1000); // sorry! @ajturner

		var requestUrl = this.arcgis + '/content/users/' + this.user.username + '/createService';
		var requestBody = {
			createParameters: JSON.stringify(this.definition),
			outputType: 'featureService'
		};
		return this.post(requestUrl, requestBody);
	};

	Service.prototype.fetchReplicas = function fetchReplicas() {
		var self = this;
		var _replicas = [];
		var requestUrl = this.url + '/replicas';
		return this.get(requestUrl, {}, false).then(function (_replicaList) {
			var promisedReplicas = _replicaList.map(self.replica.bind(self));
			return Promise.all(promisedReplicas).then(function (replicaResponses) {
				return new Promise(function (resolve, reject) {
					self.replicas = replicaResponses;
					resolve(self);
				});
			});
		});
	};

	Service.prototype.replica = function replica(_replica) {
		var requestUrl = this.url + '/replicas/' + _replica.replicaID;
		return this.get(requestUrl, {}, false);
	};

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Sync_workflow_examples/02r3000000rw000000/
	// Create Replica	

	Service.prototype.createReplica = function createReplica() {
		var layers = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

		return this.fetch().then(function (_service) {
			if (layers === null) {
				layers = _service.layers.map(function (i) {
					return i.id;
				});
			} else if (!Array.isArray(layers)) {
				layers = [layers];
			}
			var requestBody = {
				"geometry": JSON.stringify({ "xmin": -179, "ymin": -80, "xmax": 179, "ymax": 80 }),
				"geometryType": "esriGeometryEnvelope",
				"inSR": 4326,
				"layers": layers.join(','),
				"replicaName": "segment" + layers.join(''),
				"returnAttachments": true,
				"returnAttachmentsDataByUrl": true,
				"transportType": "esriTransportTypeEmbedded",
				"async": false,
				"syncModel": "perReplica",
				"dataFormat": "json",
				"f": "json" };
			var requestUrl = _service.url + "/createReplica";
			return _service.post(requestUrl, requestBody);
		});
	};

	Service.prototype.sync = function sync() {
		var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		var requestBody = {
			"replicaID": '{' + this.replicaID + '}',
			"replicaServerGen": options.version !== undefined ? options.version : this.version,
			"transportType": "esriTransportTypeEmbedded",
			"closeReplica": false,
			"returnIdsForAdds": false,
			"returnAttachmentsDataByUrl": true,
			"syncDirection": "download",
			"async": false,
			"dataFormat": "json",
			"f": "json"
		};
		var requestUrl = this.url + "/synchronizeReplica";
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
	}, {
		key: 'version',
		get: function get() {
			var version = 0;
			if (this.replicas !== undefined && this.replicas.length > 0) {
				version = this.replicas[0].replicaServerGen;
			} else if (this.replicaServerGen !== undefined) {
				version = this.replicaServerGen;
			}
			return version;
		}
	}]);

	return Service;
})(_portal2['default']);

exports['default'] = Service;
module.exports = exports['default'];

},{"./layer":5,"./portal":6}],8:[function(require,module,exports){
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

},{"./portal":6}]},{},[4]);
