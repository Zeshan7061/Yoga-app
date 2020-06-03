const mongoose = require('mongoose');
const { Schema } = mongoose;

const videoSchema = new Schema({
	video: {
		type: Object,
		default: {},
	},
	date: {
		type: Date,
		default: Date.now,
	},
	title: {
		type: String,
		default: '',
	},
});

module.exports = mongoose.model('Video', videoSchema);
