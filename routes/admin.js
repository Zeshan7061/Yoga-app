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
} = require('../controllers/admin');
const auth = require('../helpers/auth');

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

router.post('/user/profile/edit', editProfile);

router.put('/user/profile/update/:id', updateProfile);

module.exports = router;
