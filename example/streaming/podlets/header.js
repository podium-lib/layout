import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'header-podlet',
    version: Date.now().toString(),
    pathname: '/',
    useShadowDOM: true,
});

podlet.css({ value: 'http://localhost:6101/css', strategy: 'shadow-dom' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
			* {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			header {
				width: 100%;
				padding: 6em 0;
				background-color: #23424A;
				font-size: 1.5rem;
				font-family: "Verdana", sans-serif;
				font-weight: 400;
				font-style: normal;
				color: white;
			}
			h1 {
				font-size: 3rem;
				color: white;
				font-family: "Verdana", sans-serif;
				font-weight: 900;
				font-style: normal;
			}
			.container {
				width: 75%;
				max-width: 1000px;
				margin: 0 auto;
			}
			.inner-container {
				display: flex;
				flex-direction: column;
				gap: 1em;
			}
			.button {
				color: black;
				background-color: #38CFD9;
				padding: 0.5em 1.25em;
				border-radius: 1em;
				text-decoration: none;
				width: fit-content;
			}
			.button:hover, .button:active {
				text-decoration: underline;
				width: fit-content;
			}
			@media (min-width: 800px) {
				.inner-container {
					width: 70%;
				}
			}
	`);
});

app.get('/', async (req, res) => {
    res.set('Content-Type', 'text/html');
    res.sendHeaders();

    await new Promise((res) => setTimeout(res, 100));

    res.podiumSend(`
			<header>
				<div class="container">
					<div class="inner-container">
						<h1>Podium layouts can be composed using streaming</h1>
						<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
						<a href="#" class="button">I want to learn</a>
					</div>
				</div>
			</header>	
		`);
});

app.listen(6101, () => {
    console.log(`header podlet server running at http://localhost:6101`);
});
