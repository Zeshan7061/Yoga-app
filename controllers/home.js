const bcrypt = require('bcryptjs');
const { Strategy } = require('passport-local');
const passport = require('passport');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const assert = require('assert');
const payment = require('../helpers/payment');
const { dateDifference } = require('../helpers/helper');
const stripe = require('stripe')('sk_test_3DZ6KTMhZBauyttWpWGOGUhN00m48c75zE');

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
									})
									.then(async (customer) => {
										const intent = await stripe.setupIntents.create({
											customer: customer.id,
										});

										/* return res.json({
											success: true,
											client_secret: intent.client_secret,
										}); */

										user.subscription = {
											amount: +req.body.duration,
											span: +req.body.duration == 199 ? 'year' : 'month',
											status: 'trail',
											customer,
											clientSecrect: intent.client_secret,
										};

										await user.save().then(async (savedUser) => {
											req.flash(
												'success_msg',
												'You are registered. Log in to continue.'
											);
											res.redirect('/login');
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

	payCharges: async (req, res) => {
		User.find().then((users) => {
			users.forEach(async (user) => {
				if (user.subscription) {
					console.log(user.subscription.customer.id);

					const paymentMethods = await stripe.paymentMethods.list({
						customer: user.subscription.customer,
						type: 'card',
					});

					console.log(paymentMethods);

					try {
						const paymentIntent = await stripe.paymentIntents.create({
							amount: user.subscription.amount,
							currency: 'usd',
							customer: user.subscription.customer.id,
							payment_method: paymentMethods.data[0].id,
							off_session: true,
							confirm: true,
						});

						console.log(paymentIntent);
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
};
