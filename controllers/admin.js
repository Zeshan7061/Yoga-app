const User = require('../models/User');
const Category = require('../models/Category');
const Trainer = require('../models/Trainer');
const fs = require('fs');
const bcrypt = require('bcryptjs');

module.exports = {
	dashborad: (req, res) => {
		res.render('admin/index');
	},

	fetchUsers: (req, res) => {
		if (req.user.roles.includes('admin')) {
			User.find().then((users) => {
				res.render('admin/users', {
					users,
				});
			});
		} else {
			res.redirect('/admin');
		}
	},

	addUser: (req, res) => {
		if (req.user.roles.includes('admin')) {
			res.render('admin/addUser');
		} else {
			res.redirect('/admin');
		}
	},

	updateStatus: (req, res) => {
		let status = '';
		req.params.status == 'enable'
			? (status = 'Enabled')
			: (status = 'Disabled');

		User.updateOne(
			{ _id: req.params.id },
			{
				$set: {
					status,
				},
			}
		).then((data) => {
			req.flash('success_msg', 'Status has been successfully changed.');
			res.redirect('/admin/users');
		});
	},

	deleteUser: (req, res) => {
		User.remove({
			_id: req.params.id,
		}).then((userRemoved) => {
			req.flash('success_msg', 'User removed successfully.');
			res.redirect('/admin/users');
		});
	},

	profilePgae: (req, res) => {
		User.findById(req.user.id).then((user) => {
			res.render('admin/profile', {
				user,
			});
		});
	},

	editProfile: (req, res) => {
		res.render('admin/manageProfile');
	},

	updateProfile: (req, res) => {
		const { name, email } = req.body;

		User.findById(req.user.id).then((user) => {
			user.name = name;
			user.email = email;

			if (req.files) {
				const file = req.files.file;
				let fileName = Date.now() + '-' + file.name;

				file.mv('./public/images/' + fileName, async (err) => {
					if (err) throw err;

					const img = user.image;
					user.image = fileName;

					if (img != '') {
						fs.unlink('./public/images/' + img, (err) => {
							if (err) throw err;
						});
					}

					await user.save((userSaved) => {
						req.flash('success_msg', 'Profile updated sucessfully.');
						res.redirect('/admin/user/profile/' + user._id);
					});
				});
			}
		});
	},

	newUser: async (req, res) => {
		try {
			let errors = [];

			if (!req.body.name) {
				errors.push({
					message: 'Add fisrtName!',
				});
			}

			if (!req.body.email) {
				errors.push({
					message: 'Add an email!',
				});
			}

			if (!req.body.password) {
				errors.push({
					message: 'Add password!',
				});
			}

			if (!req.body.confirmPassword) {
				errors.push({
					message: 'Add confirm Password!',
				});
			}

			if (req.body.password !== req.body.confirmPassword) {
				errors.push({
					message: "Passwords don't match.",
				});
			}

			if (errors.length > 0) {
				console.log(errors);
				await res.render('admin/addUser', {
					errors: errors,
					name: req.body.name,
					email: req.body.email,
				});
			} else {
				const { name, email, password } = req.body;

				User.findOne({ email: email }).then((user) => {
					if (user) {
						errors.push({ message: 'Email already exists. Please log in.' });
						res.render('admin/addUser', {
							errors: errors,
							name: name,
							email: email,
						});
					} else {
						const user = new User({
							name: name,
							email: email,
							password: password,
						});

						bcrypt.genSalt(10, (err, salt) => {
							bcrypt.hash(user.password, salt, (err, hash) => {
								user.password = hash;
								user.save().then(async (savedUser) => {
									req.flash('success_msg', 'User created successfully.');
									res.redirect('/admin/users');
								});
							});
						});
					}
				});
			}
		} catch (error) {
			console.log(error);
		}
	},

	subscriptionPage: (req, res) => {
		res.render('admin/subscription');
	},

	fetchTrainers: (req, res) => {
		Category.find().then((categories) => {
			Trainer.find().then((trainers) => {
				res.render('admin/trainer', {
					categories,
					trainers,
				});
			});
		});
	},

	createTrainer: async (req, res, next) => {
		try {
			const trainer = new Trainer({
				name: req.body.name,
				category: req.body.category,
			});

			if (req.files) {
				const file = req.files.image;
				let fileName = Date.now() + '-' + file.name;

				file.mv('./public/images/' + fileName, (err) => {
					if (err) throw err;
					trainer.image = fileName;

					trainer.save().then((data) => {
						req.flash('success_msg', `${trainer.name} added successfully.`);
						res.redirect('/admin/trainers');
					});
				});
			} else {
				trainer.save().then((data) => {
					req.flash('success_msg', `${trainer.name} added successfully.`);
					res.redirect('/admin/trainers');
				});
			}
		} catch (error) {
			next(error);
		}
	},

	editTrainer: async (req, res, next) => {
		try {
			const trainer = await Trainer.findById(req.params.id);
			const categories = await Category.find();

			res.render('admin/editTrainer', {
				trainer,
				categories,
			});
		} catch (error) {
			next(error);
		}
	},

	updateTrainer: async (req, res, next) => {
		try {
			Trainer.findById(req.params.id).then((trainer) => {
				trainer.name = req.body.name;
				trainer.category = req.body.category;

				if (req.files) {
					fs.unlink('./public/images/' + trainer.image, (err) => {
						if (err) throw err;
					});

					const file = req.files.image;
					let fileName = Date.now() + '-' + file.name;

					file.mv('./public/images/' + fileName, (err) => {
						if (err) throw err;
						trainer.image = fileName;

						trainer.save().then((data) => {
							req.flash('success_msg', `${trainer.name} updated successfully.`);
							res.redirect('/admin/trainers');
						});
					});
				} else {
					trainer.save().then((data) => {
						req.flash('success_msg', `${trainer.name} updated successfully.`);
						res.redirect('/admin/trainers');
					});
				}
			});
		} catch (error) {
			next(error);
		}
	},

	deleteTrainer: async (req, res, next) => {
		try {
			const trainer = await Trainer.findById(req.params.id);

			if (trainer.image) {
				fs.unlink('./public/images/' + trainer.image, (err) => {
					if (err) throw err;
				});
			}

			if (trainer.videos.length > 0) {
				trainer.videos.forEach((video) => {
					fs.unlink('./public/uploads/trainerVideos/' + video, (err) => {
						if (err) throw err;

						trainer.remove();
						req.flash('success_msg', `${trainer.name} removed successfully.`);
						res.redirect('/admin/trainers');
					});
				});
			} else {
				trainer.remove();
				req.flash('success_msg', `${trainer.name} removed successfully.`);
				res.redirect('/admin/trainers');
			}
		} catch (error) {
			next(error);
		}
	},

	uploadTrainerVideoPage: (req, res) => {
		Trainer.find().then((trainers) => {
			res.render('admin/uploadVideo', {
				trainers,
			});
		});
	},

	uploadTrainerVideo: (req, res) => {
		Trainer.findOne({ name: req.body.trainer }).then((trainer) => {
			if (req.files) {
				const file = req.files.file;
				let fileName = Date.now() + '-' + file.name;

				file.mv('./public/uploads/trainerVideos/' + fileName, (err) => {
					if (err) throw err;
					trainer.videos.push(fileName);
					trainer.save();
					req.flash('success_msg', 'Video has been successfully uploaded.');
					res.redirect('/admin/trainerVideos/' + trainer._id);
				});
			}
		});
	},

	deleteTrainerVideo: async (req, res, next) => {
		try {
			const trainer = await Trainer.findById(req.params.id);
			const index = trainer.videos.indexOf(req.params.video);

			fs.unlink(
				'./public/uploads/trainerVideos/' + trainer.videos[index],
				(err) => {
					if (err) throw err;
				}
			);

			trainer.videos.splice(index, 1);

			trainer.save().then((savedTrainer) => {
				req.flash('success_msg', `Video removed successfully.`);
				res.redirect('/admin/trainerVideos/' + trainer._id);
			});
		} catch (error) {
			next(error);
		}
	},

	showTrainerVideos: (req, res) => {
		Trainer.findById(req.params.id).then((trainer) => {
			res.render('admin/trainerVideos', {
				trainer,
			});
		});
	},
};
