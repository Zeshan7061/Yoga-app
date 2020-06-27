const mongoose = require('mongoose');
const { Schema } = mongoose;

const styleSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		default: '',
		trim: true,
	},
	image: {
		type: String,
		default: '',
		trim: true,
	},
});

module.exports = mongoose.model('Style', styleSchema);
