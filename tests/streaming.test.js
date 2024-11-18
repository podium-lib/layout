import tap from 'tap';
import stoppable from 'stoppable';
import express from 'express';
import Podlet from '@podium/podlet';
import Layout from '../lib/layout.js';

const podlet = (name, port, assets, options = {}) => {
    const app = express();
    const podlet = new Podlet({
        name,
        version: '1.0.0',
        pathname: '/',
    });
    if (assets && assets.js) {
        podlet.js({ value: assets.js, type: 'module' });
    }
    if (assets && assets.css) {
        podlet.css({ value: assets.css, rel: 'stylesheet', type: 'text/css' });
    }
    app.use(podlet.middleware());
    app.get('/manifest.json', (req, res) => res.send(podlet));
    app.get(podlet.content(), async (req, res) => {
        if (options.failing) {
            res.sendStatus(500);
            return;
        }
        if (options.slow) {
            await new Promise((resolve) => setTimeout(resolve, 4000));
        }
        res.send(`<div>${name}</div>`);
    });
    return stoppable(app.listen(port), 0);
};

tap.test('HTTP Streaming - basic case', async (t) => {
    const p1 = podlet('podlet-registered-name-1', 5153);
    const p2 = podlet('podlet-registered-name-2', 5154);

    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5153/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5154/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);

        const stream = await res.podiumStream();

        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);

        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);

        stream.done();
    });
    const l1 = stoppable(app.listen(5164), 0);

    const result = await fetch('http://0.0.0.0:5164');
    const html = await result.text();
    t.match(html, /<html lang="en-US">/);
    t.match(html, /<\/html>/);
    t.match(
        html,
        /<div><div>podlet-registered-name-1<\/div><\/div><div><div>podlet-registered-name-2<\/div><\/div>/,
        '',
    );

    p1.stop();
    p2.stop();
    l1.stop();
});

tap.test('HTTP Streaming - with assets', async (t) => {
    const p1 = podlet('podlet-registered-name-1', 5173, {
        js: '/podlet-registered-name-1.js',
        css: '/podlet-registered-name-1.css',
    });
    const p2 = podlet('podlet-registered-name-2', 5174, {
        js: '/podlet-registered-name-2.js',
        css: '/podlet-registered-name-2.css',
    });

    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5173/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5174/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);
        const stream = await res.podiumStream();
        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);
        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
        stream.done();
    });
    const l1 = stoppable(app.listen(5175), 0);

    const result = await fetch('http://0.0.0.0:5175');
    const html = await result.text();

    t.match(html, /<html lang="en-US">/);
    t.match(
        html,
        /<link href="\/podlet-registered-name-1.css" type="text\/css" rel="stylesheet">/,
    );
    t.match(
        html,
        /<link href="\/podlet-registered-name-2.css" type="text\/css" rel="stylesheet">/,
    );
    t.match(
        html,
        /<div><div>podlet-registered-name-1<\/div><\/div><div><div>podlet-registered-name-2<\/div><\/div>/,
        '',
    );
    t.match(html, /<script src="\/podlet-registered-name-1.js" type="module">/);
    t.match(html, /<script src="\/podlet-registered-name-2.js" type="module">/);
    t.match(html, /<\/html>/);

    p1.stop();
    p2.stop();
    l1.stop();
});

tap.test('HTTP Streaming - one podlet does not exist', async (t) => {
    const p1 = podlet('podlet-registered-name-1', 5180, {
        js: '/podlet-registered-name-1.js',
        css: '/podlet-registered-name-1.css',
    });

    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5180/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5181/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);
        const stream = await res.podiumStream();
        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);
        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
        stream.done();
    });
    const l1 = stoppable(app.listen(5183), 0);

    const result = await fetch('http://0.0.0.0:5183');
    const html = await result.text();

    t.match(
        html,
        /<div><div>podlet-registered-name-1<\/div><\/div><div><\/div>/,
        'podlet content should be an empty string',
    );

    p1.stop();
    l1.stop();
});

tap.test('HTTP Streaming - one podlet down', async (t) => {
    const p1 = podlet('podlet-registered-name-1', 5187, {
        js: '/podlet-registered-name-1.js',
        css: '/podlet-registered-name-1.css',
    });
    const p2 = podlet(
        'podlet-registered-name-2',
        5188,
        {
            js: '/podlet-registered-name-2.js',
            css: '/podlet-registered-name-2.css',
        },
        { failing: true },
    );

    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5187/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5188/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);
        const stream = await res.podiumStream();
        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);
        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
        stream.done();
    });
    const l1 = stoppable(app.listen(5189), 0);

    const result = await fetch('http://0.0.0.0:5189');
    const html = await result.text();

    t.match(
        html,
        /<div><div>podlet-registered-name-1<\/div><\/div><div><\/div>/,
        '',
    );

    p1.stop();
    p2.stop();
    l1.stop();
});

tap.test('HTTP Streaming - no podlets exist', async (t) => {
    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5184/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5185/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);
        const stream = await res.podiumStream();
        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);
        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
        stream.done();
    });
    const l1 = stoppable(app.listen(5186), 0);

    const result = await fetch('http://0.0.0.0:5186');
    const html = await result.text();

    t.match(
        html,
        /<div><\/div><div><\/div>/,
        'podlet content should be empty strings',
    );
    l1.stop();
});

tap.test('HTTP Streaming - all podlets down', async (t) => {
    const p1 = podlet(
        'podlet-registered-name-1',
        5190,
        {
            js: '/podlet-registered-name-1.js',
            css: '/podlet-registered-name-1.css',
        },
        { failing: true },
    );
    const p2 = podlet(
        'podlet-registered-name-2',
        5191,
        {
            js: '/podlet-registered-name-2.js',
            css: '/podlet-registered-name-2.css',
        },
        { failing: true },
    );

    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5190/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5191/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);
        const stream = await res.podiumStream();
        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);
        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
        stream.done();
    });
    const l1 = stoppable(app.listen(5192), 0);

    const result = await fetch('http://0.0.0.0:5192');
    const html = await result.text();

    t.match(html, /<div><\/div><div><\/div>/, '');

    p1.stop();
    p2.stop();
    l1.stop();
});

tap.test('HTTP Streaming - one slow podlet times out', async (t) => {
    const p1 = podlet('podlet-registered-name-1', 5194, {
        js: '/podlet-registered-name-1.js',
        css: '/podlet-registered-name-1.css',
    });
    const p2 = podlet(
        'podlet-registered-name-2',
        5195,
        {
            js: '/podlet-registered-name-2.js',
            css: '/podlet-registered-name-2.css',
        },
        { slow: true },
    );

    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const p1Client = layout.client.register({
        name: 'podlet-registered-name-1',
        uri: 'http://0.0.0.0:5194/manifest.json',
    });
    const p2Client = layout.client.register({
        name: 'podlet-registered-name-2',
        uri: 'http://0.0.0.0:5195/manifest.json',
    });
    app.use(layout.middleware());
    app.get(layout.pathname(), async (req, res) => {
        const incoming = res.locals.podium;
        const p1fetch = p1Client.fetch(incoming);
        const p2fetch = p2Client.fetch(incoming);
        const stream = await res.podiumStream();
        const [p1Content, p2Content] = await Promise.all([p1fetch, p2fetch]);
        stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
        stream.done();
    });
    const l1 = stoppable(app.listen(5196), 0);

    const result = await fetch('http://0.0.0.0:5196');
    const html = await result.text();

    t.match(
        html,
        /<div><div>podlet-registered-name-1<\/div><\/div><div><\/div>/,
        '',
    );

    p1.stop();
    p2.stop();
    l1.stop();
});

tap.test(
    'HTTP Streaming - failing podlet - begin streaming before podlets return content',
    async (t) => {
        const p1 = podlet('podlet-registered-name-1', 5197, {
            js: '/podlet-registered-name-1.js',
            css: '/podlet-registered-name-1.css',
        });
        const p2 = podlet(
            'podlet-registered-name-2',
            5198,
            {
                js: '/podlet-registered-name-2.js',
                css: '/podlet-registered-name-2.css',
            },
            { failing: true },
        );

        const app = express();
        const layout = new Layout({ name: 'my-layout', pathname: '/' });
        const p1Client = layout.client.register({
            name: 'podlet-registered-name-1',
            uri: 'http://0.0.0.0:5197/manifest.json',
        });
        const p2Client = layout.client.register({
            name: 'podlet-registered-name-2',
            uri: 'http://0.0.0.0:5198/manifest.json',
        });
        app.use(layout.middleware());
        app.get(layout.pathname(), async (req, res) => {
            const incoming = res.locals.podium;
            const p1fetch = p1Client.fetch(incoming);
            const p2fetch = p2Client.fetch(incoming);
            const stream = await res.podiumStream();
            stream.send(`<div>Send initial HTML</div>`);
            const [p1Content, p2Content] = await Promise.all([
                p1fetch,
                p2fetch,
            ]);
            stream.send(`<div>${p1Content}</div><div>${p2Content}</div>`);
            stream.done();
        });
        const l1 = stoppable(app.listen(5199), 0);

        const result = await fetch('http://0.0.0.0:5199');
        const html = await result.text();

        t.match(html, /<div>Send initial HTML<\/div>/, '');
        t.match(
            html,
            /<div><div>podlet-registered-name-1<\/div><\/div><div><\/div>/,
            '',
        );

        p1.stop();
        p2.stop();
        l1.stop();
    },
);
