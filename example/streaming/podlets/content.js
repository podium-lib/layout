import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'content-podlet',
    version: Date.now().toString(),
    pathname: '/',
    useShadowDOM: true,
});

podlet.css({ value: 'http://localhost:6103/css', strategy: 'shadow-dom' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
			* {
				box-sizing: border-box;
				margin: 0;
				padding: 0;
			}
			.content {
				width: 100%;
				display: flex;
				flex-direction: column;
				gap: 1em;
				font-family: Verdana, serif;
				font-weight: 400;
				font-style: normal;
			}
			h1 {
				color: #136C72;
			}
	`);
});

app.get('/', async (req, res) => {
    // send headers
    res.sendHeaders();

    await new Promise((res) => setTimeout(res, 2200));

    res.podiumSend(`
			<section class="content">
				<h1>Podlets fetched and composed, on demand, just for you</h1>
				<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
				<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
			</section>	
		`);
});

app.listen(6103, () => {
    console.log(`content podlet server running at http://localhost:6103`);
});
