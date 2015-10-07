import Portal from './portal';
import Service from './service';

export default class Layer extends Portal {
	constructor(options = {}) {
		super(options)
		this.definition = {};
	  	// Override the defaults
	  	Object.assign(this.definition, options.definition ? options.definition : {layers: []});
	}

	// This can probably be less cally
	find(options) {
		var self = this;
		this.encodedLayerURL = options.url;
		return this.get(options.url).then(this.fetchService);
	}

	// Are Replicas returned per layer index?
	get edits() {
		return this.service.edits[this.index];
	}

	// If we Layer.find() then we need to get the service metadata
	fetchService(_layer) {
		var self = _layer;
		var service = new Service({portal: self.portal, token: self.token});
		return service.fetch(self.serviceUrl)
					.then(function(s) { 
						self.service = s;
						return new Promise(function(resolve, reject) {
							resolve(self);
						});
					});			
	}

	create(options = {} ) {
		if(options.service !== undefined){
			this.service = options.service;
		}
		let layers = {};
		Object.assign(layers, this.defaultDefinition.layers[0], options.definition);
		this.definition.layers[0] = layers;
		var requestUrl = `${this.service.adminUrl}/addToDefinition`;
		var requestBody = {addToDefinition: JSON.stringify(this.definition)};

		return this.post(requestUrl, requestBody);
	}	

	get serviceUrl() {
		return this.encodedLayerURL.replace(/\/[\d]+$/, "");
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
		return this.id || this.layers.length-1;
	}
	get url() {
		return `${this.service.url}/${this.index}`
	}
	get extent() {
		return [-104,35.6,-94.32,41];
	}

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Sync_workflow_examples/02r3000000rw000000/
	// Create Replica	
	createReplica() {
		return this.service.createReplica();
	}

	// http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/
	applyEdits(options) {
		var requestBody = options;
		var requestUrl = this.url + "/applyEdits";
		return this.post(requestUrl, requestBody);		
	}

	get version() {
		return this.service.version;
	}

	// Get the Changelog statistics
	get changeStatistics() {
		var mods = {adds: 0, updates: 0, deletes: 0};
		if(this.edits) {		
			var changes = this.edits.features;
			mods.adds     += changes.adds.length;
			mods.updates  += changes.updates.length;
			mods.deletes  += changes.deleteIds.length;
		}
		return mods;
	}

	// Proxy to Service#sync
	sync(options = {}) {
		return this.service.sync(options);
	}

}