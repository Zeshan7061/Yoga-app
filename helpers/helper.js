module.exports = {
	selectValue: (postStatus, value) =>
		postStatus === value ? 'selected' : false,

	adminAccess: (user, res) => {
		if (!user.roles.includes('admin')) {
			return res.redirect('/admin');
		}

		return true;
	},
};
