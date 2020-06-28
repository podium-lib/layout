/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */

'use strict';

const {
    HttpIncoming,
    template,
    isFunction,
    pathnameBuilder,
    uriIsRelative,
    AssetCss,
    AssetJs,
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
const _addCssAsset = Symbol('_addCssAsset');
const _addJsAsset = Symbol('_addJsAsset');

function deprecateJsReturn() {
    if (!deprecateJsReturn.warned) {
        deprecateJsReturn.warned = true;
        process.emitWarning(
            'Return value from method js() is now deprecated and will be removed in a future version. Please do not rely on this value.',
            'DeprecationWarning',
        );
    }
}

function deprecateCssReturn() {
    if (!deprecateCssReturn.warned) {
        deprecateCssReturn.warned = true;
        process.emitWarning(
            'Return value from method css() is now deprecated and will be removed in a future version. Please do not rely on this value.',
            'DeprecationWarning',
        );
    }
}

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

    [_addCssAsset](options = {}) {
        if (!options.value) {
            const v = this[_compabillity](this.cssRoute);
            return this[_sanitize](v, options.prefix);
        }

        const clonedOptions = JSON.parse(JSON.stringify(options));
        const args = { ...clonedOptions, pathname: this._pathname };
        this.cssRoute.push(new AssetCss(args));

        // deprecate
        deprecateCssReturn();
        return this[_sanitize](args.value, args.prefix);
    }

    css(options = {}) {
        if (Array.isArray(options)) {
            for (const opts of options) {
                this[_addCssAsset](opts);
            }
            return;
        }
        return this[_addCssAsset](options);
    }

    [_addJsAsset](options = {}) {
        if (!options.value) {
            const v = this[_compabillity](this.jsRoute);
            return this[_sanitize](v, options.prefix);
        }

        const clonedOptions = JSON.parse(JSON.stringify(options));
        const args = { ...clonedOptions, pathname: this._pathname };

        // Convert data attribute object structure to array of key value objects
        if (typeof args.data === 'object' && args.data !== null) {
            const data = [];
            Object.keys(args.data).forEach((key) => {
                data.push({
                    value: args.data[key],
                    key,
                });
            })
            args.data = data;
        }

        this.jsRoute.push(new AssetJs(args));

        // deprecate
        deprecateJsReturn();
        return this[_sanitize](args.value, args.prefix);
    }

    js(options = {}) {
        if (Array.isArray(options)) {
            for (const opts of options) {
                this[_addJsAsset](opts);
            }
            return;
        }
        return this[_addJsAsset](options);
    }

    view(fn = null) {
        if (!isFunction(fn)) {
            throw new Error(
                `Value on argument variable "template" must be a function`,
            );
        }
        this._view = fn;
    }

    render(incoming, data, ...args) {
        return this._view(incoming, data, ...args);
    }

    async process(incoming, { proxy = true, context = true } = {}) {
        incoming.name = this.name;
        incoming.css = [...this.cssRoute];
        incoming.js = [...this.jsRoute];

        if (context) await this.context.process(incoming);
        if (proxy) await this.httpProxy.process(incoming);

        return incoming;
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

                res.podiumSend = (data, ...args) =>
                    res.send(this.render(incoming, data, ...args));

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
        const result = arr.map(obj => {
            return obj.value;
        });
        return result.length === 0 ? '' : result[0];
    }
};

module.exports = PodiumLayout;
