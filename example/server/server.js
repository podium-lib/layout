'use strict';

const express = require('express');
const Layout = require('../../');
const path = require('path');
const http = require('http');
const layout = new Layout('demo', {
    logger: console
});

const example = layout.client.register({
    name: 'example',
    uri: 'http://localhost:7100/manifest.json',
    throwable: true,
});

const app = express();

app.set('view engine', 'hbs');
app.set('views', path.resolve(__dirname, './views/'));

app.use(layout.middleware());

app.get('/', (req, res, next) => {
    const ctx = res.locals.podium.context;
    Promise
        .all([
            example.fetch(ctx),
        ])
        .then((result) => {
            res.locals = {
                title: 'Podium - Layout',
                podlets: {
                    example: result[0],
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
