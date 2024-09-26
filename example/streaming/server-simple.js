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

layout.css({ value: '/css' });

const app = express();

app.use(layout.pathname(), layout.middleware());

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
        incoming.js = js;
        incoming.css = css;

        // set up the stream which will send the document template head
        const stream = res.podiumStream();

        // pretend the podlets are slow to load
        await new Promise((res) => setTimeout(res, 3000));

        const [header, menu, content, footer] = await Promise.all([
            headerFetch,
            menuFetch,
            contentFetch,
            footerFetch,
        ]);

        // stream in the document body with slot placeholders for podlets
        stream.send(`
            <div class="container">
                <div>${header}</div>
                <div>
                    <div>${menu}</div>
                    <div>${content}</div>
                </div>
                <div>${footer}</div>
            </div>
        `);
        stream.done();
    });
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
