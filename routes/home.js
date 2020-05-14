const router = require('express').Router();
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
} = require('../controllers/home');

router.all('/*', (req, res, next) => {
	req.app.set('layout', 'layouts/home');
	next();
});

router.get('/home', home);

router.get('/', (req, res) => {
	res.render('home/home');
});

router.get('/subscription', subscriptionPage);

router.post('/charge', payCharges);

router.route('/register/:url?').get(signUpPage).post(signUp);

router.route('/login').get(logInPage).post(logIn);

router.get('/logout', logOut);

router.get('/yogaVideo', yogaVideo);

module.exports = router;
