import Portal from './portal';

export default class User extends Portal {
	constructor(options) {
		super(options);
		this.tags = [];
  	}

	find(username, cb) {
		this.username = username;
		var requestUrl = `${this.arcgis}/community/users/${this.username}`;
		return this.get(requestUrl);
	}

	update(tags) {
		var requestUrl = `${this.arcgis}/community/users/${username}/update`;
		var requestBody = {tags: tags};
		return this.post(requestUrl, requestBody);
	}
}