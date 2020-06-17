$(document).ready(() => {
	localStorage.removeItem('amount');

	document.querySelector('.sub').addEventListener('click', () => {
		document.querySelector('.subscriptions').classList.toggle('toggleDisplay');
	});

	const stripe = Stripe('pk_test_cEXNadDQNqp5JS18q7iIlAUG00AxGmzxXG');
	const elements = stripe.elements();
	const form = $('#payment-form');
	const style = {
		base: {
			color: '#32325d',
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: '#aab7c4',
			},
		},
		invalid: {
			color: '#fa755a',
			iconColor: '#fa755a',
		},
	};

	var card = elements.create('card', { style: style });
	card.mount('#card-element');
	const loadingView = document.querySelector('.loading');

	const Subscriptions = document.querySelector('.subscriptions');
	const subs = document.querySelectorAll('.subscriptions p');
	const subInfo = document.querySelector('#sub-info');
	const giftInfo = document.querySelector('.gift-info');
	const heading = document.querySelector('.heading');
	const subscriptionFields = document.querySelector('.subscription-fields');
	const giftFields = document.querySelector('.gift-fields');
	const account = document.querySelector('.account');
	const submitBtn = document.getElementById('submitBtn');
	const Subinputs = document.querySelectorAll('.subscription-fields input');
	const giftInputs = document.querySelectorAll('.gift-fields input');
	let flag = false;

	giftInputs.forEach((g) => {
		g.disabled = true;
	});

	subs.forEach((s) => {
		s.addEventListener('click', (e) => {
			e.preventDefault();

			Subinputs.forEach((i) => {
				i.disabled = true;
			});

			giftInputs.forEach((g) => {
				g.disabled = false;
			});

			flag = true;

			subscriptionFields.style.display = 'none';
			giftFields.style.display = 'block';

			heading.innerText = 'Gift Details';
			account.style.display = 'none';

			elems.forEach((e) => {
				e.style.background = 'white';
				e.style.color = 'black';
			});

			Subscriptions.style.display = 'none';

			const val = event.target.getAttribute('data-amount');
			const inputDuration = document.getElementById('duration');
			inputDuration.value = +val;

			if (val == 199) {
				subInfo.innerText = '1-year subscription for $199';
			} else if (val == 19.99) {
				subInfo.innerText = '1-month subscription for $19.99';
			}

			giftInfo.style.display = 'block';
			giftInfo.style.background = 'black';
			giftInfo.style.color = 'white';

			document.querySelector('.totalValue').innerHTML = '$' + val;
			submitBtn.innerText = 'Complete Purchase';
		});
	});

	giftInfo.addEventListener('click', (e) => {
		e.preventDefault();

		Subscriptions.style.display = 'block';
		giftInfo.style.display = 'none';
	});

	const elems = document.querySelectorAll('.period');
	elems.forEach((el) => {
		el.addEventListener('click', (event) => {
			Subinputs.forEach((i) => {
				i.disabled = false;
			});

			giftInputs.forEach((g) => {
				g.disabled = true;
			});

			flag = false;

			const val = event.target.getAttribute('data-duration-value');
			const inputDuration = document.getElementById('duration');
			inputDuration.value = +val;

			elems.forEach((e) => {
				e.style.background = 'white';
				e.style.color = 'black';
			});

			el.style.background = 'black';
			el.style.color = 'white';

			heading.innerText = 'Start your 7-day free trial';
			account.style.display = 'block';

			subscriptionFields.style.display = 'block';
			giftFields.style.display = 'none';

			giftInfo.style.display = 'none';
			Subscriptions.style.display = 'block';

			document.querySelector('.totalValue').innerHTML = '$' + val;
			submitBtn.innerText = 'Start free trail';
		});
	});

	if (document.getElementById('password')) {
		document.getElementById('password').addEventListener('input', (e) => {
			if (e.target.value.length > 0) {
				document.getElementById('confirmPassword').style.display = 'block';
			} else {
				document.getElementById('confirmPassword').style.display = 'none';
			}
		});
	}

	form.on('submit', (e) => {
		e.preventDefault();

		if (!e.target.duration.value) {
			return window.alert('Please select one plan');
		}

		form.disabled = true;

		stripe.createToken(card).then(function (result) {
			if (result.error) {
				var errorElement = document.getElementById('card-errors');
				errorElement.textContent = result.error.message;
			} else {
				loadingView.style.display = 'block';

				let myGreeting = setTimeout(function () {
					loadingView.style.display = 'none';
				}, 5000);

				stripeTokenHandler(result.token);
			}
		});

		function stripeTokenHandler(token) {
			var form = document.getElementById('payment-form');
			var hiddenInput = document.createElement('input');
			hiddenInput.setAttribute('type', 'hidden');
			hiddenInput.setAttribute('name', 'stripeToken');
			hiddenInput.setAttribute('value', token.id);
			form.appendChild(hiddenInput);

			flag
				? form.setAttribute('action', '/signup/gift')
				: form.setAttribute('action', '/signup/subscription');

			form.submit();
		}
	});
});
