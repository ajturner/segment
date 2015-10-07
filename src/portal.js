import 'isomorphic-fetch';

export default class Portal {
	constructor(options) {
		this.arcgis = options.portal !== undefined ? options.portal : 'https://www.arcgis.com/sharing/rest';
		this.token = options.token;
	}
	
  	static serialize(obj) {
	  var str = [];
	  for(var p in obj)
	    if (obj.hasOwnProperty(p)) {
	      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
	    }
	  return str.join("&");
	}

	get(requestUrl, requestParams = {}, merge = true) {
		var self = this;
 		return fetch( `${requestUrl}?f=json&token=${this.token}&${Portal.serialize(requestParams)}`, {
			  method: 'get',
			  headers: {}
		}).then(function(response) {
			return response.json();
		}).then(function(body) {
			var returnValue = body;
			if(merge) {
				Object.assign(self, body);
				returnValue = self;
			}
			return new Promise(function(resolve, reject) {
		        resolve(returnValue)
		    })
		}).catch(function(error) {
			console.log('request failed', error)
		});		
	}

	post(requestUrl, requestBody) {
		var self = this;
 		return fetch( `${requestUrl}?f=json&token=${this.token}`, {
			  method: 'post',
			  headers: {
			    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			  },
			  body: Portal.serialize(requestBody)
		}).then(function(response) {
			return response.json();
		}).then(function(body) {
			Object.assign(self, body);
			return new Promise(function(resolve, reject) {
		        resolve(self)
		    })
		}).catch(function(error) {
			console.log('request failed', error)
		});		
	}

}