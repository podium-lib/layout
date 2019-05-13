/* eslint-disable no-underscore-dangle */

'use strict';

const {
    HttpIncoming,
    template,
    isFunction,
    pathnameBuilder,
    uriIsRelative,
} = require('@podium/utils');
const { validate } = require('@podium/schemas');
const Context = require('@podium/context');
const Metrics = require('@metrics/client');
const objobj = require('objobj');
const Client = require('@podium/client');
const abslog = require('abslog');
const Proxy = require('@podium/proxy');
const merge = require('lodash.merge');
const pkg = require('../package.json');

const _compabillity = Symbol('_compabillity');
const _pathname = Symbol('_pathname');
const _sanitize = Symbol('_sanitize');

const PodiumLayout = class PodiumLayout {
    /* istanbul ignore next */
    constructor({
        name = '',
        pathname = '',
        logger = undefined,
        context = {},
        client = {},
        proxy = {},
    } = {}) {
        if (validate.name(name).error)
            throw new Error(
                `The value, "${name}", for the required argument "name" on the Layout constructor is not defined or not valid.`,
            );

        if (validate.uri(pathname).error)
            throw new Error(
                `The value, "${pathname}", for the required argument "pathname" on the Layout constructor is not defined or not valid.`,
            );

        Object.defineProperty(this, 'name', {
            value: name,
        });

        Object.defineProperty(this, _pathname, {
            value: pathname,
        });

        Object.defineProperty(this, 'cssRoute', {
            value: [],
        });

        Object.defineProperty(this, 'jsRoute', {
            value: [],
        });

        Object.defineProperty(this, 'log', {
            value: abslog(logger),
        });

        Object.defineProperty(this, 'client', {
            value: new Client(
                merge(
                    {
                        name: this.name,
                        logger: this.log,
                    },
                    client,
                ),
            ),
            enumerable: true,
        });

        Object.defineProperty(this, 'context', {
            enumerable: true,
            value: new Context(
                merge(
                    {
                        name: this.name,
                        mountPathname: {
                            pathname: this[_pathname],
                        },
                        publicPathname: {
                            pathname: this[_pathname],
                        },
                        logger: this.log,
                    },
                    context,
                ),
            ),
        });

        Object.defineProperty(this, 'httpProxy', {
            enumerable: true,
            value: new Proxy(
                merge(
                    {
                        pathname: this[_pathname],
                        logger: this.log,
                    },
                    proxy,
                ),
            ),
        });

        Object.defineProperty(this, '_view', {
            value: template,
            writable: true,
        });

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });

        // Skip a tick to ensure the metric stream has been consumed
        setImmediate(() => {
            const moduleVersion = pkg.version;
            const segments = moduleVersion.split('.').map(value => {
                return parseInt(value, 10);
            });

            const versionGauge = this.metrics.gauge({
                name: 'podium_layout_version_info',
                description: '@podium/layout version info',
                labels: {
                    version: moduleVersion,
                    major: segments[0],
                    minor: segments[1],
                    patch: segments[2],
                },
            });

            versionGauge.set(1);
        });

        this.metrics.on('error', error => {
            this.log.error(
                'Error emitted by metric stream in @podium/layout module',
                error,
            );
        });

        // Join metric streams
        this.httpProxy.metrics.pipe(this.metrics);
        this.context.metrics.pipe(this.metrics);
        this.client.metrics.pipe(this.metrics);

        this.client.registry.pipe(this.httpProxy.registry);
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    async process(incoming) {
        incoming.name = this.name;
        incoming.view = this._view;
        incoming.js = this.jsRoute;
        incoming.css = this.cssRoute;

        await this.context.process(incoming);
        await this.httpProxy.process(incoming);
    }

    css({ value = null, prefix = false } = {}) {
        if (!value) {
            const v = this[_compabillity](this.cssRoute);
            return this[_sanitize](v, prefix);
        }

        if (validate.css(value).error) throw new Error(
            `Value for argument variable "value", "${value}", is not valid`,
        );

        this.cssRoute.push({
            value: this[_sanitize](value),
            type: 'default',
        });

        return this[_sanitize](value, prefix);
    }

    js({ value = null, prefix = false, type = 'default' } = {}) {
        if (!value) {
            const v = this[_compabillity](this.jsRoute);
            return this[_sanitize](v, prefix);
        }

        if (validate.js(value).error) throw new Error(
            `Value for argument variable "value", "${value}", is not valid`,
        );

        this.jsRoute.push({
            value: this[_sanitize](value),
            type,
        });

        return this[_sanitize](value, prefix);
    }

    view(fn = null) {
        if (!isFunction(fn)) {
            throw new Error(
                `Value on argument variable "template" must be a function`,
            );
        }
        this._view = fn;
    }

    render(incoming, data) {
        return incoming.render(data);
    }

    middleware() {
        return async (req, res, next) => {
            const incoming = new HttpIncoming(req, res, res.locals);

            try {
                await this.process(incoming);
                // if this is a proxy request then no further work should be done.
                if (incoming.proxy) return;

                // set "incoming" on res.locals.podium
                objobj.set('locals.podium', incoming, res);

                res.podiumSend = data => res.send(this.render(incoming, data));

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    pathname() {
        return this[_pathname];
    }

    [_sanitize](uri, prefix = false) {
        const pathname = prefix ? this.pathname() : '';
        if (uri) {
            return uriIsRelative(uri) ? pathnameBuilder(pathname, uri) : uri;
        }
        return uri;
    }

    // This is here only to cater for compabillity between version 3 and 4
    // Can be removed when deprecation of the .assets terminated
    [_compabillity](arr) {
        const result = arr.map(obj => { return obj.value });
        return (result.length === 0) ? '' : result[0];
    }
};

module.exports = PodiumLayout;
