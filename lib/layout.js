'use strict';

const schemas = require('@podium/schemas');
const Context = require('@podium/context');
const Metrics = require('@podium/metrics');
const Client = require('@podium/client');
const abslog = require('abslog');
const Proxy = require('@podium/proxy');
const merge = require('lodash.merge');
const joi = require('joi');

const utils = require('./utils');

const _pathname = Symbol('_pathname');

const PodiumLayout = class PodiumLayout {
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
                    `The value, "${name}", for the required argument "name" on the Layout constructor is not defined or not valid.`
                )
            ),
        });

        Object.defineProperty(this, _pathname, {
            value: joi.attempt(
                pathname,
                schemas.manifest.uri,
                new Error(
                    `The value, "${pathname}", for the required argument "pathname" on the Layout constructor is not defined or not valid.`
                )
            ),
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
                    client
                )
            ),
            enumerable: true,
        });

        Object.defineProperty(this, 'context', {
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
                    context
                )
            ),
            enumerable: true,
        });

        Object.defineProperty(this, 'proxy', {
            value: new Proxy(
                merge(
                    {
                        pathname: this[_pathname],
                        logger: this.log,
                    },
                    proxy
                )
            )
        });

        Object.defineProperty(this, 'chain', {
            value: [],
        });

        this.chain.push(this.context.middleware());
        this.chain.push(this.proxy.middleware());

        const metrics = new Metrics();
        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: utils.decorateLayoutName(this.name).pipe(metrics),
        });

        this.client.metrics.pipe(this.metrics);

        this.client.registry.pipe(this.proxy.registry);
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    middleware() {
        return this.chain;
    }

    pathname() {
        return this[_pathname];
    }
};

module.exports = PodiumLayout;
