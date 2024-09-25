import express from 'express';
import Layout from '../../lib/layout.js';
import { template } from './views/template.js';

const layout = new Layout({
    pathname: '/foo',
    logger: console,
    name: 'demo',
});

// use our custom streaming template
layout.view(template);

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

    const headerFetch = header.fetch(incoming);
    const menuFetch = menu.fetch(incoming);
    const contentFetch = content.fetch(incoming);
    const footerFetch = footer.fetch(incoming);

    incoming.hints.on('complete', async ({ js, css }) => {
        // set the assets on httpincoming so that they are available in the document template
        incoming.js = [...incoming.js, ...js];
        incoming.css = [...incoming.css, ...css];

        // set up the stream which will send the document template head
        const stream = res.podiumStream();

        // stream in the document body with slot placeholders for podlets
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

        // fake 1 second delay
        await new Promise((res) => setTimeout(res, 1000));

        // stream in podlet content when available...
        headerFetch.then((content) => {
            stream.send(`<div slot="header">${content}</div>`);
        });

        await new Promise((res) => setTimeout(res, 1000));

        menuFetch.then((content) => {
            stream.send(`<div slot="menu">${content}</div>`);
        });

        await new Promise((res) => setTimeout(res, 1000));

        contentFetch.then((content) => {
            stream.send(`<div slot="content">${content}</div>`);
        });

        await new Promise((res) => setTimeout(res, 1000));

        footerFetch.then((content) => {
            stream.send(`<div slot="footer">${content}</div>`);
        });

        // close out the dom and the stream
        await Promise.all([headerFetch, menuFetch, contentFetch, footerFetch]);
        stream.done();
    });
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
