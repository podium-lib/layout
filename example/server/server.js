/// <reference path="../../types/layout.d.ts" />
import { pipeline, Readable } from 'node:stream';
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

I'm assuming we want to begin piping the document template as a stream to the response as soon as possible, ideally before the podlets are done fetching.
I'm also assuming we want to get the podlets themselves using streams, not fetch.

First, let me RTFM:
- https://frontendmasters.com/blog/streaming-html/
- https://dev.to/tigt/the-weirdly-obscure-art-of-streamed-html-4gc2
- https://lamplightdev.com/blog/2024/01/10/streaming-html-out-of-order-without-javascript/
- https://podium-lib.io/docs/api/layout#streamhttpincoming-options

So for the HTML we can:
- In the layout, declare the layout using declarative shadow DOM and slots.
- Wrap the response from podlets in their respective slots as they come in, and they'll pop into place regardless of where the markup is in the response.

Aside: can we integrate Marko with Podium? `<@async>` for fetching podlets seems pretty sweet? Not web components tho.
- https://markojs.com/docs/10-awesome-marko-features/#9-async-rendering-with-the-await-tag

Still a question: how do we handle JS and CSS assets from the podlets if we start streaming the document (`<head>`) before they all emit `beforeStream`? I guess just don't start streaming before that? 🤷 How to make this ergonomic?

`
<template shadowrootmode="open">
    <div class="container">
        <div class="row">
            <div class="col-12">
                <slot name="header"></slot>
            </div>
        </div>
        <div class="row">
            <div class="col-4">
                <slot name="menu"></slot>
            </div>
            <div class="col-8">
                <slot name="content"></slot>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <slot name="footer"></slot>
            </div>
        </div>
    </div>
</template>`
*/

app.get(`${layout.pathname()}stream`, async (req, res) => {
    /** @type {import("@podium/utils").HttpIncoming} */
    const incoming = res.locals.podium;
    incoming.view = {
        title: 'Example application',
    };

    // 1. Start streaming the podlets so we can get them all to emit beforeStream for us to populate JS and CSS lists.
    // Do we need a ReadableStream wrapper around all the podlets that emits "beforeStreamEnd"?

    res.podiumStream(
        [header, menu, content, footer],
        `<template shadowrootmode="open">
    <div class="container">
        <div class="row">
            <div class="col-12">
                <slot name="${header.name}"></slot>
            </div>
        </div>
        <div class="row">
            <div class="col-4">
                <slot name="${menu.name}"></slot>
            </div>
            <div class="col-8">
                <slot name="${content.name}"></slot>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <slot name="${footer.name}"></slot>
            </div>
        </div>
    </div>
</template>`,
    );
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
