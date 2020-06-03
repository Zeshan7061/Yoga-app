const bcrypt = require('bcryptjs');
const { Strategy } = require('passport-local');
const passport = require('passport');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const assert = require('assert');
const payment = require('../helpers/payment');
const { dateDifference } = require('../helpers/helper');
const stripe = require('stripe')('sk_test_3DZ6KTMhZBauyttWpWGOGUhN00m48c75zE');
const Message = require('../models/Message');
const Video = require('../models/Video');

module.exports = {
	home: async (req, res) => {
		User.find().then((users) => {
			users.forEach(async (user) => {
				if (
					user.subscription.customer &&
					user.subscription.status == 'trail' &&
					dateDifference(user.date) < 1
				) {
					const paymentMethods = await stripe.paymentMethods.list({
						customer: user.subscription.customer.id,
						type: 'card',
					});

					try {
						let price =
							user.subscription.amount == 19.99
								? 20.0
								: user.subscription.amount;

						const paymentIntent = await stripe.paymentIntents.create({
							amount: price * 100,
							currency: 'usd',
							customer: user.subscription.customer.id,
							payment_method: paymentMethods.data[0].id,
							off_session: true,
							confirm: true,
						});

						console.log(paymentIntent);

						if (paymentIntent.chargers.status == 'succeeded') {
							user.subscription = {
								amount: user.subscription.amount,
								span: user.subscription.span,
								status: 'subscribed',
								customer: user.subscription.customer,
								clientSecrect: user.subscription.clientSecrect,
							};

							user.save();
						}
					} catch (err) {
						console.log('Error code is: ', err.code);
						const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(
							err.raw.payment_intent.id
						);
						console.log('PI retrieved: ', paymentIntentRetrieved.id);
					}
				}
			});
		});

		await Trainer.find().then((trainers) => {
			res.render('home/home', {
				trainers,
			});
		});
	},

	signUpPage: (req, res) => {
		res.render('home/signup');
	},

	signUp: async (req, res) => {
		try {
			let errors = [];

			if (!req.body.name) {
				errors.push({
					message: 'Add name!',
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
				await res.render('home/checkout', {
					errors: errors,
					name: req.body.name,
					email: req.body.email,
				});
			} else {
				const { name, email, password } = req.body;

				User.findOne({ email: email }).then((user) => {
					if (user) {
						errors.push({ message: 'Email already exists. Please log in.' });

						res.render('home/checkout', {
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

								stripe.customers
									.create({
										email: req.body.email,
										source: req.body.stripeToken,
										description: 'Yoga App Payment',
										name: req.body.name,
									})
									.then(async (customer) => {
										const intent = await stripe.setupIntents.create({
											customer: customer.id,
										});

										user.subscription = {
											amount: +req.body.duration,
											span: +req.body.duration == 199 ? 'year' : 'month',
											status: 'trail',
											customer,
											clientSecrect: intent.client_secret,
										};

										/* req.on('data', (data) => {
											console.log(data);
										}); */

										/* res.json({
											client_secret: intent.client_secret,
											name: req.body.name,
										}); */

										/* res.render('home/login', {
											client_secret: intent.client_secret,
											name: req.body.name,
											card: req.body.card,
										}); */

										await user.save().then(async (savedUser) => {
											/* req.flash(
												'success_msg',
												'You are registered. Log in to continue.'
											); */

											res.render('home/welcome', {
												client_secret: intent.client_secret,
												name: req.body.name,
												amount: +req.body.duration,
											});
										});
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

	logInPage: (req, res) => {
		res.render('home/login');
	},

	logIn: (req, res, next) => {
		try {
			if (!req.body.email || !req.body.password) {
				req.flash('error_msg', 'Please fill in all fields.');
				return res.redirect('/login');
			}

			passport.use(
				new Strategy({ usernameField: 'email' }, (email, password, done) => {
					User.findOne({ email: email }, (err, user) => {
						assert.equal(null, err);

						if (!user) return done(null, false, { message: 'user not found.' });

						bcrypt.compare(password, user.password, (err, matched) => {
							assert.equal(null, err);

							if (matched) {
								if (
									dateDifference(user.date) < 1 &&
									user.subscription.status == 'cancelled'
								) {
									req.flash(
										'error_msg',
										'Your trail period has been ended. You can no longer use our services'
									);
									return res.redirect('/login');
								}

								return done(null, user);
							} else
								return done(null, false, {
									message: 'Incorrect password',
								});
						});
					});
				})
			);

			passport.serializeUser((user, done) => {
				done(null, user.id);
			});

			passport.deserializeUser((id, done) => {
				User.findById(id, (err, user) => {
					done(err, user);
				});
			});

			passport.authenticate('local', {
				successRedirect: '/',
				failureRedirect: '/login',
				failureFlash: true,
			})(req, res, next);
		} catch (error) {
			console.log(error);
		}
	},

	logOut: (req, res) => {
		try {
			User.findById(req.user.id).then((user) => {
				req.user = null;
				//req.session = null;
				res.locals.user = undefined;

				req.logout();
				res.redirect('/login');
			});
		} catch (error) {
			console.log(error);
		}
	},

	subscriptionPage: (req, res) => {
		res.render('home/checkout');
	},

	/* payCharges: (req, res) => {
		const stripe = require('stripe')(
			'sk_test_3DZ6KTMhZBauyttWpWGOGUhN00m48c75zE'
		);

		const token = req.body;
		console.log(token);

		(async () => {
			const charge = await stripe.charges.create({
				amount: req.body.duration,
				currency: 'usd',
				source: 'tok_amex',
				description: 'My First Test Charge (created for API docs)',
			});

			if (charge.status == 'succeeded') {
				console.log(charge);
				res.send('Success');
			}
		})();
	}, */

	yogaVideo: (req, res) => {
		res.render('home/video');
	},

	payCharges: (req, res) => {
		User.find().then((users) => {
			users.forEach(async (user) => {
				if (
					user.subscription.customer &&
					user.subscription.status == 'trail' &&
					dateDifference(user.date) < 1
				) {
					const paymentMethods = await stripe.paymentMethods.list({
						customer: user.subscription.customer.id,
						type: 'card',
					});

					try {
						let price =
							user.subscription.amount == 19.99
								? 20.0
								: user.subscription.amount;

						const paymentIntent = await stripe.paymentIntents.create({
							amount: price * 100,
							currency: 'usd',
							customer: user.subscription.customer.id,
							payment_method: paymentMethods.data[0].id,
							off_session: true,
							confirm: true,
						});
					} catch (err) {
						console.log('Error code is: ', err.code);
						const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(
							err.raw.payment_intent.id
						);
						console.log('PI retrieved: ', paymentIntentRetrieved.id);
					}
				}
			});
		});
	},

	latestVideo: (req, res) => {
		res.render('home/latestVideo');
	},

	watchVideos: (req, res) => {
		res.render('home/watchVideos');
	},

	trainerProfile: (req, res) => {
		Trainer.findById(req.params.id).then((trainer) => {
			res.render('home/trainerProfile', {
				trainer,
			});
		});
	},

	manageAccount: (req, res) => {
		User.findById(req.params.id).then((user) => {
			res.render('home/manageAccount', {
				user,
			});
		});
	},

	manageSubscriptionPage: (req, res) => {
		res.render('home/manageSubscription');
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

				user.save().then((savedUser) => {
					return res.redirect('/manageSubscription');
					res.render('home/manageSubscription');
				});
			} else if (user.subscription.status == 'cancelled') {
				user.subscription = {
					amount: user.subscription.amount,
					span: user.subscription.span,
					status: 'trail',
					customer: user.subscription.customer,
					clientSecrect: user.subscription.clientSecrect,
				};

				user.save().then((savedUser) => {
					return res.redirect('/manageSubscription');
					res.render('home/manageSubscription');
				});
			}
		});
	},

	form: (req, res) => {
		res.render('home/form');
	},

	ajaxData: async (req, res) => {
		try {
			let errors = [];

			if (!req.body.name) {
				errors.push({
					message: 'Add name!',
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
				res.json({
					errors: errors,
				});
			} else {
				const { name, email, password, cardHolder, amount, token } = req.body;

				User.findOne({ email: email }).then((user) => {
					if (user) {
						errors.push({ message: 'Email already exists. Please log in.' });

						res.json({
							errors: errors,
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

								stripe.customers
									.create({
										email,
										source: token,
										description: 'Yoga App Payment',
										name,
									})
									.then(async (customer) => {
										const intent = await stripe.setupIntents.create({
											customer: customer.id,
										});

										user.subscription = {
											amount,
											span: amount == 199 ? 'year' : 'month',
											status: 'trail',
											customer,
											clientSecrect: intent.client_secret,
										};

										await user.save().then(async (savedUser) => {
											res.json({
												data: req.body,
												client_secret: intent.client_secret,
												amount,
												name: cardHolder,
											});
										});
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

	welcomePage: (req, res) => {
		res.render('home/welcome');
	},

	updateSubscriptionPlan: (req, res) => {
		User.findById(req.user.id).then(async (user) => {
			user.subscription = {
				amount: '199',
				span: 'year',
				status: user.subscription.status,
				customer: user.subscription.customer,
				clientSecrect: user.subscription.clientSecrect,
			};

			await user.save().then(async (savedUser) => {
				return res.redirect('/manageSubscription');
				res.render('home/manageSubscription');
			});
		});
	},

	yogaTrainers: (req, res) => {
		Trainer.find().then((trainers) => {
			res.render('home/trainers', {
				trainers,
			});
		});
	},

	helpPage: (req, res) => {
		res.render('home/help');
	},

	help: (req, res) => {
		const { title, message } = req.body;

		const msg = new Message({
			user: {
				name: req.user.name,
				email: req.user.email,
				id: req.user.id,
				image: req.user.image,
			},
			title,
			message,
		});

		msg.save().then((savedUser) => {
			res.render('home/help', {
				success: true,
			});
		});
	},

	storeVideos: (req, res) => {
		Trainer.find().then(async (trainers) => {
			trainers.forEach((trn) => {
				for (let i = 0; i < trn.videos.length; i++) {
					const vd = new Video({
						video: {
							name: trn.videos[i].video,
							style: trn.videos[i].style,
							category: trn.category,
							trainer: trn.name,
						},
					});

					vd.save();
				}
			});

			await res.redirect('/');
		});
	},

	stylePage: (req, res) => {
		let videosArray = [];
		let vds = [];

		Video.find()
			.then(async (videos) => {
				for (let i = 0; i < videos.length; i++) {
					vds = videos.filter((vd) => vd.video.style == videos[i].video.style);

					const style = {
						name: videos[i].video.style,
						styles: vds,
					};

					if (vds.length > 0) {
						videosArray.push(style);
						vds = [];
					}
				}
			})
			.then(async (data) => {
				const filteredArr = videosArray.reduce((acc, current) => {
					const x = acc.find((item) => item.name === current.name);
					if (!x) {
						return acc.concat([current]);
					} else {
						return acc;
					}
				}, []);

				await res.render('home/yogaStyles', {
					videosArray: filteredArr,
				});
			});
	},

	styleVideos: (req, res) => {
		if (req.params.style == 'all') {
			Video.find().then((videos) => {
				res.render('home/styleVideos', {
					videos,
					title: 'All Videos',
				});
			});
		} else {
			Video.find({
				'video.style': req.params.style,
			}).then((videos) => {
				res.render('home/styleVideos', {
					videos,
					title: videos[0].video.style,
				});
			});
		}
	},

	browsePage: (req, res) => {
		let videosArray = [];
		let vds = [];

		Video.find()
			.then(async (videos) => {
				for (let i = 0; i < videos.length; i++) {
					vds = videos.filter((vd) => vd.video.style == videos[i].video.style);

					const style = {
						name: videos[i].video.style,
						styles: vds,
					};

					if (vds.length > 0) {
						videosArray.push(style);
						vds = [];
					}
				}
			})
			.then(async (data) => {
				const filteredArr = videosArray.reduce((acc, current) => {
					const x = acc.find((item) => item.name === current.name);
					if (!x) {
						return acc.concat([current]);
					} else {
						return acc;
					}
				}, []);

				await Trainer.find().then((trainers) => {
					res.render('home/latestVideo', {
						videosArray: filteredArr,
						trainers,
					});
				});
			});
	},

	searchPage: (req, res) => {
		res.render('home/search');
	},

	search: (req, res) => {},
};
