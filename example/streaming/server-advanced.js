import express from 'express';
import Layout from '../../lib/layout.js';
import { timeout } from 'tap';

const layout = new Layout({
    pathname: '/foo',
    logger: console,
    name: 'demo',
    client: {
        timeout: 5000,
    }
});

const content = layout.client.register({
    name: 'content',
    uri: 'http://localhost:6103/manifest.json',
});

const header = layout.client.register({
    name: 'header',
    uri: 'http://localhost:6101/manifest.json',
});

const menu = layout.client.register({
    name: 'menu',
    uri: 'http://localhost:6102/manifest.json',
});

const footer = layout.client.register({
    name: 'footer',
    uri: 'http://localhost:6104/manifest.json',
});

layout.css({ value: '/css' });

const app = express();

app.use(layout.pathname(), layout.middleware());

app.get('/foo/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
        @keyframes pulse {
            0% {
                background-color: #e0e0e0;
            }
            50% {
                background-color: #f0f0f0;
            }
            100% {
                background-color: #e0e0e0;
            }
        }
        .skeleton {
            width: 100%;
            background-color: #e0e0e0;
            border-radius: 5px;
            animation: pulse 1.5s infinite ease-in-out;
            margin: 0;
			margin-bottom: 20px;
			box-sizing: border-box;
        }
        .skeleton.header {
            height:79px;
        }
        .skeleton.menu {
            height:40px;
        }
        .skeleton.content {
            height:60px;
        }
        .skeleton.footer {
            height:60px;
        }
	`);
});

app.get(layout.pathname(), async (req, res) => {
    const incoming = res.locals.podium;

    incoming.view = {
        title: 'Example streaming application',
    };

    // we start a stream for each podlet (instead of a fetch)
    // this allows us to receive podlet meta including assets before the podlet body
    const headerFetch = header.stream(incoming);
    const menuFetch = menu.stream(incoming);
    const contentFetch = content.stream(incoming);
    const footerFetch = footer.stream(incoming);

    // we set up listeners to get notified with podlet metadata is ready
    // this will occur before the podlet body content is sent.
    headerFetch.once('beforeStream', ({ js, css }) => {
        incoming.css.push(...css);
    });
    menuFetch.once('beforeStream', ({ js, css }) => {
        incoming.css.push(...css);
    });
    contentFetch.once('beforeStream', ({ js, css }) => {
        incoming.css.push(...css);
    });
    footerFetch.once('beforeStream', ({ js, css }) => {
        incoming.css.push(...css);
    });

    // we use an awkward wait function to ensure that all the assets are loaded
    // before we start the stream (and flush the document head)
    await new Promise((resolve) => {
        function checkForAssets() {
            if (incoming.css.length >= 5) {
                resolve(true);
            } else {
                setTimeout(checkForAssets, 100);
            }
        }
        checkForAssets();
    });

    // we kick off the stream, this automatically sends the document opening html including everything in the <head>
    // as well as the openning <body> tag.
    const stream = res.podiumStream();

    // stream in the document body with slot skeleton screen placeholders for podlets
    // these will be replaced once the podlets are loaded
    stream.send(`
        <template shadowrootmode="open">
            <link href="/foo/css" type="text/css" rel="stylesheet">
            <div class="container">
                <div>
                    <div>
                        <slot name="header"><div class="skeleton header"></div></slot>
                    </div>
                </div>
                <div>
                    <div>
                        <slot name="menu"><div class="skeleton menu"></div></slot>
                    </div>
                    <div>
                        <slot name="content"><div class="skeleton content"></div></slot>
                    </div>
                </div>
                <div>
                    <div>
                        <slot name="footer"><div class="skeleton footer"></div></slot>
                    </div>
                </div>
            </div>
        </template>
    `);

    const prom1 = headerFetch.toArray().then((data) => {
        stream.send(`<div slot="header">${Buffer.concat(data).toString()}</div>`);
    });
    const prom2 = menuFetch.toArray().then((data) => {
        stream.send(`<div slot="menu">${Buffer.concat(data).toString()}</div>`);
    });
    const prom3 = contentFetch.toArray().then((data) => {
        stream.send(`<div slot="content">${Buffer.concat(data).toString()}</div>`);
    });
    const prom4 = footerFetch.toArray().then((data) => {
        stream.send(`<div slot="footer">${Buffer.concat(data).toString()}</div>`);
    });

    await Promise.all([prom1, prom2, prom3, prom4]);

    stream.done();
});

app.use(`${layout.pathname()}/assets`, express.static('assets'));

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send(
        '<html><body><h1>Internal server error</h1></body></html>',
    );
});

app.listen(6123, () => {
    console.log(`layout server running at http://localhost:6123`);
});
