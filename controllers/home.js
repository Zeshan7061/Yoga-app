const bcrypt = require('bcryptjs');
const { Strategy } = require('passport-local');
const passport = require('passport');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const assert = require('assert');
const { dateDifference } = require('../helpers/helper');
const keys = require('../config/keys');
const stripe = require('stripe')(keys.stripeSecretKey);
const Message = require('../models/Message');
const Video = require('../models/Video');
const randomString = require('randomstring');
const Style = require('../models/Style');

module.exports = {
	home: (req, res) => {
		Trainer.find().then((trainers) => {
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

				User.findOne({
					email: email,
				}).then((user) => {
					if (user) {
						errors.push({
							message: 'Email already exists. Please log in.',
						});

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
		if (req.user == undefined) res.render('home/login');
		else res.redirect('/');
	},

	logIn: (req, res, next) => {
		try {
			if (!req.body.email || !req.body.password) {
				req.flash('error_msg', 'Please fill in all fields.');
				return res.redirect('/login');
			}

			passport.use(
				new Strategy(
					{
						usernameField: 'email',
					},
					(email, password, done) => {
						User.findOne(
							{
								email: email,
							},
							(err, user) => {
								assert.equal(null, err);

								if (!user)
									return done(null, false, {
										message: 'user not found.',
									});

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
							}
						);
					}
				)
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
		Video.find()
			.sort({
				date: -1,
			})
			.limit(10)
			.then((videos) => {
				res.render('home/watchVideos', {
					videos,
				});
			});
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
					subscriptionID: user.subscription.subscriptionID,
				};

				const subscription = await stripe.subscriptions.update(
					user.subscription.subscriptionID,
					{
						pause_collection: {
							behavior: 'mark_uncollectible',
						},
					}
				);

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
					subscriptionID: user.subscription.subscriptionID,
				};

				const subscription = await stripe.subscriptions.update(
					user.subscription.subscriptionID,
					{
						pause_collection: '',
					}
				);

				user.save().then((savedUser) => {
					return res.redirect('/manageSubscription');
					res.render('home/manageSubscription');
				});
			}
		});
	},

	form: (req, res) => {
		if (req.user == undefined) res.render('home/form');
		else res.redirect('/');
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

				User.findOne({
					email: email,
				}).then((user) => {
					if (user) {
						errors.push({
							message: 'Email already exists. Please log in.',
						});

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
			if (user.subscription.span == 'month') {
				user.subscription = {
					amount: '199',
					span: 'year',
					status: user.subscription.status,
					customer: user.subscription.customer,
					clientSecrect: user.subscription.clientSecrect,
					subscriptionID: user.subscription.subscriptionID,
				};

				const subscription = await stripe.subscriptions.retrieve(
					user.subscription.subscriptionID
				);

				const sub = await stripe.subscriptions.update(
					user.subscription.subscriptionID,
					{
						prorate: false,
						items: [
							{
								id: subscription.items.data[0].id,
								price: process.env.YEARLY_PLAN,
							},
						],
					}
				);
			} else if (user.subscription.span == 'year') {
				user.subscription = {
					amount: '19.99',
					span: 'month',
					status: user.subscription.status,
					customer: user.subscription.customer,
					clientSecrect: user.subscription.clientSecrect,
					subscriptionID: user.subscription.subscriptionID,
				};

				const subscription = await stripe.subscriptions.retrieve(
					user.subscription.subscriptionID
				);

				const sub = await stripe.subscriptions.update(
					user.subscription.subscriptionID,
					{
						prorate: false,
						items: [
							{
								id: subscription.items.data[0].id,
								price: process.env.MONTHLY_PLAN,
							},
						],
					}
				);
			}

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
						title: trn.videos[i].title,
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

	styleVideos: async (req, res) => {
		if (req.params.style == 'all') {
			Video.find().then((videos) => {
				res.render('home/allVideos', {
					videos,
					title: 'All Videos',
				});
			});
		} else {
			const styles = await Style.find();

			Video.find({
				'video.style': req.params.style,
			}).then((videos) => {
				res.render('home/styleVideos', {
					videos,
					styles,
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

	search: (req, res) => {
		const value = req.body.search;
		const re = new RegExp(value, 'gi');

		if (value.length > 0) {
			Trainer.find({
				name: re,
			}).then((trainers) => {
				Video.find({
					title: re,
				}).then((videos) => {
					res.json({
						success: true,
						trainers,
						videos,
						user: req.user,
					});
				});
			});
		} else {
			res.json({
				success: false,
				trainers: [],
				videos: [],
				user: req.user,
			});
		}
	},

	makeProduct: async (req, res) => {
		const customer = 'cus_HNfMRHibov5hPB';

		/* const subscription = await stripe.subscriptions.retrieve(
			'sub_HP5G1vuBw7OdUG'
		);

		const planChanged = await stripe.subscriptions.update(
			'sub_HP5G1vuBw7OdUG',
			{
				cancel_at_period_end: false,
				proration_behavior: 'none',
				items: [
					{
						id: subscription.items.data[0].id,
						price: 'plan_HP4nRBOpr0iqBU',
					},
				],
			}
		);

		console.log(planChanged); */

		/* stripe.subscriptions.del('sub_HP5G1vuBw7OdUG', function (
			err,
			confirmation
		) {
			if (err) throw err;
			console.log(confirmation);
			res.redirect('/');
		}); */

		const subscription = await stripe.subscriptions.retrieve(
			'sub_HQYSKIqk35Sg3c'
		);

		const sub = await stripe.subscriptions.update('sub_HQYSKIqk35Sg3c', {
			proration_behavior: 'none',
			items: [
				{
					id: subscription.items.data[0].id,
					price: 'plan_HP4nRBOpr0iqBU',
				},
			],
		});

		res.redirect('/');
	},

	newCustomer: (req, res) => {
		if (req.params.form == 'subscription') {
			try {
				const {
					name,
					email,
					password,
					confirmPassword,
					username,
					duration,
					stripeToken,
				} = req.body;
				let errors = [];

				if (!name) {
					errors.push({
						message: 'Add name!',
					});
				}

				if (!email) {
					errors.push({
						message: 'Add an email!',
					});
				}

				if (!password) {
					errors.push({
						message: 'Add password!',
					});
				}

				if (!confirmPassword) {
					errors.push({
						message: 'Add confirm Password!',
					});
				}

				if (password !== confirmPassword) {
					errors.push({
						message: "Passwords don't match.",
					});
				}

				if (errors.length > 0) {
					res.render('home/form', {
						errors,
						name,
						email,
						username: username,
					});
				} else {
					User.findOne({
						email: email,
					}).then((user) => {
						if (user) {
							errors.push({
								message: 'Email already exists. Please log in.',
							});

							res.render('home/form', {
								errors,
								name,
								email,
								username: username,
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
											name: username,
											email,
											source: stripeToken,
											description: 'Yoga App Payment',
										})
										.then(async (customer) => {
											const intent = await stripe.setupIntents.create({
												customer: customer.id,
											});

											let plan =
												duration == 199
													? process.env.YEARLY_PLAN
													: process.env.MONTHLY_PLAN;

											stripe.subscriptions.create(
												{
													customer: customer.id,
													items: [
														{
															price: plan,
														},
													],
													trial_from_plan: true,
												},
												async function (err, subscription) {
													if (err) throw err;

													user.subscription = {
														duration,
														span: duration == 199 ? 'year' : 'month',
														status: 'trail',
														customer,
														clientSecrect: intent.client_secret,
														subscriptionID: subscription.id,
													};

													await user.save().then((savedUser) => {
														res.render('home/welcome', {
															duration,
														});
													});
												}
											);
										});
								});
							});
						}
					});
				}
			} catch (error) {
				console.log(error);
			}
		} else if (req.params.form == 'gift') {
			try {
				const {
					client_email,
					recipient_name,
					recipient_email,
					message,
					username,
					duration,
					stripeToken,
				} = req.body;
				let errors = [];

				let password = randomString.generate(8);

				if (!client_email) {
					errors.push({
						message: 'Add an email!',
					});
				}

				if (!recipient_name) {
					errors.push({
						message: 'Add recipient name!',
					});
				}

				if (!recipient_email) {
					errors.push({
						message: 'Add recipient email!',
					});
				}

				if (!message) {
					errors.push({
						message: 'Add gift message!',
					});
				}

				/* if (!date) {
					errors.push({
						message: 'Add delivery date!',
					});
				} */

				if (errors.length > 0) {
					res.render('home/form', {
						errors,
						client_email,
						recipient_name,
						recipient_email,
						message,
						username,
						gift: true,
					});
				} else {
					User.findOne({
						email: recipient_email,
					}).then((user) => {
						if (user) {
							errors.push({
								message: 'Email already exists. Please log in.',
							});

							res.render('home/form', {
								errors,
								client_email,
								recipient_name,
								recipient_email,
								message,
								username,
								gift: true,
							});
						} else {
							const user = new User({
								name: recipient_name,
								email: recipient_email,
								password,
							});

							bcrypt.genSalt(10, (err, salt) => {
								bcrypt.hash(user.password, salt, (err, hash) => {
									user.password = hash;

									stripe.customers
										.create({
											name: username,
											email: client_email,
											source: stripeToken,
											description: 'Yoga App Payment',
										})
										.then(async (customer) => {
											const intent = await stripe.setupIntents.create({
												customer: customer.id,
											});

											let plan =
												duration == 199
													? process.env.YEARLY_PLAN
													: process.env.MONTHLY_PLAN;

											stripe.subscriptions.create(
												{
													customer: customer.id,
													items: [
														{
															price: plan,
														},
													],
													trial_from_plan: true,
												},
												async function (err, subscription) {
													if (err) throw err;

													user.subscription = {
														duration,
														span: duration == 199 ? 'year' : 'month',
														status: 'trail',
														customer,
														clientSecrect: intent.client_secret,
														subscriptionID: subscription.id,
													};

													await user.save().then((savedUser) => {
														res.render('home/gift', {
															duration,
															password,
														});
													});
												}
											);
										});
								});
							});
						}
					});
				}
			} catch (error) {
				console.log(error);
			}
		}
	},

	giftSubscriptionPage: (req, res) => {
		res.render('home/giftForm');
	},

	giftSubscription: (req, res) => {
		try {
			const {
				email,
				recipient_email,
				message,
				date,
				username,
				duration,
				stripeToken,
			} = req.body;
			let errors = [];

			let password = randomString.generate(8);

			if (!email) {
				errors.push({
					message: 'Add an email!',
				});
			}

			if (!recipient_email) {
				errors.push({
					message: 'Add recipient email!',
				});
			}

			if (!message) {
				errors.push({
					message: 'Add gift message!',
				});
			}

			if (!date) {
				errors.push({
					message: 'Add delivery date!',
				});
			}

			if (errors.length > 0) {
				res.render('home/giftForm', {
					errors,
					name,
					email,
					recipient_email,
					message,
					date,
					username,
				});
			} else {
				User.findOne({
					email: recipient_email,
				}).then((user) => {
					if (user) {
						errors.push({
							message: 'Email already exists. Please log in.',
						});

						res.render('home/giftForm', {
							errors,
							name,
							email,
							recipient_email,
							message,
							date,
							username,
						});
					} else {
						const user = new User({
							name,
							email: recipient_email,
							password,
						});

						bcrypt.genSalt(10, (err, salt) => {
							bcrypt.hash(user.password, salt, (err, hash) => {
								user.password = hash;

								stripe.customers
									.create({
										name: username,
										email,
										source: stripeToken,
										description: 'Yoga App Payment',
									})
									.then(async (customer) => {
										const intent = await stripe.setupIntents.create({
											customer: customer.id,
										});

										let plan =
											duration == 199
												? process.env.YEARLY_PLAN
												: process.env.MONTHLY_PLAN;

										stripe.subscriptions.create(
											{
												customer: customer.id,
												items: [
													{
														price: plan,
													},
												],
												trial_from_plan: true,
											},
											async function (err, subscription) {
												if (err) throw err;

												user.subscription = {
													duration,
													span: duration == 199 ? 'year' : 'month',
													status: 'trail',
													customer,
													clientSecrect: intent.client_secret,
													subscriptionID: subscription.id,
												};

												await user.save().then((savedUser) => {
													res.render('home/welcome', {
														duration,
														password,
													});
												});
											}
										);
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

	cancelUserSubscription: async (req, res) => {
		const user = await User.findById(req.user.id);

		stripe.subscriptions.del(
			user.subscription.subscriptionID,
			async (err, confirmation) => {
				if (err) console.log(err);

				user.subscription = {};

				await user.save();

				req.flash('success_msg', 'Your subscription has been cancelled.');
				res.redirect('/manageSubscription');
			}
		);
	},

	newSubscriptionPage: (req, res) => {
		if (req.user && Object.keys(req.user.subscription) == 0)
			return res.render('home/buySubscription');

		res.redirect('/login');
	},

	newSubscription: async (req, res) => {
		const { username, stripeToken, duration } = req.body;
		const email = req.user.email;

		const customer = await stripe.customers.create({
			name: username,
			email,
			source: stripeToken,
			description: 'Yoga App Payment',
		});

		const intent = await stripe.setupIntents.create({
			customer: customer.id,
		});

		let plan =
			duration == 199 ? process.env.YEARLY_PLAN : process.env.MONTHLY_PLAN;

		stripe.subscriptions.create(
			{
				customer: customer.id,
				items: [
					{
						price: plan,
					},
				],
			},
			async (err, subscription) => {
				if (err) throw err;

				const user = await User.findById(req.user.id);

				user.subscription = {
					duration,
					span: duration == 199 ? 'year' : 'month',
					status: 'subscribed',
					customer,
					clientSecrect: intent.client_secret,
					subscriptionID: subscription.id,
				};

				user.date = Date.now();

				await user.save();

				req.flash(
					'success_msg',
					`Your subscription of $${duration} / ${
						duration == 199 ? 'year' : 'month'
					} has been activated.`
				);
				res.redirect('/manageSubscription');
			}
		);
	},

	showTerms: (req, res) => {
		res.render('home/terms');
	},

	showCookies: (req, res) => {
		res.render('home/cookies');
	},
};
