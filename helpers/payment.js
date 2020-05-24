const stripe = require('stripe')('sk_test_qiSodQ7eLNhPSe53o3m0HZP700lxi1sV0w');

function payCharges(req, res, user) {
	stripe.customers
		.create({
			email: req.body.email,
			source: req.body.stripeToken,
		})
		.then(async (customer) => {
			console.log(customer);
			user.customer = customer;

			/* const charges = await stripe.charges.create({
				amount: Math.round(req.body.duration * 100),
				description: 'Yoga App',
				currency: 'usd',
				customer: customer.id,
			});

			console.log(charges); */
		});

	/* stripe.customers.retrieve('cus_HJcoXSOkukWluO', function (err, customer) {
		if (err) throw err;

		const charges = await stripe.charges.create({
				amount: Math.round(req.body.duration * 100),
				description: 'Yoga App',
				currency: 'usd',
				customer: customer.id,
			});

			console.log(charges);
	}); */
}

module.exports = payCharges;

/* const token = req.body;
	console.log(token);

	(async () => {
	onst charge = await stripe.charges.create({
		amount: 20,
		currency: 'usd',
		source: 'tok_amex',
		description: 'My First Test Charge (created for API docs)',
	});

	if (charge.status == 'succeeded') {
		console.log(charge);
		res.send('Success');
	}
})(); */
