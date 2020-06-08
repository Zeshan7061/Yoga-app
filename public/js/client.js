$(document).ready(() => {
	localStorage.removeItem('amount');

	document.querySelector('.sub').addEventListener('click', () => {
		document.querySelector('.subscriptions').classList.toggle('toggleDisplay');
	});

	const stripe = Stripe('pk_test_cEXNadDQNqp5JS18q7iIlAUG00AxGmzxXG');
	const elements = stripe.elements();
	const form = $('#payment-form');
	const subscriptionForm = document.querySelector('.payment');
	const giftForm = document.getElementById('#gift');
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
	const loadingView = document.querySelector('.load');

	const subs = document.querySelectorAll('.subscriptions p');
	const giftInfo = document.querySelector('.gift-info');

	subs.forEach((s) => {
		s.addEventListener('click', (e) => {
			subscriptionForm.style.display = 'none';
			giftForm.style.display = 'block';
		});
	});

	const elems = document.querySelectorAll('.period');
	elems.forEach((el) => {
		el.addEventListener('click', (event) => {
			const val = event.target.getAttribute('data-duration-value');
			const inputDuration = document.getElementById('duration');
			inputDuration.value = +val;

			elems.forEach((e) => {
				e.style.background = 'white';
				e.style.color = 'black';
			});

			el.style.background = 'black';
			el.style.color = 'white';
			document.querySelector('.totalValue').innerHTML = '$' + val;
		});
	});

	document.getElementById('password').addEventListener('input', (e) => {
		if (e.target.value.length > 0) {
			document.getElementById('confirmPassword').style.display = 'block';
		} else {
			document.getElementById('confirmPassword').style.display = 'none';
		}
	});

	form.on('submit', (e) => {
		e.preventDefault();

		if (!event.target.duration.value) {
			return window.alert('Please select one plan');
		}

		const loadingStyle = {
			position: 'absolute',
			top: '50%',
			left: '50%',
			transform: 'translate(-50%,-50%)',
			zIndex: 100000,
			display: 'block',
		};

		window.scrollTo(0, 0);
		$('.load').css(loadingStyle);
		document.body.style.overflow = 'hidden';

		let myGreeting = setTimeout(function () {
			loadingView.style.display = 'none';
			document.body.style.overflow = 'auto';
		}, 5000);

		form.disabled = true;

		const name = e.target.name.value;
		const email = e.target.email.value;
		const password = e.target.password.value;
		const confirmPassword = e.target.confirmPassword.value;
		const cardHolder = e.target.username.value;
		const amount = e.target.duration.value;

		let token = 'token';
		let data = {};

		function tokenCreation() {
			stripe.createToken(card).then(function (result) {
				if (result.error) {
					var errorElement = document.getElementById('card-errors');
					errorElement.textContent = result.error.message;
				} else {
					token = result.token.id;

					data = {
						name,
						email,
						password,
						confirmPassword,
						cardHolder,
						token,
						amount,
					};
				}
				ajaxRequest();
			});
		}

		function ajaxRequest() {
			$.ajax({
				method: 'POST',
				url: '/signup',
				data: data,

				success: (data) => {
					if (data.errors) {
						for (let i = 0; i < data.errors.length; i++) {
							let div = document.createElement('div');
							div.className = 'error';
							div.innerHTML = data.errors[i].message;
							document.querySelector('.errors').appendChild(div);
						}
						window.scrollTo(0, 0);
					} else {
						const { name, email, token } = data.data;
						const client_secret = data.client_secret;
						const username = data.name;
						const price = data.amount;

						localStorage.setItem('amount', price);

						stripe
							.confirmCardSetup(client_secret, {
								payment_method: {
									card: card,
									billing_details: {
										name: username,
									},
								},
							})
							.then(function (result) {
								if (result.error) {
									return console.log(result.error);
								} else {
									window.location.assign('/welcome');
								}
							});
					}
				},
				error: () => {
					console.log('error');
				},
			});
		}

		tokenCreation();
	});
});
