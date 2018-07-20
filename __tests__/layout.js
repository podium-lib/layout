'use strict';

const Layout = require('../');

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
        '[object PodiumLayout]'
    );
});

test('Layout() - no value given to "name" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ pathname: '/' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "", for the required argument "name" on the Layout constructor is not defined or not valid.'
    );
});

test('Layout() - invalid value given to "name" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ name: 'foo bar', pathname: '/' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "foo bar", for the required argument "name" on the Layout constructor is not defined or not valid.'
    );
});

test('Layout() - no value given to "pathname" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ name: 'foo' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "", for the required argument "pathname" on the Layout constructor is not defined or not valid.'
    );
});

test('Layout() - invalid value given to "name" argument - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const layout = new Layout({ name: 'foo', pathname: 'foo bar' }); // eslint-disable-line no-unused-vars
    }).toThrowError(
        'The value, "foo bar", for the required argument "pathname" on the Layout constructor is not defined or not valid.'
    );
});
