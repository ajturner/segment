export var VERSION = '0.1.0';
import { Portal, Service, Layer } from './arcgis';
import User from './user';

// module.exports = {
//   User: User,
//   Portal: Portal,
//   Service: Service,
//   Layer: Layer
// }
var fields = [
  { "name" : "ObjectID", 
    "type" : "esriFieldTypeInteger", 
    "alias" : "ObjectID", 
    "sqlType" : "sqlTypeInteger", 
    "nullable" : false, 
    "editable" : false, 
    "domain" : null, 
    "defaultValue" : null
  },
  { "name" : "Miles", 
    "type" : "esriFieldTypeInteger", 
    "alias" : "Miles"
  },
  { "name" : "Efficiency", 
    "type" : "esriFieldTypeInteger", 
    "alias" : "Efficiency"
  },
  {
    "name" : "Created",
    "type": "esriFieldTypeDate",
    "alias" : "Created"
  }
]

function createLayer(_service) {
  console.log("Create Layer - Service:", _service);
  return layer.create({service: _service, definition: {name: "VersionLayer", fields: fields}});
}

function createService(_owner) {
  return service.create({user: _owner, name: `VersionTest${Math.floor(Math.random(1000)*1000)}`});
};

function createReplica(_layer) {
  return _layer.createReplica();
}

// For demo purposes.
function addFeaturesSync() { 
  return addFeatures(true);
};
function addFeatures(sync = false) {
  var feature = {
    "attributes": {
      "Miles": Math.floor(Math.random() * 10000),
      "Efficiency": Math.floor(Math.random() * 80),
      "Created": new Date().toISOString()
    },
    "geometry" : {"x" : -118.15, "y" : 33.80}
  }
  var mods = {
    adds: JSON.stringify([feature]),
    updates: [],
    deletes: []
  }
  layer.applyEdits(mods).then(function() { if(sync == true) {syncLayer()} });
  return false;
}

function syncLayer() {
  service.sync().then(function(u) {
    console.log("syncLayer", u)
    showVersion(layer);
  });
  return false;
}

function showVersion(_layer, sourceVersion = null, logger = "versions") {
  var newDiv = document.createElement("li");
  var mods = _layer.changeStatistics;

  var versionCompare = []
  if(sourceVersion !== null) {
    versionCompare.push(sourceVersion);
  }
  versionCompare.push(_layer.version);
  newDiv.innerHTML = `${versionCompare.join(" -> ")} | ${mods.adds} added | ${mods.updates} updated | ${mods.deletes} deleted`;

  newDiv.dataset.version = _layer.version;
  newDiv.onclick = getVersion;

  var currentDiv = document.getElementById(logger); 
  currentDiv.insertBefore(newDiv, currentDiv.firstChild);
}   
function getVersion(request, logger = "compare") {
  var version = request;
  if(request.target) { // an event
    version = event.target.dataset.version;
  }
  return layer.sync({version: version}).then(function(u) {
    showVersion(layer, version, logger);
  });
}

function addControl(link) {
  var newDiv = document.createElement("li"); 
  var newLink = document.createElement("a");
  var linkText = document.createTextNode(link.text);
  newLink.appendChild(linkText);
  newLink.href = "#"
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

  user = new User({token: token, portal: portal});
  service = new Service({token: token, portal: portal});
  layer = new Layer({token: token, portal: portal});

  document.getElementById("createService").parentNode.remove();
  document.getElementById('versionQueryAction').onclick = function(event) {
    getVersion(document.getElementById('versionQuery').value, "compare");
    return false;
  };

  user.find(username)
    .then(createService)
    .then(createLayer)
    .then(createReplica)
    .then(function() {
      document.getElementById("service").innerHTML = `<a href="${service.url}" target="_new">Service</a>`;
      document.getElementById("layers").innerHTML = `<a href="${layer.url}" target="_new">Layer</a>`;;
    })
    .then(syncLayer)
    .then(function() { setStatus("Layer Created"); })
    .then(function() { 
      var newLinks = [
        {id: "addFeature", text: "Add Features (Sync Update)", onclick: addFeaturesSync },
        {id: "addFeature", text: "Add Features", onclick: addFeatures },
        {id: "getUpdates", text: "Get Updates", onclick: syncLayer }
      ];
      for (let link in newLinks) {
        addControl(newLinks[link]);
      }
    });
}

var portal = "http://www.arcgis.com/sharing/rest";
var user, service, layer, token, username;
function initialize() {
  addControl({id:"createService", text: "Create Service", onclick: controlService});
  setStatus("...");
}
// Not bothering with ES6 to body onload...
window.setTimeout(initialize, 1000)


