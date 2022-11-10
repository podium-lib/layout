/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */

import {
    HttpIncoming,
    template,
    isFunction,
    pathnameBuilder,
    uriIsRelative,
    AssetCss,
    AssetJs,
} from '@podium/utils';
import * as schema from '@podium/schemas';
import Context from '@podium/context';
import Metrics from '@metrics/client';
import objobj from 'objobj';
import Client from '@podium/client';
import abslog from 'abslog';
import Proxy from '@podium/proxy';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pkgJson = fs.readFileSync(join(currentDirectory, '../package.json'), 'utf-8');
const pkg = JSON.parse(pkgJson);

const _pathname = Symbol('_pathname');
const _sanitize = Symbol('_sanitize');
const _addCssAsset = Symbol('_addCssAsset');
const _addJsAsset = Symbol('_addJsAsset');

export default class PodiumLayout {
    constructor({
        name = '',
        pathname = '',
        logger = undefined,
        context = {},
        client = {},
        proxy = {},
    } = {}) {
        if (schema.name(name).error)
            throw new Error(
                `The value, "${name}", for the required argument "name" on the Layout constructor is not defined or not valid.`,
            );

        if (schema.uri(pathname).error)
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
                { name: this.name, logger: this.log, ...client},
            ),
            enumerable: true,
        });

        Object.defineProperty(this, 'context', {
            enumerable: true,
            value: new Context(
                { name: this.name,
                    mountPathname: {
                        pathname: this[_pathname],
                    },
                    publicPathname: {
                        pathname: this[_pathname],
                    },
                    logger: this.log,
                ...context},
            ),
        });

        Object.defineProperty(this, 'httpProxy', {
            enumerable: true,
            value: new Proxy(
                { pathname: this[_pathname], logger: this.log, ...proxy},
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
            const segments = moduleVersion.split('.').map(value => parseInt(value, 10));

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

        // Register proxy endpoints
        this.client.registry.on('set', (key, item) => {
            this.httpProxy.register(item.newVal);
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    [_addCssAsset](options = {}) {
       const clonedOptions = JSON.parse(JSON.stringify(options));
       clonedOptions.value = this[_sanitize](clonedOptions.value, clonedOptions.prefix)
       const args = { prefix: true, ...clonedOptions, pathname: this._pathname };
       this.cssRoute.push(new AssetCss(args));
    }

    css(options = {}) {
        if (Array.isArray(options)) {
            for (const opts of options) {
                this[_addCssAsset](opts);
            }
            return;
        }
        this[_addCssAsset](options);
    }

    [_addJsAsset](options = {}) {
        const clonedOptions = JSON.parse(JSON.stringify(options));
        clonedOptions.value = this[_sanitize](clonedOptions.value, clonedOptions.prefix)

        const args = { prefix: true, ...clonedOptions, pathname: this._pathname };

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
    }

    js(options = {}) {
        if (Array.isArray(options)) {
            for (const opts of options) {
                this[_addJsAsset](opts);
            }
            return;
        }
        this[_addJsAsset](options);
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
            incoming.url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

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
};
