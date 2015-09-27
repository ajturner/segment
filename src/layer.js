import Portal from './portal';

export default class Layer extends Portal {
	constructor(options) {
		super(options)
		this.definition = {};
	  	// Override the defaults
	  	Object.assign(this.definition, options.definition ? options.definition : {layers: []});
	}

	find(options) {
		return this.get(options.url)
	}

	create(options = {} ) {
		if(options.service !== undefined){
			this.service = options.service;
		}
		Object.assign(layers, this.defaultDefinition.layers[0], options.definition);
		this.definition.layers[0] = layers;
		var requestUrl = `${this.service.adminUrl}/addToDefinition`;
		var requestBody = {addToDefinition: JSON.stringify(this.definition)};

		return this.post(requestUrl, requestBody);
	}	

	get defaultDefinition() {
	 	return {
		"layers": [{
	      "name" : "New Layer", 
	      "type" : "Feature Layer", 
	      "displayField" : "", 
	      "description" : "", 
	      "copyrightText" : "", 
	      "defaultVisibility" : true, 
	      "relationships" : [], 
	      "isDataVersioned" : false, 
	      "supportsRollbackOnFailureParameter" : true, 
	      "supportsAdvancedQueries" : true, 
	      "geometryType" : "esriGeometryPoint", 
	      "minScale" : 0, 
	      "maxScale" : 0, 
	      "extent" : {
	        "xmin" : -179, 
	        "ymin" : -80, 
	        "xmax" : 179, 
	        "ymax" : 80, 
	        "spatialReference" : {
	          "wkid" : 4326
	        }
	      },
	      "allowGeometryUpdates" : true, 
	      "hasAttachments" : false, 
	      "htmlPopupType" : "esriServerHTMLPopupTypeNone", 
	      "hasM" : false, 
	      "hasZ" : false, 
	      "objectIdField" : "ObjectID", 
	      "globalIdField" : "", 
	      "typeIdField" : "", 
	      "fields" : [
	        {
	          "name" : "ObjectID", 
	          "type" : "esriFieldTypeInteger", 
	          "alias" : "ObjectID", 
	          "sqlType" : "sqlTypeInteger", 
	          "nullable" : false, 
	          "editable" : false, 
	          "domain" : null, 
	          "defaultValue" : null
	        }
	      ],
	      "maxRecordCount" : 1000, 
	      "capabilities" : "Query, Editing, Create, Update, Delete, Sync"
	    }
	  ]};		
	}
	get index() {
		return this.layers.length-1;
	}
	get url() {
		return `${this.service.encodedServiceURL}/${this.index}`
	}
	get extent() {
		return [-104,35.6,-94.32,41];
	}

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Sync_workflow_examples/02r3000000rw000000/
	// Create Replica	
	createReplica() {
		var requestBody = {
			"geometry": JSON.stringify({"xmin": -179, "ymin": -80, "xmax": 179, "ymax": 80}),
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
		    "f": "json"}
		var requestUrl = this.service.url + "/createReplica";
		return this.post(requestUrl, requestBody);
	}

	sync(options = {}) {
		var requestBody = {
			"replicaID": `{${this.replicaID}}`,
		    "replicaServerGen": options.version !== undefined ? options.version : this.replicaServerGen, 
		    "transportType": "esriTransportTypeEmbedded",
		    "closeReplica": false,
		    "returnIdsForAdds": false,
		    "returnAttachmentsDataByUrl": true,
		    "syncDirection": "download",
		    "async": false,
		    "dataFormat": "json",
		    "f": "json"
		}
		var requestUrl = this.service.url + "/synchronizeReplica";
		return this.post(requestUrl, requestBody);
	}

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/
	applyEdits(options) {
		var requestBody = options;
		var requestUrl = this.url + "/applyEdits";
		return this.post(requestUrl, requestBody);		
	}

	get currentVersion() {
		return this.replicaServerGen;
	}

	// Get the Changelog statistics
	get changeStatistics() {
		var changes = this.edits.length;
		var mods = {adds: 0, updates: 0, deletes: 0};
		for(let rev in this.edits) {
			mods.adds     += this.edits[rev].features.adds.length;
			mods.updates  += this.edits[rev].features.updates.length;
			mods.deletes  += this.edits[rev].features.deleteIds.length;
		}
		return mods;
	}
}