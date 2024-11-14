import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'menu-podlet',
    version: Date.now().toString(),
    pathname: '/',
    useShadowDOM: true,
});

podlet.css({ value: 'http://localhost:6102/css', strategy: 'shadow-dom' });

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
			.menu {
				width: 100%;
				background-color: #136C72;
				padding: 1em 0;
				font-family: Verdana, serif;
				font-weight: 400;
				font-style: normal;
			}
			.menu ul {
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

    // imagine this is your slow database call
    await new Promise((res) => setTimeout(res, 100));

    res.podiumSend(`
			<nav class="menu">
				<ul>
					<li><a href="#">Home</a></li>
					<li><a href="#">About</a></li>
					<li><a href="#">Contact</a></li>
					<li><a href="#">Sign in</a></li>
					<li><a href="#">Sign up</a></li>
				</ul>
			</nav>	
		`);
});

app.listen(6102, () => {
    console.log(`menu podlet server running at http://localhost:6102`);
});
