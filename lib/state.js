'use strict';

const originalUrl = require('original-url');
const { URL } = require('url');

const noop = str => str;

const PodiumState = class PodiumState {
    constructor(request = {}, response = {}, params = {}) {
        Object.defineProperty(this, 'request', {
            set() {
                throw new Error('Cannot set read-only property.');
            },
            get() {
                return request;
            },
        });

        Object.defineProperty(this, 'response', {
            set() {
                throw new Error('Cannot set read-only property.');
            },
            get() {
                return response;
            },
        });

        const url = originalUrl(request);
        Object.defineProperty(this, 'url', {
            enumerable: true,
            value: url.full ? new URL(url.full) : {},
        });

        Object.defineProperty(this, 'params', {
            enumerable: true,
            value: params,
        });

        Object.defineProperty(this, 'context', {
            enumerable: true,
            value: {},
        });

        Object.defineProperty(this, 'development', {
            enumerable: true,
            writable: true,
            value: false,
        });

        let view = noop;
        Object.defineProperty(this, 'view', {
            set(value) {
                view = value;
            },
            get() {
                return view;
            },
        });

        Object.defineProperty(this, 'name', {
            enumerable: true,
            writable: true,
            value: '',
        });

        Object.defineProperty(this, 'css', {
            enumerable: true,
            writable: true,
            value: '',
        });

        Object.defineProperty(this, 'js', {
            enumerable: true,
            writable: true,
            value: '',
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumState';
    }

    render(fragment) {
        if (this.development) {
            return this.view(fragment, this);
        }
        return fragment;
    }
};

module.exports = PodiumState;
