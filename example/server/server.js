/// <reference path="../../types/layout.d.ts" />

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

app.get(`${layout.pathname()}/:bar?`, async (req, res) => {
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
