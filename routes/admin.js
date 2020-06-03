const router = require('express').Router();
const {
	dashborad,
	fetchUsers,
	addUser,
	newUser,
	deleteUser,
	editProfile,
	updateProfile,
	changePasswordPage,
	matchCurrentPassword,
	updatePassword,
	updateStatus,
	profilePgae,
	subscriptionPage,
	fetchTrainers,
	createTrainer,
	editTrainer,
	updateTrainer,
	deleteTrainer,
	uploadTrainerVideoPage,
	uploadTrainerVideo,
	showTrainerVideos,
	deleteTrainerVideo,
	cancelSubscription,
	managePaymentDetails,
	managePaymentPage,
	yogaVideos,
	customerQueries,
	removeQuery,
} = require('../controllers/admin');
const { auth } = require('../helpers/auth');

router.all('/*', auth, (req, res, next) => {
	req.app.set('layout', 'layouts/admin');
	next();
});

router.get('/', dashborad);

router.get('/users', fetchUsers);

router.get('/addUser', addUser);

router.post('/newUser', newUser);

router.get('/users/:status/:id', updateStatus);

router.delete('/users/remove/:id', deleteUser);

router.get('/user/profile/:id', profilePgae);

router.get('/user/subscription', subscriptionPage);

router.post('/user/profile/edit', editProfile);

router.put('/user/profile/update/:id', updateProfile);

router
	.route('/user/password')
	.get(changePasswordPage)
	.post(matchCurrentPassword);

router.post('/user/setPassword', updatePassword);

router.get('/trainers', fetchTrainers);

router.post('/createTrainer', createTrainer);

router.get('/editTrainer/:id', editTrainer);

router.put('/updateTrainer/:id', updateTrainer);

router.delete('/removeTrainer/:id', deleteTrainer);

router
	.route('/uploadVideo')
	.get(uploadTrainerVideoPage)
	.post(uploadTrainerVideo);

router.get('/trainerVideos/:id?', showTrainerVideos);

router.delete('/trainer/deleteVideo/:id/:video', deleteTrainerVideo);

router.get('/user/cancelSubscription', cancelSubscription);

router.get('/user/managePayment', managePaymentPage);

router.post('/user/updatePayment', managePaymentDetails);

router.get('/user/yogaVideos', yogaVideos);

router.get('/queries', customerQueries);

router.get('/delete/:id', removeQuery);

module.exports = router;
