const User = require('../models/User');
const fs = require('fs');
const bcrypt = require('bcryptjs');

module.exports = {
	dashborad: (req, res) => {
		res.render('admin/index');
	},

	fetchUsers: (req, res) => {
		User.find().then((users) => {
			res.render('admin/users', {
				users,
			});
		});
	},

	addUser: (req, res) => {
		res.render('admin/addUser');
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
};
