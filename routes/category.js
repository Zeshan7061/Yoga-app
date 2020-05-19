const router = require('express').Router();
const {
	fetchAllcategories,
	createCategory,
	editCategory,
	updateCategory,
	deleteCategory,
} = require('../controllers/Category');

router.get('/', fetchAllcategories);

router.post('/create', createCategory);

router.route('/edit/:id').get(editCategory).put(updateCategory);

router.delete('/delete/:id', deleteCategory);

module.exports = router;
