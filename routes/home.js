const router = require('express').Router();
const { auth } = require('../helpers/auth');
const {
	home,
	logInPage,
	logIn,
	logOut,
	signUpPage,
	signUp,
	subscriptionPage,
	payCharges,
	yogaVideo,
	latestVideo,
	watchVideos,
	trainerProfile,
	manageAccount,
	manageSubscriptionPage,
	cancelSubscription,
} = require('../controllers/home');

router.all('/*', (req, res, next) => {
	req.app.set('layout', 'layouts/home');
	next();
});

router.route('/').get(home);

router.get('/charge', payCharges);

router.get('/subscription', subscriptionPage);

router.post('/charge', payCharges);

router.route('/register/:url?').get(signUpPage).post(signUp);

router.route('/login').get(logInPage).post(logIn);

router.get('/logout', logOut);

router.get('/yogaVideo', yogaVideo);

router.get('/latestVideo', latestVideo);

router.get('/watchVideos', watchVideos);

router.get('/trainerProfile/:id', trainerProfile);

router.get('/manageAccount/:id', manageAccount);

router.get('/manageSubscription', manageSubscriptionPage);

router.get('/updateSubscription', cancelSubscription);

module.exports = router;
