const router = require('express').Router();
const {
	dashborad,
	fetchUsers,
	addUser,
	newUser,
	deleteUser,
	editProfile,
	updateProfile,
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

module.exports = router;
