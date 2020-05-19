const mongoose = require('mongoose');
const { Schema } = mongoose;
const USER_DEFAULT_IMAGE = 'user.jpg';

const trainerSchema = new Schema({
	name: {
		type: String,
		required: [true, 'please add a name'],
		trim: true,
		match: [/^[a-zA-Z0-9]+([_\s\-]?[a-zA-Z0-9])*$/, 'Please add a valid Name'],
	},
	image: {
		type: String,
		default: '',
		trim: true,
	},
	videos: {
		type: Array,
		default: [],
	},
	category: {
		type: String,
		default: '',
		required: true,
		trim: true,
	},
});

module.exports = mongoose.model('Trainer', trainerSchema);
