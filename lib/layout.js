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
        name = undefined,
        pathname = '/',
        logger = undefined,
        context = {},
        client = {},
        proxy = {},
    } = {}) {
        const validatedName = joi.attempt(
            name,
            schemas.manifest.name,
            new Error(`The value for "name", ${name}, is not valid`)
        );

        Object.defineProperty(this, 'name', {
            value: validatedName,
        });

        Object.defineProperty(this, _pathname, {
            value: pathname,
        });

        Object.defineProperty(this, 'log', {
            value: abslog(logger),
        });

        Object.defineProperty(this, 'client', {
            value: new Client(merge({
                logger: this.log,
            }, client)),
            enumerable: true,
        });

        Object.defineProperty(this, 'context', {
            value: new Context(merge({
                name: this.name,
                mountPathname: {
                    pathname: this[_pathname],
                },
                publicPathname: {
                    pathname: this[_pathname],
                },
                logger: this.log,
            }, context)),
            enumerable: true,
        });

        Object.defineProperty(this, 'proxy', {
            value: new Proxy(merge({
                pathname: this[_pathname],
                logger: this.log,
            }, proxy)),
            enumerable: true,
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
