import Portal from './portal';
import Layer from './layer';

export default class Service extends Portal {
	constructor(options) {
		super(options);
		this.definition = {
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

  	get url() {
  		return this.encodedServiceURL;
  	}

  	get adminUrl() {
  		return this.url.replace("rest/services", "rest/admin/services");
  	}

	create(options = {}) {		
		this.user = options.user; // TODO: add error handling if user is not valid.
		this.definition.name = options.name ? options.name : `EmptyServiceName${Math.random(1000)}`; // sorry! @ajturner


		var requestUrl = `${this.arcgis}/content/users/${this.user.username}/createService`;
		var requestBody = {
			    createParameters: JSON.stringify(this.definition),
			    outputType: 'featureService'
			  }
		return this.post(requestUrl, requestBody);
	}  	
}