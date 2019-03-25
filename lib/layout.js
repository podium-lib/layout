/* eslint-disable no-underscore-dangle */

'use strict';

const { HttpIncoming } = require('@podium/utils');
const schemas = require('@podium/schemas');
const Context = require('@podium/context');
const Metrics = require('@metrics/client');
const Client = require('@podium/client');
const abslog = require('abslog');
const Proxy = require('@podium/proxy');
const merge = require('lodash.merge');
const putils = require('@podium/utils');
const joi = require('joi');

const utils = require('./utils');

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
        Object.defineProperty(this, 'name', {
            value: joi.attempt(
                name,
                schemas.manifest.name,
                new Error(
                    `The value, "${name}", for the required argument "name" on the Layout constructor is not defined or not valid.`,
                ),
            ),
        });

        Object.defineProperty(this, _pathname, {
            value: joi.attempt(
                pathname,
                schemas.manifest.uri,
                new Error(
                    `The value, "${pathname}", for the required argument "pathname" on the Layout constructor is not defined or not valid.`,
                ),
            ),
        });

        Object.defineProperty(this, 'cssRoute', {
            value: '',
            writable: true,
        });

        Object.defineProperty(this, 'jsRoute', {
            value: '',
            writable: true,
        });

        Object.defineProperty(this, 'log', {
            value: abslog(logger),
        });

        Object.defineProperty(this, 'client', {
            value: new Client(
                merge(
                    {
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

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });

        this.metrics.on('error', error => {
            this.log.error(
                'Error emitted by metric stream in @podium/layout module',
                error,
            );
        });

        const decorate = utils.decorateLayoutName(this.name);

        decorate.on('error', error => {
            this.log.error(
                'Error emitted when decorating metric stream in @podium/layout module',
                error,
            );
        });

        // Join metric streams
        this.httpProxy.metrics.pipe(decorate);
        this.context.metrics.pipe(decorate);
        this.client.metrics.pipe(decorate);
        decorate.pipe(this.metrics);

        this.client.registry.pipe(this.httpProxy.registry);
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    async process(incoming) {
        const s = incoming;
        s.name = this.name;

        const s1 = await this.context.process(s);
        const s2 = await this.httpProxy.process(s1);
        return s2;
    }

    css({ value = null, prefix = false } = {}) {
        if (!value) {
            return this[_sanitize](this.cssRoute, prefix);
        }

        if (this.cssRoute) {
            throw new Error('Value for "css" has already been set');
        }

        joi.attempt(
            value,
            schemas.manifest.css,
            new Error(
                `Value on argument variable "value", "${value}", is not valid`,
            ),
        );

        this.cssRoute = this[_sanitize](value);

        return this[_sanitize](this.cssRoute, prefix);
    }

    js({ value = null, prefix = false } = {}) {
        if (!value) {
            return this[_sanitize](this.jsRoute, prefix);
        }

        if (this.jsRoute) {
            throw new Error('Value for "js" has already been set');
        }

        joi.attempt(
            value,
            schemas.manifest.js,
            new Error(
                `Value on argument variable "value", "${value}", is not valid`,
            ),
        );

        this.jsRoute = this[_sanitize](value);

        return this[_sanitize](this.jsRoute, prefix);
    }

    middleware() {
        return (req, res, next) => {
            const incoming = new HttpIncoming(req, res, res.locals);

            this.process(incoming)
                .then(result => {
                    if (result) {
                        putils.setAtLocalsPodium(
                            res,
                            'context',
                            incoming.context,
                        );
                        next();
                    }
                })
                .catch(error => {
                    next(error);
                });
        };
    }

    pathname() {
        return this[_pathname];
    }

    [_sanitize](uri, prefix = false) {
        const pathname = prefix ? this.pathname() : '';
        if (uri) {
            return putils.uriIsRelative(uri)
                ? putils.pathnameBuilder(pathname, uri)
                : uri;
        }
        return uri;
    }
};

module.exports = PodiumLayout;
