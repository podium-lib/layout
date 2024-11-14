import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'footer-podlet',
    version: Date.now().toString(),
    pathname: '/',
    useShadowDOM: true,
});

podlet.css({ value: 'http://localhost:6104/css', strategy: 'shadow-dom' });

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
			footer {
				width: 100%;
				background-color: #23424A;
				color: white;
				padding: 1em 0 6em 0;
				font-family: Verdana, serif;
				font-weight: 400;
				font-style: normal;
			}
			.container {
				width: 75%;
				max-width: 1000px;
				margin: 0 auto;
			}
			ul {
				list-style: none;
				display: flex;
				justify-content: space-evenly;
				align-items: center;
			}
			a {
				text-transform: upper-case;
				color: white;
				text-decoration: none;
			}
			a:hover, a:active {
				text-decoration: underline;
			}
	`);
});

app.get('/', async (req, res) => {
    // send headers
    res.sendHeaders();

    await new Promise((res) => setTimeout(res, 100));

    res.podiumSend(`
			<footer>
				<div class="container">
					<ul>
					<li><a href="#">Home</a></li>
					<li><a href="#">About</a></li>
					<li><a href="#">Contact</a></li>
					<li><a href="#">Sign in</a></li>
					<li><a href="#">Sign up</a></li>
				</ul>
				</div>
			</footer>	
		`);
});

app.listen(6104, () => {
    console.log(`footer podlet server running at http://localhost:6104`);
});
