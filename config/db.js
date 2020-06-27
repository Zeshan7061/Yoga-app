const mongoose = require('mongoose');
const MONGO_URI =
	'mongodb+srv://sy7moves:YogaApp69@sy7moves-4wrqy.mongodb.net/YogaApp?retryWrites=true&w=majority';

const connectDB = async () => {
	const conn = await mongoose.connect(MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
		useFindAndModify: false,
	});

	console.log(
		`MongoDB connected: ${conn.connection.host}`.green.underline.bold
	);
};

module.exports = connectDB;
