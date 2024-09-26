import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'header',
    version: Date.now().toString(),
    pathname: '/',
});

podlet.css({ value: 'http://localhost:6101/css' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
		header {
			border: 1px solid black;
			border-radius: 5px;
			width: 100%;
			padding: 20px;
			margin: 0;
			margin-bottom: 20px;
			box-sizing: border-box;
		}
		header h1 {
			text-align: center;
			margin: 0;
			padding: 0;
		}
	`);
});

app.get('/', (req, res) => {
    res.send(`
			<header>
				<h1>Header</h1>
			</header>	
		`);
});

app.listen(6101, () => {
    console.log(`header podlet server running at http://localhost:6101`);
});
