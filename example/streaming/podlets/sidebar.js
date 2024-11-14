import Podlet from '@podium/podlet';
import express from 'express';

const podlet = new Podlet({
    name: 'sidebar-podlet',
    version: Date.now().toString(),
    pathname: '/',
    useShadowDOM: true,
});

podlet.css({ value: 'http://localhost:6105/css', strategy: 'shadow-dom' });

const app = express();

app.use(podlet.middleware());

app.get('/manifest.json', (req, res) => {
    res.send(podlet);
});

app.get('/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
		 	* {
		  	border-sizing: border-box;
				margin: 0;
				padding: 0;	
			}
			.sidebar {
				background-color: #136C72;
				color: white;
				width: 100%;
				padding: 2.5em 1em;
				text-align: center;
				display: flex;
				flex-direction: column;
				gap: 2.5em;
				font-family: Verdana, serif;
				font-weight: 400;
				font-style: normal;
			}
			.info-block {
				display: flex;
				flex-direction: column;
				gap: 1em;
			}
	`);
});

app.get('/', async (req, res) => {
    res.set('Content-Type', 'text/html');
    res.sendHeaders();

    await new Promise((res) => setTimeout(res, 3200));

    res.podiumSend(`
			<section class="sidebar">
				<div class="info-block">
					<h2>Cheap</h2>
					<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
				</div>
				<div class="info-block">
					<h2>Quick</h2>
					<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
				</div>
				<div class="info-block">
					<h2>Quality</h2>
					<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</p>
				</div>
			</section>	
		`);
});

app.listen(6105, () => {
    console.log(`content podlet server running at http://localhost:6105`);
});
