/// <reference path="../../types/layout.d.ts" />
import { Readable } from 'node:stream';
import express from 'express';
import Layout from '../../lib/layout.js';
import template from './views/template.js';

const layout = new Layout({
    pathname: '/',
    logger: console,
    name: 'demo',
});

// These are the podlets from https://github.com/podium-lib/podlet/tree/main/example
const content = layout.client.register({
    name: 'content',
    uri: 'http://localhost:7100/manifest.json',
});

const header = layout.client.register({
    name: 'header',
    uri: 'http://localhost:7200/header/manifest.json',
});

const menu = layout.client.register({
    name: 'menu',
    uri: 'http://localhost:7200/menu/manifest.json',
});

const footer = layout.client.register({
    name: 'footer',
    uri: 'http://localhost:7200/footer/manifest.json',
});

layout.css({ value: '/foo/assets/grid.css' });

const app = express();

app.use(layout.pathname(), layout.middleware());

app.get(layout.pathname(), async (req, res) => {
    const incoming = res.locals.podium;
    const podlets = await Promise.all([
        header.fetch(incoming),
        menu.fetch(incoming),
        content.fetch(incoming),
        footer.fetch(incoming),
    ]);

    incoming.view = {
        title: 'Example application',
    };

    incoming.podlets = podlets;

    const markup = template(podlets);
    res.status(200).podiumSend(markup);
});

/**

I'm trying to grok the streams API in Podium, but I'm having a hard time piecing together a finished document in a layout using streams as a noob.

I'm assuming we want to begin piping the document template as a stream to the response as soon as possible, ideally even before we start streaming podlets.

For that to work, it looks like to me that we need:
- Podlets wrapped in declarative shadow DOM so they're web components.
- We need to know the name for that component ahead of time so it can be part of the document template stream right away.
- Podlets that stream in pop into place when the declaration of the web component gets streamed in.

Might be I'm just not aware how streaming HTML works. Let me RTFM.

If I'm right and we don't have that web component setup, I'm thinking we need to do something like this:

- Create a readable stream for the document up until the first podlet.
- Create a readable stream for the first podlet.
- Create a readable stream for the document up until the second podlet.

And keep doing that until we have streams for the whole document. Then, make a pipeline for all those streams, and pipe that to the response. Clunky!

A document template could perhaps be a generator function that would yield a readable stream up to a known slot for each call 🤔

*/

app.get(`${layout.pathname()}/stream`, async (req, res) => {
    const incoming = res.locals.podium;
    incoming.view = {
        title: 'Example application',
    };
    const document = Readable.from([template()]);
    document.pipe(res);

    const headerStream = header.stream(incoming);
    const menuStream = menu.stream(incoming);
    const contentStream = content.stream(incoming);
    const footerStream = footer.stream(incoming);
});

app.use(`${layout.pathname()}/assets`, express.static('assets'));

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send(
        '<html><body><h1>Internal server error</h1></body></html>',
    );
});

app.listen(7000, () => {
    console.log(`Layout server running at http://localhost:7000/`);
});
