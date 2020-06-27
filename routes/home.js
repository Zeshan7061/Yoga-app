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
	yogaTrainers,
	trainerProfile,
	manageAccount,
	manageSubscriptionPage,
	cancelSubscription,
	updateSubscriptionPlan,
	form,
	ajaxData,
	welcomePage,
	helpPage,
	help,
	storeVideos,
	stylePage,
	styleVideos,
	browsePage,
	searchPage,
	search,
	makeProduct,
	newCustomer,
	giftSubscriptionPage,
	giftSubscription,
	newSubscriptionPage,
	newSubscription,
	cancelUserSubscription,
	showTerms,
	showCookies,
} = require('../controllers/home');

router.all('/*', (req, res, next) => {
	req.app.set('layout', 'layouts/home');
	next();
});

router.route('/').get(home);

//router.get('/charge', payCharges);
//router.post('/charge', payCharges);

router.get('/subscription', subscriptionPage);

router.route('/register/:url?').get(signUpPage).post(signUp);

router.route('/login').get(logInPage).post(logIn);

router.get('/logout', logOut);

router.get('/yogaVideo', yogaVideo);

router.get('/latestVideo', latestVideo);

router.get('/watchVideos', watchVideos);

router.get('/yogaTrainers', yogaTrainers);

router.get('/trainerProfile/:id', trainerProfile);

router.get('/manageAccount/:id', manageAccount);

router.get('/manageSubscription', manageSubscriptionPage);

router.get('/updateSubscription', cancelUserSubscription);

router.get('/updatePlan', updateSubscriptionPlan);

router.route('/signup/:form?').get(form).post(newCustomer);

router.get('/welcome', welcomePage);

router.route('/help').get(helpPage).post(help);

router.get('/styles', stylePage);

router.get('/yogaStyle/:style', styleVideos);

router.get('/browse', browsePage);

router.route('/search/:value?').get(searchPage).post(search);

//router.get('/makeProduct', makeProduct);

//router.get('/storeVideos', storeVideos);

router
	.route('/giftSubscription')
	.get(giftSubscriptionPage)
	.post(giftSubscription);

router.route('/buySubscription').get(newSubscriptionPage).post(newSubscription);

router.get('/terms', showTerms);

router.get('/cookies', showCookies);

module.exports = router;
