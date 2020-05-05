const bcrypt = require('bcryptjs');
const { Strategy } = require('passport-local');
const passport = require('passport');
const User = require('../models/User');
const assert = require('assert');

module.exports = {
	home: (req, res) => {
		res.render('home/home');
	},

	signUpPage: (req, res) => {
		res.render('home/signup');
	},

	signUp: async (req, res) => {
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
				await res.render('home/signup', {
					errors: errors,
					name: req.body.name,
					email: req.body.email,
				});
			} else {
				const { name, email, password } = req.body;

				User.findOne({ email: email }).then((user) => {
					if (user) {
						errors.push({ message: 'Email already exists. Please log in.' });
						res.render('home/signup', {
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
									req.flash(
										'success_msg',
										'You are registered. Log in to continue.'
									);
									res.redirect('/login');
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
				successRedirect: '/home',
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

	payCharges: (req, res) => {
		const stripe = require('stripe')(
			'sk_test_3DZ6KTMhZBauyttWpWGOGUhN00m48c75zE'
		);

		const token = req.body;
		console.log(token);

		(async () => {
			const charge = await stripe.charges.create({
				amount: 2000,
				currency: 'usd',
				source: 'tok_amex',
				description: 'My First Test Charge (created for API docs)',
			});

			if (charge.status == 'succeeded') {
				res.send('Success');
			}
		})();
	},
};
