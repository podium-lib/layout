import express from 'express';
import Layout from '../../lib/layout.js';

const layout = new Layout({
    pathname: '/foo',
    logger: console,
    name: 'demo',
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

const sidebar = layout.client.register({
    name: 'sidebar',
    uri: 'http://localhost:6105/manifest.json',
});

layout.css({ value: '/foo/css', strategy: 'shadow-dom' });

const app = express();

app.use(layout.pathname(), layout.middleware());

app.get('/foo/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        .layout {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 2em;
        }
        .content-area {
            width: 75%;
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            gap: 1em;
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
    const sidebarFetch = sidebar.fetch(incoming);

    const stream = await res.podiumStream();

    const [
        headerResult,
        menuResult,
        contentResult,
        footerResult,
        sidebarResult,
    ] = await Promise.all([
        headerFetch,
        menuFetch,
        contentFetch,
        footerFetch,
        sidebarFetch,
    ]);

    // stream in the document body with slot placeholders for podlets
    stream.send(`
        <div class="layout">
            <link href="/foo/css" type="text/css" rel="stylesheet">
            <div class="top-area">
                <div>${menuResult}</div>
                <div>${headerResult}</div>
            </div>
            <div class="content-area">
                ${contentResult}
                ${sidebarResult}
            </div>
            <div>${footerResult}</div>
        </div>
    `);
    stream.done();
});

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
