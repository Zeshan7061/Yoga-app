const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
	user: {
		type: Object,
		default: {},
	},

	title: {
		type: String,
		default: '',
		trim: true,
	},

	message: {
		type: String,
		default: '',
		trim: true,
	},
});

module.exports = mongoose.model('Message', messageSchema);
