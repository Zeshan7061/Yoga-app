const User = require('../models/User');
const Category = require('../models/Category');
const Trainer = require('../models/Trainer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { adminAccess } = require('../helpers/helper');
const Video = require('../models/Video');
const Message = require('../models/Message');
const Style = require('../models/Style');

module.exports = {
	dashborad: (req, res) => {
		req.user.roles.includes('admin')
			? res.render('admin/index')
			: res.redirect('/');
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
		const {
			name,
			email,
			website,
			password,
			confirmPassword,
			currentPassword,
		} = req.body;

		User.findById(req.user.id).then((user) => {
			user.name = name;
			user.email = email;
			user.website = website;

			if (
				password.length &&
				confirmPassword.length &&
				confirmPassword.length > 0 &&
				password.length > 0 &&
				password != confirmPassword
			) {
				req.flash('error_msg', "Passwords don't match.");
				return res.redirect('/manageAccount/' + user._id);
			}

			if (password.length && password.length > 0) {
				bcrypt.compare(currentPassword, user.password, (err, matched) => {
					if (matched) {
						bcrypt.genSalt(10, (err, salt) => {
							bcrypt.hash(req.body.password, salt, (err, hash) => {
								user.password = hash;

								user.save().then((savedUser) => {
									req.flash('success_msg', 'Profile updated sucessfully.');
									return res.redirect('/manageAccount/' + user._id);
									res.redirect('/admin/user/profile/' + user._id);
								});
							});
						});
					} else {
						req.flash('error_msg', 'Incorrect Password!');
						res.redirect('/manageAccount/' + user._id);
					}
				});
			} else {
				if (req.files) {
					const file = req.files.file;
					let fileName = Date.now() + '-' + file.name;

					file.mv('./public/images/' + fileName, async (err) => {
						if (err) throw err;

						const img = user.image;
						user.image = fileName;

						if (
							img != '' &&
							img != 'user.jpg' &&
							fs.existsSync(`./public/images/${img}`)
						) {
							fs.unlink('./public/images/' + img, (err) => {
								if (err) throw err;
							});
						}

						user.save().then((savedUser) => {
							req.flash('success_msg', 'Profile updated sucessfully.');
							return res.redirect('/manageAccount/' + user._id);
						});
					});
				} else {
					user.save().then((savedUser) => {
						req.flash('success_msg', 'Profile updated sucessfully.');
						return res.redirect('/manageAccount/' + user._id);
					});
				}
			}
		});
	},

	updateAdminProfile: async (req, res) => {
		const { name, email } = req.body;

		const user = await User.findById(req.params.id);
		user.name = name;
		user.email = email;

		if (req.files) {
			const file = req.files.file;
			let fileName = Date.now() + '-' + file.name;

			file.mv('./public/images/' + fileName, async (err) => {
				if (err) throw err;

				const img = user.image;
				user.image = fileName;

				if (
					img != '' &&
					img != 'user.jpg' &&
					fs.existsSync(`./public/images/${img}`)
				) {
					fs.unlink('./public/images/' + img, (err) => {
						if (err) throw err;
					});
				}

				user.save().then((savedUser) => {
					req.flash('success_msg', 'Profile updated sucessfully.');
					return res.redirect('/admin/user/profile/' + user._id);
				});
			});
		} else {
			user.save().then((savedUser) => {
				req.flash('success_msg', 'Profile updated sucessfully.');
				return res.redirect('/admin/user/profile/' + user._id);
			});
		}
	},

	changePasswordPage: (req, res) => {
		res.render('admin/users/changePassword', {
			title: 'Change Password',
		});
	},

	matchCurrentPassword: (req, res) => {
		if (!req.body.password) {
			req.flash('error_msg', 'please fill in the required field.');
			return res.redirect('/admin/user/password');
		}

		User.findById(req.user.id).then((user) => {
			bcrypt.compare(req.body.password, user.password, (err, matched) => {
				if (err) throw err;

				if (matched) {
					return res.render('admin/users/newPassword', {
						title: 'New Password',
					});
				} else {
					req.flash('error_msg', 'Password mismatch.');
					return res.redirect('/admin/user/password');
				}
			});
		});
	},

	updatePassword: (req, res) => {
		User.findById(req.user._id).then((user) => {
			let errors = [];
			if (!req.body.password || !req.body.confirmPassword) {
				errors.push({ message: 'please fill in all fields' });
			}

			if (req.body.password !== req.body.confirmPassword) {
				errors.push({ message: "passwords don't match." });
			}

			if (errors.length > 0) {
				res.render('admin/users/newPassword', {
					title: 'New Password',
					errors,
				});
			} else {
				User.findById(req.user._id).then((user) => {
					bcrypt.genSalt(10, (err, salt) => {
						bcrypt.hash(req.body.password, salt, (err, hash) => {
							user.password = hash;

							user.save().then((savedUser) => {
								req.flash(
									'success_msg',
									'Your password has been changed succesfully.'
								);

								res.redirect('/admin/user/profile/' + user._id);
							});
						});
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
		if (adminAccess(req.user, res)) {
			Category.find().then((categories) => {
				Trainer.find().then((trainers) => {
					res.render('admin/trainer', {
						categories,
						trainers,
					});
				});
			});
		}
	},

	createTrainer: async (req, res, next) => {
		try {
			const trainer = new Trainer({
				name: req.body.name,
				category: req.body.category,
				bio: req.body.bio,
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
				trainer.bio = req.body.bio;

				if (req.files) {
					if (
						trainer.image != '' &&
						trainer.image != 'user.jpg' &&
						fs.existsSync(`./public/images/${trainer.image}`)
					) {
						fs.unlink('./public/images/' + trainer.image, (err) => {
							if (err) throw err;
						});
					}

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

			if (fs.existsSync(`./public/images/trainer.image`)) {
				fs.unlink('./public/images/' + trainer.image, (err) => {
					if (err) throw err;
				});
			}

			if (trainer.videos.length > 0) {
				trainer.videos.forEach((video) => {
					if (fs.existsSync(`./public/uploads/trainerVideos/${video.video}`))
						fs.unlink(
							'./public/uploads/trainerVideos/' + video.video,
							(err) => {
								if (err) throw err;
							}
						);
				});

				await trainer.remove();
				req.flash('success_msg', `${trainer.name} removed successfully.`);
				res.redirect('/admin/trainers');
			} else {
				await trainer.remove();
				req.flash('success_msg', `${trainer.name} removed successfully.`);
				res.redirect('/admin/trainers');
			}
		} catch (error) {
			next(error);
		}
	},

	uploadTrainerVideoPage: (req, res) => {
		if (adminAccess(req.user, res)) {
			Trainer.find().then((trainers) => {
				Style.find().then((styles) => {
					res.render('admin/uploadVideo', {
						trainers,
						styles,
					});
				});
			});
		}
	},

	uploadTrainerVideo: (req, res) => {
		if (adminAccess(req.user, res)) {
			Trainer.findOne({ name: req.body.trainer }).then((trainer) => {
				if (req.files) {
					const file = req.files.file;
					let fileName = Date.now() + '-' + file.name;

					file.mv('./public/uploads/trainerVideos/' + fileName, (err) => {
						if (fs.existsSync(`./public/uploads/trainerVideos/${fileName}`)) {
							if (err) throw err;

							trainer.videos.push({
								video: fileName,
								style: req.body.style,
								title: req.body.title,
							});

							trainer.style = req.body.style;
							trainer.save();

							new Video({
								video: {
									name: fileName,
									category: trainer.category,
									trainer: trainer.name,
									style: req.body.style,
								},
								title: req.body.title,
							}).save();

							req.flash('success_msg', 'Video has been successfully uploaded.');
							res.redirect('/admin/trainerVideos/' + trainer._id);
						}
					});
				}
			});
		}
	},

	deleteTrainerVideo: async (req, res, next) => {
		try {
			const trainer = await Trainer.findById(req.params.id);
			const index = trainer.videos.findIndex(
				(elem) => elem.video == req.params.video
			);

			fs.unlink(
				'./public/uploads/trainerVideos/' + trainer.videos[index].video,
				(err) => {
					if (err) throw err;
				}
			);

			await Video.deleteOne({
				title: trainer.videos[index].title,
			});

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

	cancelSubscription: (req, res) => {
		User.findById(req.user.id).then(async (user) => {
			if (user.subscription.status == 'trail') {
				user.subscription = {
					amount: user.subscription.amount,
					span: user.subscription.span,
					status: 'cancelled',
					customer: user.subscription.customer,
					clientSecrect: user.subscription.clientSecrect,
				};
			} else if (user.subscription.status == 'cancelled') {
				user.subscription = {
					amount: user.subscription.amount,
					span: user.subscription.span,
					status: 'trail',
					customer: user.subscription.customer,
					clientSecrect: user.subscription.clientSecrect,
				};
			}

			await user.save();
			res.render('home/manageSubscription');
		});
	},

	managePaymentPage: (req, res) => {
		res.render('admin/users/updatePayment');
	},

	managePaymentDetails: async (req, res) => {
		const stripe = require('stripe')(
			'sk_test_3DZ6KTMhZBauyttWpWGOGUhN00m48c75zE'
		);
		const custmr_id = req.user.subscription.customer.id;

		const customer = await stripe.customers.update(custmr_id, {
			email: req.body.email,
			source: req.body.stripeToken,
			description: 'Yoga App Payment',
		});

		req.flash(
			'success_msg',
			'Your card details has been updated successfully.'
		);

		return res.redirect('/manageAccount/' + req.user.id);

		res.redirect('/admin/user/managePayment');
	},

	yogaVideos: (req, res) => {
		Trainer.find().then(async (users) => {
			let videosArray = [];

			users.forEach((user) => {
				videosArray = [...videosArray, ...user.videos];
			});

			await res.render('admin/users/yogaVideos', {
				videos: videosArray,
			});
		});
	},

	customerQueries: (req, res) => {
		Message.find().then((messages) => {
			res.render('admin/users/messages', {
				messages,
			});
		});
	},

	removeQuery: (req, res) => {
		Message.findByIdAndDelete(req.params.id).then((msg) => {
			req.flash('success_msg', 'Customer query deleted successfully.');
			res.redirect('/admin/queries');
		});
	},

	addStyles: async (req, res) => {
		const styles = [
			{
				name: 'SY7 FLOW',
				description:
					'SY7 Flow is a style of yoga that focuses on strength, agility, balance & flexibility . I use "power" to describe our class meant to help you burn calories & sweat as well as awaken your personal power. It is more than just the passive stretching that yoga has a reputation for. Open to ALL Levels.',
			},
			{
				name: 'SY7 POWER',
				description:
					'SY7 POWER uses the poses & flow of yoga practice in a "sets" & "reps" form and pushups. This organic style exercise class tones strengthens & ignites the internal fire. No machines, just your body. Intermediate Level .',
			},
			{
				name: 'SY7 HIIT',
				description:
					"SY7 HIIT is a training system that combines High Intensity Interval Training (HIIT), muscle toning and cardio in a heated room. This practice promotes long, lean muscle mass while burning fat, with rapid results. It strengthens your core, improves circulation, and increases flexibility. SY7 HIIT is performed on a yoga mat. All movements are low impact, which protects your joints and muscles from the pounding of other exercises like running and jumping.Not only do you burn more calories during a HIIT workout, but the effect of all that intense exertion kicks your body's repair cycle into hyperdrive. That means you burn more fat and calories in the 24 hours after a SY7 HIIT workout than you do after, say, a steady-pace run. Advance Level.",
			},
			{
				name: 'SY7 FOLLOW',
				description:
					'THE PERFECT HOUR. SY7 FOLLOW IS A VINYASA STYLE YOGA CLASS WITH CREATIVE SEQUENCING, AND LESS INSTRUCTIONS. YOU WILL FIND SUN SALUTATIONS, STANDING POSTURES, BACK OPENING, INVERSIONS & TWISTING. IT IS A SWEATY, FUN & CHALLENGING YOGA CLASS. Intermediate and Advance level welcome.',
			},
			{
				name: 'Yoga for Beginners',
				description:
					'Learn the Basics of Vinyasa & Ashtanga Yoga by the SY7 BODYBAR teachers who break down the poses for you in Yoga for Beginners.',
			},
			{
				name: 'Yoga for Kids',
				description:
					'Kids yoga for start ! In this short-but-sweet class, we’ll practice simple techniques to get our bodies moving and minds centered. Perfect for kids to practice on their own, or for parents and kids to connect to their inner child together.',
			},
		];

		for (let i = 0; i < styles.length; i++) {
			const s = new Style({
				name: styles[i].name,
				description: styles[i].description,
			});

			await s.save();
		}
	},
};
