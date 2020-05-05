const app = require('express')();
// `source` is obtained with Stripe.js; see https://stripe.com/docs/payments/accept-a-payment-charges#web-create-token

app.post('/charge', (req, res) => {
	const stripe = require('stripe')(
		'sk_test_3DZ6KTMhZBauyttWpWGOGUhN00m48c75zE'
	);

	const token = req.body.stripeToken;

	(async () => {
		const charge = await stripe.charges.create({
			amount: 2000,
			currency: 'usd',
			source: 'tok_amex',
			description: 'My First Test Charge (created for API docs)',
		});

		if (charge.status == 'succeeded') {
			res.send('Success');
		}
	})();
});
