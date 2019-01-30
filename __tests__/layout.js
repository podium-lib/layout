'use strict';

const Podlet = require('@podium/podlet');
const stoppable = require('stoppable');
const express = require('express');
const request = require('supertest');
const stream = require('readable-stream');
const Layout = require('../');

const destObjectStream = done => {
    const arr = [];

    const dStream = new stream.Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
            arr.push(chunk);
            callback();
        },
    });

    dStream.on('finish', () => {
        done(arr);
    });

    return dStream;
};

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
    const s1 = stoppable(podletApp.listen(4002), 0);

    // layout
    const app = express();

    const layout = new Layout({
        name: 'myLayout',
        pathname: '/',
    });
    expect(layout.pathname()).toBe('/');

    app.use(layout.middleware());

    const podletClient = layout.client.register({
        uri: 'http://localhost:4002/manifest.json',
        name: 'myPodlet',
    });

    app.get('/', async (req, res) => {
        const response = await podletClient.fetch(res.locals.podium.context);
        res.send(response);
    });

    layout.metrics.pipe(
        destObjectStream(arr => {
            expect(arr[0].name).toBe('podlet_manifest_request');
            expect(arr[3].name).toBe('podium_proxy_request');
            done();
        }),
    );

    const s2 = stoppable(app.listen(4001), 0);

    const result = await request('http://localhost:4001').get('/');
    const apiResponse = await request('http://localhost:4001').get(
        '/podium-resource/myPodlet/api',
    );

    expect(result.text).toBe('this is podlet content');
    expect(apiResponse.body).toEqual({ version: '1.0.0' });

    layout.metrics.push(null);
    s1.stop();
    s2.stop();
});
