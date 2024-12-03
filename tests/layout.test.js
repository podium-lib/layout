import tap from 'tap';
import { destinationObjectStream } from '@podium/test-utils';
import { HttpIncoming, AssetJs, AssetCss } from '@podium/utils';
import stoppable from 'stoppable';
import express from 'express';
import request from 'supertest';
import Podlet from '@podium/podlet';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Layout from '../lib/layout.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pkgJson = fs.readFileSync(
    join(currentDirectory, '../package.json'),
    'utf-8',
);
const pkg = JSON.parse(pkgJson);

const SIMPLE_REQ = {
    headers: {},
};

const SIMPLE_RES = {
    locals: {},
};

const DEFAULT_OPTIONS = { name: 'foo', pathname: '/' };

/**
 * Constructor
 */

tap.test(
    'Layout() - instantiate new layout object - should create an object',
    (t) => {
        const layout = new Layout({ name: 'foo', pathname: '/' });
        t.ok(layout instanceof Layout);
        t.end();
    },
);

tap.test('Layout() - object tag - should be PodiumLayout', (t) => {
    const layout = new Layout({ name: 'foo', pathname: '/' });
    t.equal(Object.prototype.toString.call(layout), '[object PodiumLayout]');
    t.end();
});

tap.test('Layout() - no value given to "name" argument - should throw', (t) => {
    t.throws(() => {
        const layout = new Layout({ pathname: '/' }); // eslint-disable-line no-unused-vars
    }, 'The value, "", for the required argument "name" on the Layout constructor is not defined or not valid.');
    t.end();
});

tap.test(
    'Layout() - invalid value given to "name" argument - should throw',
    (t) => {
        t.throws(() => {
            const layout = new Layout({ name: 'foo bar', pathname: '/' }); // eslint-disable-line no-unused-vars
        }, 'The value, "foo bar", for the required argument "name" on the Layout constructor is not defined or not valid.');
        t.end();
    },
);

tap.test(
    'Layout() - no value given to "pathname" argument - should throw',
    (t) => {
        t.throws(() => {
            const layout = new Layout({ name: 'foo' }); // eslint-disable-line no-unused-vars
        }, 'The value, "", for the required argument "pathname" on the Layout constructor is not defined or not valid.');
        t.end();
    },
);

tap.test(
    'Layout() - invalid value given to "name" argument - should throw',
    (t) => {
        t.throws(() => {
            const layout = new Layout({ name: 'foo', pathname: 'foo bar' }); // eslint-disable-line no-unused-vars
        }, 'The value, "foo bar", for the required argument "pathname" on the Layout constructor is not defined or not valid.');
        t.end();
    },
);

tap.test('Layout() - should collect metric with version info', (t) => {
    const layout = new Layout(DEFAULT_OPTIONS);

    const dest = destinationObjectStream((arr) => {
        t.equal(arr[0].name, 'podium_layout_version_info');
        t.equal(arr[0].labels[0].name, 'version');

        t.equal(arr[0].labels[0].value, pkg.version);
        t.equal(arr[0].labels[1].name, 'major');
        t.equal(arr[0].labels[2].name, 'minor');
        t.equal(arr[0].labels[3].name, 'patch');
        t.end();
    });

    layout.metrics.pipe(dest);

    setImmediate(() => {
        dest.end();
    });
});

tap.test('Layout() - metrics properly decorated', (t) => {
    // podlet
    const podletApp = express();

    const podlet = new Podlet({
        name: 'myPodlet',
        version: '1.0.0',
        pathname: '/',
        fallback: '/fallback',
        development: false,
    });
    podletApp.use(podlet.middleware());
    podletApp.get('/manifest.json', (req, res) => {
        res.send(podlet);
    });
    podletApp.get('/fallback', (req, res) => {
        res.send('this is fallback content');
    });
    podletApp.get('/', (req, res) => {
        res.send('this is podlet content');
    });
    podletApp.get(podlet.proxy({ target: '/api', name: 'api' }), (req, res) => {
        res.send({
            version: '1.0.0',
        });
    });
    const s1 = stoppable(podletApp.listen(5021), 0);

    // layout
    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });
    t.equal(layout.pathname(), '/');

    app.use(layout.middleware());

    /** @type {import('../lib/layout.js').RegisterOptions} */
    const options = {
        uri: 'http://0.0.0.0:5021/manifest.json',
        name: 'myPodlet',
    };

    /** @type {import('../lib/layout.js').PodiumClientResource} */
    const podletClient = layout.client.register(options);

    app.get('/', async (req, res) => {
        /** @type {import('../lib/layout.js').PodiumClientResponse} */
        const response = await podletClient.fetch(res.locals.podium);
        res.send(response.content);
    });

    layout.metrics.pipe(
        destinationObjectStream((items) => {
            const arr = items.filter(
                (i) => i.name !== 'http_client_request_duration',
            );

            t.equal(arr[0].name, 'podium_layout_version_info');
            t.equal(arr[0].type, 1);
            t.equal(arr[0].value, 1);

            t.equal(arr[1].name, 'podium_context_process');
            t.equal(arr[1].type, 5);

            t.equal(arr[2].name, 'podium_proxy_process');
            t.equal(arr[2].type, 5);

            t.equal(arr[3].name, 'podium_client_resolver_manifest_resolve');
            t.equal(arr[3].type, 5);
            t.same(arr[3].labels[0], {
                name: 'name',
                value: 'myLayout',
            });
            t.same(arr[3].meta, {
                buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
            });

            t.equal(arr[4].name, 'podium_client_resolver_fallback_resolve');
            t.equal(arr[4].type, 5);
            t.same(arr[4].labels[0], {
                name: 'name',
                value: 'myLayout',
            });
            t.same(arr[4].meta, {
                buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
            });

            t.equal(arr[5].name, 'podium_client_resolver_content_resolve');
            t.equal(arr[5].type, 5);
            t.same(arr[5].labels[0], {
                name: 'name',
                value: 'myLayout',
            });
            t.same(arr[5].meta, {
                buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
            });

            t.equal(arr[6].name, 'podium_context_process');
            t.equal(arr[6].type, 5);
            t.same(arr[6].labels, [{ name: 'name', value: 'myLayout' }]);
            t.same(arr[6].meta, {
                buckets: [0.001, 0.01, 0.1, 0.5, 1],
            });

            t.equal(arr[7].name, 'podium_proxy_process');
            t.equal(arr[7].type, 5);
            t.same(arr[7].labels, [
                { name: 'name', value: 'myLayout' },
                { name: 'podlet', value: 'myPodlet' },
                { name: 'proxy', value: true },
                { name: 'error', value: false },
            ]);
            t.same(arr[7].meta, {
                buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
            });
            t.end();
        }),
    );

    const s2 = stoppable(app.listen(5022), 0);

    request('http://0.0.0.0:5022')
        .get('/')
        .then(async (result) => {
            const apiResponse = await request('http://0.0.0.0:5022').get(
                '/podium-resource/myPodlet/api',
            );
            t.equal(result.text, 'this is podlet content');
            t.same(apiResponse.body, { version: '1.0.0' });
            layout.metrics.push(null);
            s1.stop();
            s2.stop();
        });
});

// #############################################
// .css()
// #############################################

tap.test('.css() - call method with no arguments - should throw', (t) => {
    const layout = new Layout(DEFAULT_OPTIONS);
    t.throws(() => {
        // @ts-expect-error Testing bad input
        layout.css();
    }, 'Value for argument variable "value", "undefined", is not valid');
    t.end();
});

tap.test(
    '.css() - set legal absolute value on "value" argument - should set "css" to set value',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.css({ value: 'http://somewhere.remote.com' });
        const result = JSON.parse(JSON.stringify(layout.cssRoute));
        t.same(result, [
            {
                rel: 'stylesheet',
                type: 'text/css',
                value: 'http://somewhere.remote.com',
            },
        ]);
        t.end();
    },
);

tap.test(
    '.css() - "options" argument as an array - should accept an array of values',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.css([{ value: '/foo/bar' }, { value: '/bar/foo' }]);
        const result = JSON.parse(JSON.stringify(layout.cssRoute));
        t.same(result, [
            { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
            { rel: 'stylesheet', type: 'text/css', value: '/bar/foo' },
        ]);
        t.end();
    },
);

tap.test(
    '.css() - "options" argument as an array - call method twice - should set all values',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.css([{ value: '/foo/bar' }, { value: '/bar/foo' }]);
        layout.css([{ value: '/foo/bar/baz' }, { value: '/bar/foo/baz' }]);
        const result = JSON.parse(JSON.stringify(layout.cssRoute));
        t.same(result, [
            { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
            { rel: 'stylesheet', type: 'text/css', value: '/bar/foo' },
            { rel: 'stylesheet', type: 'text/css', value: '/foo/bar/baz' },
            { rel: 'stylesheet', type: 'text/css', value: '/bar/foo/baz' },
        ]);
        t.end();
    },
);

tap.test(
    '.css() - "options" argument as an array - should NOT set additional keys',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.css([
            { value: '/foo/bar', fake: 'prop' },
            { value: '/bar/foo', prop: 'fake' },
        ]);
        const result = JSON.parse(JSON.stringify(layout.cssRoute));
        t.same(result, [
            { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
            { rel: 'stylesheet', type: 'text/css', value: '/bar/foo' },
        ]);
        t.end();
    },
);

tap.test(
    '.css() - passing an instance of AssetsCss - should return set value',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.css(new AssetCss({ value: '/foo/bar', type: 'text/css' }));
        const result = JSON.parse(JSON.stringify(layout.cssRoute));
        t.same(result, [
            { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
        ]);
        t.end();
    },
);

// #############################################
// .js()
// #############################################

tap.test('.js() - call method with no arguments - should throw', (t) => {
    const layout = new Layout(DEFAULT_OPTIONS);
    t.throws(() => {
        layout.js();
    }, 'Value for argument variable "value", "undefined", is not valid');
    t.end();
});

tap.test(
    '.js() - passing an instance of AssetsJs - should return set value',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js(new AssetJs({ value: '/foo/bar', type: 'module' }));
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [{ type: 'module', value: '/foo/bar' }]);
        t.end();
    },
);

tap.test(
    '.js() - set legal absolute value on "value" argument - should set "js" to set value',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js({ value: 'http://somewhere.remote.com' });
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [
            { type: 'default', value: 'http://somewhere.remote.com' },
        ]);
        t.end();
    },
);

tap.test(
    '.js() - set illegal value on "value" argument - should throw',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js({ value: '/foo/bar' });
        layout.js({ value: '/bar/foo', type: 'module' });
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [
            { type: 'default', value: '/foo/bar' },
            { type: 'module', value: '/bar/foo' },
        ]);
        t.end();
    },
);

tap.test(
    '.js() - "type" argument is set to "module" - should set "type" to "module"',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js({ value: '/foo/bar' });
        layout.js({ value: '/bar/foo', type: 'module' });
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [
            { type: 'default', value: '/foo/bar' },
            { type: 'module', value: '/bar/foo' },
        ]);
        t.end();
    },
);

tap.test(
    '.js() - "options" argument as an array - should accept an array of values',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js([
            { value: '/foo/bar' },
            { value: '/bar/foo', type: 'module' },
        ]);
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [
            { type: 'default', value: '/foo/bar' },
            { type: 'module', value: '/bar/foo' },
        ]);
        t.end();
    },
);

tap.test(
    '.js() - "options" argument as an array - call method twice - should set all values',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js([
            { value: '/foo/bar' },
            { value: '/bar/foo', type: 'module' },
        ]);
        layout.js([
            { value: '/foo/bar/baz' },
            { value: '/bar/foo/baz', type: 'module' },
        ]);
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [
            { type: 'default', value: '/foo/bar' },
            { type: 'module', value: '/bar/foo' },
            { type: 'default', value: '/foo/bar/baz' },
            { type: 'module', value: '/bar/foo/baz' },
        ]);
        t.end();
    },
);

tap.test(
    '.js() - "options" argument as an array - should NOT set additional keys',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js([
            { value: '/foo/bar', fake: 'prop' },
            { value: '/bar/foo', type: 'module', prop: 'fake' },
        ]);
        const result = JSON.parse(JSON.stringify(layout.jsRoute));
        t.same(result, [
            { type: 'default', value: '/foo/bar' },
            { type: 'module', value: '/bar/foo' },
        ]);
        t.end();
    },
);

tap.test(
    '.js() - data attribute object - should convert to array of key / value objects',
    (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        layout.js([
            {
                value: '/foo/bar',
                data: {
                    // @ts-expect-error Testing conversion from older format
                    bar: 'a',
                    foo: 'b',
                },
            },
        ]);

        const result = JSON.parse(JSON.stringify(layout.jsRoute));

        t.same(result, [
            {
                type: 'default',
                value: '/foo/bar',
                data: [
                    {
                        key: 'bar',
                        value: 'a',
                    },
                    {
                        key: 'foo',
                        value: 'b',
                    },
                ],
            },
        ]);
        t.end();
    },
);

// #############################################
// .process()
// #############################################

tap.test(
    '.process() - call method with HttpIncoming - should return HttpIncoming',
    async (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        const incoming = new HttpIncoming(SIMPLE_REQ, SIMPLE_RES);
        const result = await layout.process(incoming);
        t.same(result, incoming);
        t.end();
    },
);

tap.test(
    '.process() - idempotence - manipulating the HttpIncoming should not affect layout',
    async (t) => {
        const layout = new Layout(DEFAULT_OPTIONS);
        t.same(layout.jsRoute, []);
        t.same(layout.cssRoute, []);

        // Simulate middleware
        const incoming = new HttpIncoming(SIMPLE_REQ, SIMPLE_RES);
        await layout.process(incoming);

        // Simulate layout route
        incoming.podlets = [
            {
                js: [{ value: '/foo/bar' }],
                css: [{ value: '/bar/foo' }],
            },
        ];

        t.same(layout.jsRoute, []);
        t.same(layout.cssRoute, []);
        t.end();
    },
);

tap.test(
    '.middleware() - includes on values set on res.locals in `incoming`',
    async (t) => {
        const app = express();

        const layout = new Layout({
            name: 'myLayout',
            pathname: '/',
        });

        app.use((req, res, next) => {
            res.locals.locale = 'sv';
            next();
        });

        app.use(layout.middleware());

        app.get('/', async (req, res) => {
            res.send(res.locals.podium.params.locale);
        });

        const s1 = stoppable(app.listen(4009), 0);

        const result = await request('http://0.0.0.0:4009').get('/');

        t.match(result.text, 'sv');

        s1.stop();
        t.end();
    },
);

tap.test('Layout() - rendering using a string', async (t) => {
    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });

    app.use(layout.middleware());

    app.get('/', async (req, res) => {
        res.podiumSend('<div>should be wrapped in a doc</div>');
    });

    const s1 = stoppable(app.listen(4010), 0);

    const result = await request('http://0.0.0.0:4010').get('/');

    t.match(result.text, '<div>should be wrapped in a doc</div>');
    t.match(result.text, '<html lang=');

    s1.stop();
    t.end();
});

tap.test('Layout() - rendering using a string - with assets', async (t) => {
    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });

    layout.js({ value: `http://url.com/some/js` });
    layout.css({ value: `http://url.com/some/css` });

    app.use(layout.middleware());

    app.get('/', async (req, res) => {
        res.locals.podium.view = {
            title: 'awesome page',
        };

        const head = 'extra head stuff';
        const body = '<div>should be wrapped in a doc</div>';

        res.podiumSend(body, head);
    });

    const s1 = stoppable(app.listen(4011), 0);

    const result = await request('http://0.0.0.0:4011').get('/');

    t.matchSnapshot(result.text);

    s1.stop();
    t.end();
});

tap.test('Layout() - setting a custom view template', async (t) => {
    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });

    layout.view(
        (incoming, body = '', head = '') =>
            `<html><head>${head}</head><body>${body}</body></html>`,
    );

    app.use(layout.middleware());

    app.get('/', async (req, res) => {
        const head = 'extra head stuff';
        const body = '<div>should be wrapped in a doc</div>';
        res.podiumSend(body, head);
    });

    const s1 = stoppable(app.listen(4012), 0);

    const result = await request('http://0.0.0.0:4012').get('/');

    t.matchSnapshot(result.text);

    s1.stop();
    t.end();
});

tap.test('Layout() - request url parsing', async (t) => {
    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });

    app.use(layout.middleware());

    app.get('/', async (req, res) => {
        t.equal(res.locals.podium.url.href, 'http://0.0.0.0:4013/');
        t.equal(
            res.locals.podium.context['podium-mount-origin'],
            'http://0.0.0.0:4013',
        );
        t.equal(res.locals.podium.context['podium-mount-pathname'], '/');
        res.send('ok');
    });

    const s1 = stoppable(app.listen(4013), 0);

    await request('http://0.0.0.0:4013').get('/');

    s1.stop();
});

tap.test('Proxy - builds correct proxy url', async (t) => {
    // podlet with a simple api endpoint /api and name value in manifest.json of "podlet-manifest-name"
    const podletApp = express();
    const podlet = new Podlet({
        name: 'podlet-manifest-name',
        version: '1.0.0',
        pathname: '/',
    });
    podletApp.use(podlet.middleware());
    podletApp.get('/manifest.json', (req, res) => res.send(podlet));
    podletApp.get(podlet.proxy({ target: '/api', name: 'api' }), (req, res) =>
        res.sendStatus(200),
    );
    const s1 = stoppable(podletApp.listen(5043), 0);

    // layout that register podlet with the name "podlet-registered-name"
    const app = express();
    const layout = new Layout({ name: 'my-layout', pathname: '/' });
    const podletClient = layout.client.register({
        name: 'podlet-registered-name',
        uri: 'http://0.0.0.0:5043/manifest.json',
    });
    app.use(layout.middleware());
    app.get('/', async (req, res) => {
        await podletClient.fetch(res.locals.podium);
        res.sendStatus(200);
    });
    const s2 = stoppable(app.listen(5044), 0);

    // trigger mounting of the proxy with an initial request to the / endpoint
    await fetch('http://0.0.0.0:5044/');

    let result;
    result = await fetch(
        'http://0.0.0.0:5044/podium-resource/podlet-registered-name/api',
    );
    t.equal(
        result.status,
        200,
        'proxy endpoint should use "name" supplied by layout.client.register',
    );
    result = await fetch(
        'http://0.0.0.0:5044/podium-resource/podlet-manifest-name/api',
    );
    t.equal(
        result.status,
        404,
        'proxy endpoint should not use "name" supplied by podlet manifest file',
    );

    s1.stop();
    s2.stop();
});
