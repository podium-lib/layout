import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'footer',
    version: Date.now().toString(),
    pathname: '/',
});

podlet.css({ value: 'http://localhost:6104/css' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
		footer {
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

app.get('/', async (req, res) => {
    // send headers
    res.sendHeaders();

    await new Promise((res) => setTimeout(res, 1250));

    res.podiumSend(`
			<footer>
				footer content
			</footer>	
		`);
});

app.listen(6104, () => {
    console.log(`footer podlet server running at http://localhost:6104`);
});
