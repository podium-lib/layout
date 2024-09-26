import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'menu',
    version: Date.now().toString(),
    pathname: '/',
});

podlet.css({ value: 'http://localhost:6102/css' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
		menu {
			border: 1px solid black;
			border-radius: 5px;
			width: 100%;
			padding: 10px;
			margin: 0;
			margin-bottom: 20px;
			box-sizing: border-box;
		}
		menu ul {
			list-style: none;
			padding: 0;
			margin: 0;
			display: flex;
			justify-content: space-evenly;
			align-items: center;
		}
		menu ul li {
			margin: 0;
			padding: 0;
		}
	`);
});

app.get('/', (req, res) => {
    res.send(`
			<menu>
				<ul>
					<li><a href="/">Home</a></li>
					<li><a href="/about">About</a></li>
					<li><a href="/things">Things</a></li>
					<li><a href="/stuff">Stuff</a></li>
				</ul>
			</menu>	
		`);
});

app.listen(6102, () => {
    console.log(`menu podlet server running at http://localhost:6102`);
});
