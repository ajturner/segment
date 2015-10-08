import Portal from './portal';
import Layer from './layer';

export default class Service extends Portal {
	constructor(options = {}) {
		super(options);
  	}

  	static defaultDefinition() {
		return {
		   "name" : "",
		   "serviceDescription" : "",
		   "hasStaticData" : false,
		   "maxRecordCount" : 1000,
		   "supportedQueryFormats" : "JSON",
		   "capabilities" : "Create,Delete,Query,Update,Editing,Sync",
		   "description" : "",
		   "copyrightText" : "",
		   "spatialReference" : {
		      "wkid" : 102100
		      },
		   "initialExtent" : {
		      "xmin" : -179,
		      "ymin" : -80,
		      "xmax" : 179,
		      "ymax" : 80,
		      "spatialReference" : {"wkid" : 4326 } },
		   "allowGeometryUpdates" : true,
		   "units" : "esriMeters",
		   "xssPreventionInfo" : {
		      "xssPreventionEnabled" : true,
		      "xssPreventionRule" : "InputOnly",
		      "xssInputRule" : "rejectInvalid"
		      }
		};

  	}

  	fetch(_url = null) {
  		if(_url === null) {
  			_url = this.url;
  		} else {
			this.encodedServiceURL = _url;
  		}
  		
  		return this.get(this.url, {});
  	}

  	get url() {
  		return this.encodedServiceURL;
  	}

  	get adminUrl() {
  		return this.url.replace("rest/services", "rest/admin/services");
  	}

  	// TODO: merge options and default definition
	create(options = {}) {		
		this.user = options.user; // TODO: add error handling if user is not valid.
		this.definition = Service.defaultDefinition();
		this.definition.name = options.name ? options.name : `EmptyServiceName${Math.random(1000)}`; // sorry! @ajturner


		var requestUrl = `${this.arcgis}/content/users/${this.user.username}/createService`;
		var requestBody = {
			    createParameters: JSON.stringify(this.definition),
			    outputType: 'featureService'
			  }
		return this.post(requestUrl, requestBody);
	} 

	fetchReplicas() {
		var self = this;
		var _replicas = [];
		var requestUrl = `${this.url}/replicas`;
		return this.get(requestUrl, {}, false).then(function(_replicaList) {
			var promisedReplicas = _replicaList.map(self.replica.bind(self))
			return Promise.all(promisedReplicas).then(function(replicaResponses) {
				return new Promise(function(resolve, reject) {
					self.replicas = replicaResponses;
			        resolve(self);
			    })
			});
		});
	}

	replica(_replica) {
		var requestUrl = `${this.url}/replicas/${_replica.replicaID}`;
		return this.get(requestUrl, {}, false);
	}
	get version() {
		let version = 0;
		if(this.replicas !== undefined && this.replicas.length > 0) {
			version = this.replicas[0].replicaServerGen;
		} else if(this.replicaServerGen !== undefined) {
			version = this.replicaServerGen;
		}
		return version;
	}
	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Sync_workflow_examples/02r3000000rw000000/
	// Create Replica	
	createReplica(layers = null) {
		return this.fetch().then(function(_service) {
			if(layers === null) {
				layers = _service.layers.map(i => i.id)
			} else if (!Array.isArray(layers)) {
				layers = [layers];
			}			
			var requestBody = {
				"geometry": JSON.stringify({"xmin": -179, "ymin": -80, "xmax": 179, "ymax": 80}),
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
			    "f": "json"}
			var requestUrl = _service.url + "/createReplica";
			return _service.post(requestUrl, requestBody);
		})

	}

	sync(options = {}) {
		var requestBody = {
			"replicaID": `{${this.replicaID}}`,
		    "replicaServerGen": options.version !== undefined ? options.version : this.version, 
		    "transportType": "esriTransportTypeEmbedded",
		    "closeReplica": false,
		    "returnIdsForAdds": false,
		    "returnAttachmentsDataByUrl": true,
		    "syncDirection": "download",
		    "async": false,
		    "dataFormat": "json",
		    "f": "json"
		}
		var requestUrl = this.url + "/synchronizeReplica";
		return this.post(requestUrl, requestBody);
	}
}