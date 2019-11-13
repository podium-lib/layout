'use strict';

const { destinationObjectStream } = require('@podium/test-utils');
const { HttpIncoming, AssetJs, AssetCss } = require('@podium/utils');
const stoppable = require('stoppable');
const express = require('express');
const request = require('supertest');
const Podlet = require('@podium/podlet');

const Layout = require('../');

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

test('Layout() - instantiate new layout object - should create an object', () => {
    const layout = new Layout({ name: 'foo', pathname: '/' });
    expect(layout).toBeInstanceOf(Layout);
});

test('Layout() - object tag - should be PodiumLayout', () => {
    const layout = new Layout({ name: 'foo', pathname: '/' });
    expect(Object.prototype.toString.call(layout)).toEqual(
        '[object PodiumLayout]',
    );
});

test('Layout() - no value given to "name" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ pathname: '/' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "", for the required argument "name" on the Layout constructor is not defined or not valid.',
    );
});

test('Layout() - invalid value given to "name" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ name: 'foo bar', pathname: '/' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "foo bar", for the required argument "name" on the Layout constructor is not defined or not valid.',
    );
});

test('Layout() - no value given to "pathname" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ name: 'foo' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "", for the required argument "pathname" on the Layout constructor is not defined or not valid.',
    );
});

test('Layout() - invalid value given to "name" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ name: 'foo', pathname: 'foo bar' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "foo bar", for the required argument "pathname" on the Layout constructor is not defined or not valid.',
    );
});

test('Layout() - should collect metric with version info', done => {
    expect.hasAssertions();

    const layout = new Layout(DEFAULT_OPTIONS);

    const dest = destinationObjectStream(arr => {
        expect(arr[0]).toMatchObject({
            name: 'podium_layout_version_info',
            labels: [
                {
                    name: 'version',
                    // eslint-disable-next-line global-require
                    value: require('../package.json').version,
                },
                {
                    name: 'major',
                    value: expect.any(Number),
                },
                {
                    name: 'minor',
                    value: expect.any(Number),
                },
                {
                    name: 'patch',
                    value: expect.any(Number),
                },
            ],
        });
        done();
    });

    layout.metrics.pipe(dest);

    setImmediate(() => {
        dest.end();
    });
});

test('Layout() - metrics properly decorated', async done => {
    expect.hasAssertions();

    // podlet
    const podletApp = express();

    const podlet = new Podlet({
        name: 'myPodlet',
        version: '1.0.0',
        pathname: '/',
        development: false,
    });
    podletApp.use(podlet.middleware());
    podletApp.get('/manifest.json', (req, res) => {
        res.send(podlet);
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
    expect(layout.pathname()).toBe('/');

    app.use(layout.middleware());

    const podletClient = layout.client.register({
        uri: 'http://localhost:5021/manifest.json',
        name: 'myPodlet',
    });

    app.get('/', async (req, res) => {
        const response = await podletClient.fetch(res.locals.podium.context);
        res.send(response.content);
    });

    layout.metrics.pipe(
        destinationObjectStream(arr => {
            expect(arr[0].name).toBe('podium_layout_version_info');
            expect(arr[0].type).toBe(1);
            expect(arr[0].value).toBe(1);

            expect(arr[1].name).toBe('podium_context_process');
            expect(arr[1].type).toBe(5);

            expect(arr[2].name).toBe('podium_proxy_process');
            expect(arr[2].type).toBe(5);

            expect(arr[3].name).toBe('podium_client_resolver_manifest_resolve');
            expect(arr[3].type).toBe(5);
            expect(arr[3].labels[0]).toEqual({
                name: 'name',
                value: 'myLayout',
            });

            expect(arr[4].name).toBe('podium_client_resolver_fallback_resolve');
            expect(arr[4].type).toBe(5);
            expect(arr[4].labels[0]).toEqual({
                name: 'name',
                value: 'myLayout',
            });

            expect(arr[5].name).toBe('podium_client_resolver_content_resolve');
            expect(arr[5].type).toBe(5);
            expect(arr[5].labels[0]).toEqual({
                name: 'name',
                value: 'myLayout',
            });

            expect(arr[6].name).toBe('podium_context_process');
            expect(arr[6].type).toBe(5);
            expect(arr[6].labels).toEqual([
                { name: 'name', value: 'myLayout' },
            ]);

            expect(arr[7].name).toBe('podium_proxy_process');
            expect(arr[7].type).toBe(5);
            expect(arr[7].labels).toEqual([
                { name: 'name', value: 'myLayout' },
                { name: 'podlet', value: 'myPodlet' },
                { name: 'proxy', value: true },
                { name: 'error', value: false },
            ]);
            done();
        }),
    );

    const s2 = stoppable(app.listen(5022), 0);

    const result = await request('http://localhost:5022').get('/');
    const apiResponse = await request('http://localhost:5022').get(
        '/podium-resource/myPodlet/api',
    );

    expect(result.text).toBe('this is podlet content');
    expect(apiResponse.body).toEqual({ version: '1.0.0' });

    layout.metrics.push(null);
    s1.stop();
    s2.stop();
});

// #############################################
// .css()
// #############################################

test('.css() - call method with no arguments - should return default value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    const result = layout.css();
    expect(result).toEqual('');
});

test('.css() - set legal value on "value" argument - should return set value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);

    const result = layout.css({ value: '/foo/bar' });

    expect(result).toEqual('/foo/bar');
});

test('.css() - set "prefix" argument to "true" - should prefix value returned by method', () => {
    const options = { ...DEFAULT_OPTIONS, pathname: '/xyz' };
    const layout = new Layout(options);

    const result = layout.css({ value: '/foo/bar', prefix: true });

    expect(result).toEqual('/xyz/foo/bar');
});

test('.css() - set legal absolute value on "value" argument - should set "css" to set value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    const result = layout.css({ value: 'http://somewhere.remote.com' });
    expect(result).toEqual('http://somewhere.remote.com');
});

test('.css() - set illegal value on "value" argument - should throw', () => {
    expect.hasAssertions();
    const layout = new Layout(DEFAULT_OPTIONS);

    expect(() => {
        layout.css({ value: '/foo / bar' });
    }).toThrowError(
        'Value for argument variable "value", "/foo / bar", is not valid',
    );
});

test('.css() - call method with "value" argument, then call it a second time with no argument - should return first set value on second call', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.css({ value: '/foo/bar' });
    const result = layout.css();
    expect(result).toEqual('/foo/bar');
});

test('.css() - call method twice with a value for "value" argument - should set both values', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.css({ value: '/foo/bar' });
    layout.css({ value: '/bar/foo' });

    const result = layout.css();
    expect(result).toEqual('/foo/bar');
});

test('.css() - "options" argument as an array - should accept an array of values', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.css([{ value: '/foo/bar' }, { value: '/bar/foo' }]);

    const result = JSON.parse(JSON.stringify(layout.cssRoute));

    expect(result).toEqual([
        { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
        { rel: 'stylesheet', type: 'text/css', value: '/bar/foo' },
    ]);
});

test('.css() - "options" argument as an array - call method twice - should set all values', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.css([{ value: '/foo/bar' }, { value: '/bar/foo' }]);
    layout.css([{ value: '/foo/bar/baz' }, { value: '/bar/foo/baz' }]);

    const result = JSON.parse(JSON.stringify(layout.cssRoute));

    expect(result).toEqual([
        { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
        { rel: 'stylesheet', type: 'text/css', value: '/bar/foo' },
        { rel: 'stylesheet', type: 'text/css', value: '/foo/bar/baz' },
        { rel: 'stylesheet', type: 'text/css', value: '/bar/foo/baz' },
    ]);
});

test('.css() - "options" argument as an array - should NOT set additional keys', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.css([
        { value: '/foo/bar', fake: 'prop' },
        { value: '/bar/foo', prop: 'fake' },
    ]);

    const result = JSON.parse(JSON.stringify(layout.cssRoute));

    expect(result).toEqual([
        { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
        { rel: 'stylesheet', type: 'text/css', value: '/bar/foo' },
    ]);
});

test('.css() - passing an instance of AssetsCss - should return set value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);

    layout.css(new AssetCss({ value: '/foo/bar', type: 'text/css' }));
    const result = JSON.parse(JSON.stringify(layout.cssRoute));

    expect(result).toEqual([
        { rel: 'stylesheet', type: 'text/css', value: '/foo/bar' },
    ]);
});

// #############################################
// .js()
// #############################################

test('.js() - passing an instance of AssetsJs - should return set value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);

    layout.js(new AssetJs({ value: '/foo/bar', type: 'module' }));
    const result = JSON.parse(JSON.stringify(layout.jsRoute));

    expect(result).toEqual([{ type: 'module', value: '/foo/bar' }]);
});

test('.js() - call method with no arguments - should return default value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    const result = layout.js();
    expect(result).toEqual('');
});

test('.js() - set legal value on "value" argument - should return set value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);

    const result = layout.js({ value: '/foo/bar' });

    expect(result).toEqual('/foo/bar');
});

test('.js() - set "prefix" argument to "true" - should prefix value returned by method', () => {
    const options = { ...DEFAULT_OPTIONS, pathname: '/xyz' };
    const layout = new Layout(options);

    const result = layout.js({ value: '/foo/bar', prefix: true });

    expect(result).toEqual('/xyz/foo/bar');
});

test('.js() - set legal absolute value on "value" argument - should set "js" to set value', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    const result = layout.js({ value: 'http://somewhere.remote.com' });
    expect(result).toEqual('http://somewhere.remote.com');
});

test('.js() - set illegal value on "value" argument - should throw', () => {
    expect.hasAssertions();
    const layout = new Layout(DEFAULT_OPTIONS);

    expect(() => {
        layout.js({ value: '/foo / bar' });
    }).toThrowError(
        'Value for argument variable "value", "/foo / bar", is not valid',
    );
});

test('.js() - call method with "value" argument, then call it a second time with no argument - should return first set value on second call', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.js({ value: '/foo/bar' });
    const result = layout.js();
    expect(result).toEqual('/foo/bar');
});

test('.js() - call method twice with a value for "value" argument - should set both values', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.js({ value: '/foo/bar' });
    layout.js({ value: '/bar/foo' });

    const result = layout.js();
    expect(result).toEqual('/foo/bar');
});

test('.js() - "type" argument is set to "module" - should set "type" to "module"', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.js({ value: '/foo/bar' });
    layout.js({ value: '/bar/foo', type: 'module' });

    const result = JSON.parse(JSON.stringify(layout.jsRoute));

    expect(result).toEqual([
        { type: 'default', value: '/foo/bar' },
        { type: 'module', value: '/bar/foo' },
    ]);
});

test('.js() - "options" argument as an array - should accept an array of values', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.js([{ value: '/foo/bar' }, { value: '/bar/foo', type: 'module' }]);

    const result = JSON.parse(JSON.stringify(layout.jsRoute));

    expect(result).toEqual([
        { type: 'default', value: '/foo/bar' },
        { type: 'module', value: '/bar/foo' },
    ]);
});

test('.js() - "options" argument as an array - call method twice - should set all values', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.js([{ value: '/foo/bar' }, { value: '/bar/foo', type: 'module' }]);
    layout.js([
        { value: '/foo/bar/baz' },
        { value: '/bar/foo/baz', type: 'module' },
    ]);

    const result = JSON.parse(JSON.stringify(layout.jsRoute));

    expect(result).toEqual([
        { type: 'default', value: '/foo/bar' },
        { type: 'module', value: '/bar/foo' },
        { type: 'default', value: '/foo/bar/baz' },
        { type: 'module', value: '/bar/foo/baz' },
    ]);
});

test('.js() - "options" argument as an array - should NOT set additional keys', () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    layout.js([
        { value: '/foo/bar', fake: 'prop' },
        { value: '/bar/foo', type: 'module', prop: 'fake' },
    ]);

    const result = JSON.parse(JSON.stringify(layout.jsRoute));

    expect(result).toEqual([
        { type: 'default', value: '/foo/bar' },
        { type: 'module', value: '/bar/foo' },
    ]);
});

// #############################################
// .process()
// #############################################

test('.process() - call method with HttpIncoming - should return HttpIncoming', async () => {
    const layout = new Layout(DEFAULT_OPTIONS);
    const incoming = new HttpIncoming(SIMPLE_REQ, SIMPLE_RES);
    const result = await layout.process(incoming);
    expect(result).toEqual(incoming);
});
/*
test('Layout() - rendering using an object', async () => {
    expect.hasAssertions();

    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });

    app.use(layout.middleware());

    app.get('/', async (req, res) => {
        res.podiumSend({
            body: '<div>should be wrapped in a doc</div>',
        });
    });

    const s1 = stoppable(app.listen(4009), 0);

    const result = await request('http://localhost:4009').get('/');

    expect(result.text).toMatch('<div>should be wrapped in a doc</div>');
    expect(result.text).toMatch('<html lang=');

    s1.stop();
});
*/
test('Layout() - rendering using a string', async () => {
    expect.hasAssertions();

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

    const result = await request('http://localhost:4010').get('/');

    expect(result.text).toMatch('<div>should be wrapped in a doc</div>');
    expect(result.text).toMatch('<html lang=');

    s1.stop();
});

test('Layout() - rendering using a string - with assets', async () => {
    expect.hasAssertions();

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

    const result = await request('http://localhost:4011').get('/');

    expect(result.text).toMatchSnapshot();

    s1.stop();
});

test('Layout() - setting a custom view template', async () => {
    expect.hasAssertions();

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

    const result = await request('http://localhost:4012').get('/');

    expect(result.text).toMatchSnapshot();

    s1.stop();
});
