import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'content',
    version: Date.now().toString(),
    pathname: '/',
});

podlet.css({ value: 'http://localhost:6103/css' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
		.content {
			border: 1px solid black;
			border-radius: 5px;
			width: 100%;
			padding: 20px;
			margin: 0;
			margin-bottom: 20px;
			box-sizing: border-box;
		}
	`);
});

app.get('/', (req, res) => {
    res.send(`
			<section class="content">
				main content goes here
			</section>	
		`);
});

app.listen(6103, () => {
    console.log(`content podlet server running at http://localhost:6103`);
});
