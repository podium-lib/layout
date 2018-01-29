'use strict';

const express = require('express');
const Layout = require('../');
const path = require('path');

const layout = new Layout();
const topbar = layout.client.register({
    name: 'topbar',
    uri: 'http://localhost:7040/topbar/manifest.json',
});

const footer = layout.client.register({
    name: 'footer',
    uri: 'http://localhost:7040/footer/manifest.json',
});

const marketIcons = layout.client.register({
    name: 'marketIcons',
    uri: 'http://localhost:7020/manifest.json',
    throwable: true,
});

const globalSearch = layout.client.register({
    name: 'globalSearch',
    uri: 'http://localhost:7040/global-search/manifest.json',
});

const example = layout.client.register({
    name: 'example',
    uri: 'http://localhost:7010/manifest.json',
});

const app = express();

app.set('view engine', 'hbs');
app.set('views', path.resolve(__dirname, './views/'));

app.get('/', (req, res, next) => {
    Promise
        .all([
            topbar.fetch({}, {
                query: { activeMenuItem: 'FRONTPAGE' },
            }),
            footer.fetch({}),
            marketIcons.fetch({}),
            globalSearch.fetch({}),
            example.fetch({}),
        ])
        .then((result) => {
            res.locals.content = {
                title: 'podium.io',
                podlets: {
                    topbar: result[0],
                    footer: result[1],
                    marketIcons: result[2],
                    globalSearch: result[3],
                    example: result[4],
                }
            };
            next();
        }).catch((error) => {
            next(error);
        });
}, (req, res) => {
    res.status(200).render('layout', res.locals.content);
});

app.use((error, req, res, next) => {
    res.status(500).send('<html><body><h1>Internal server error</h1></body></html>');
});

app.listen(7000, () => {
    console.log('layout server running');
    console.log(`http://localhost:7000`);
});
