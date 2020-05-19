const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const methodOverride = require('method-override');
const ejs = require('express-ejs-layouts');
const path = require('path');
const dbConnection = require('./config/db');
const dotenv = require('dotenv');

const app = express();

const home = require('./routes/home');
const admin = require('./routes/admin');
const categories = require('./routes/category');

const { selectValue } = require('./helpers/helper');

dotenv.config({ path: './config/config.env' });

app
	.use(express.static(path.join(__dirname, 'public')))
	.use(express.json())
	.use(express.urlencoded({ extended: false }));

dbConnection();

app.use(ejs);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/index');

app.use(cors()).use(flash());
app.use(
	session({
		secret: 'yogaapp123',
		resave: false,
		saveUninitialized: true,
	})
);

app.use(passport.initialize()).use(passport.session());
app.use(methodOverride('_method'));
app.use(fileUpload());

app.use((req, res, next) => {
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	res.locals.selected = selectValue;
	res.locals.session = req.session;
	if (req.user) res.locals.user = req.user;
	else res.locals.user = undefined;

	next();
});

app.use('/', home);
app.use('/admin', admin);
app.use('/admin/categories', categories);

const PORT = process.env.PORT;
app.listen(PORT, console.log(`Server running at port: ${PORT}`));
