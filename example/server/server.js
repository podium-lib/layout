'use strict';

const express = require('express');
const Layout = require('../../');
const path = require('path');
const http = require('http');
const layout = new Layout('demo', {
    logger: console
});

const content = layout.client.register({
    name: 'content',
    uri: 'http://localhost:7100/manifest.json',
    // throwable: true,
    resolveCss: true,
});

const header = layout.client.register({
    name: 'header',
    uri: 'http://localhost:7200/header/manifest.json',
    resolveCss: true,
});

const menu = layout.client.register({
    name: 'menu',
    uri: 'http://localhost:7200/menu/manifest.json',
    resolveCss: true,
});

const footer = layout.client.register({
    name: 'footer',
    uri: 'http://localhost:7200/footer/manifest.json',
    resolveCss: true,
});

const app = express();

app.set('view engine', 'hbs');
app.set('views', path.resolve(__dirname, './views/'));

/*
app.use((req, res, next) => {
    res.locals.locale = 'nb-NO';
    next();
});
*/

app.use(layout.middleware());

app.get('/', (req, res, next) => {
    const ctx = res.locals.podium.context;
    Promise
        .all([
            content.fetch(ctx),
            header.fetch(ctx),
            menu.fetch(ctx),
            footer.fetch(ctx),
        ])
        .then((result) => {
            res.locals = {
                title: 'Podium - Layout',
                podlets: {
                    content: result[0],
                    header: result[1],
                    menu: result[2],
                    footer: result[3],
                }
            };
            next();
        }).catch((error) => {
            next(error);
        });
}, (req, res) => {
    res.locals.css = layout.client.css();
    res.locals.js = layout.client.js();
    res.status(200).render('layout', res.locals);
});

app.use('/assets', express.static('assets'));

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send('<html><body><h1>Internal server error</h1></body></html>');
});

app.listen(7000, () => {
    console.log(`layout server running at http://localhost:7000`);
});
