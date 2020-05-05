const mongoose = require('mongoose');
const { Schema } = mongoose;
const USER_DEFAULT_IMAGE = 'user.jpg';

const userSchema = new Schema({
	name: {
		type: String,
		required: [true, 'please add a name'],
		trim: true,
		match: [/^[a-zA-Z0-9]+([_\s\-]?[a-zA-Z0-9])*$/, 'Please add a valid Name'],
	},
	email: {
		type: String,
		required: true,
		match: [
			/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
			'Please add a valid email',
		],
	},
	password: {
		type: String,
		required: true,
	},
	image: {
		type: String,
		default: '',
	},
	roles: {
		type: [String],
		enum: ['admin', 'user'],
		default: 'user',
	},
	status: {
		type: String,
		default: 'Enabled',
	},
	subscription: {
		type: Object,
		default: {},
	},
});

module.exports = mongoose.model('users', userSchema);
