const moment = require('moment');

module.exports = {
	selectValue: (postStatus, value) =>
		postStatus === value ? 'selected' : false,

	adminAccess: (user, res) => {
		if (!user.roles.includes('admin')) {
			return res.redirect('/admin');
		}

		return true;
	},

	dateDifference: (subscriptionDate) => {
		const startDate = new Date(subscriptionDate).getTime();

		const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
		const endDate = startDate + weekInMilliseconds;

		let daysLeft = 0;

		if (new Date().getTime() > startDate) {
			daysLeft = (endDate - new Date().getTime()) / 86400000;
		} else {
			daysLeft = (endDate - startDate) / 86400000;
		}

		if (daysLeft >= 0) return Math.round(daysLeft);
	},

	momentHelper: (date) => moment(date),
};
