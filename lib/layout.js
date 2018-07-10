'use strict';

const schemas = require('@podium/schemas');
const Context = require('@podium/context');
const Metrics = require('@podium/metrics');
const Client = require('@podium/client');
const abslog = require('abslog');
const Proxy = require('@podium/proxy');
const { Transform } = require('readable-stream');
const joi = require('joi');

function decorateLayoutName(layoutName) {
    return new Transform({
        objectMode: true,
        transform(metric, encoding, callback) {
            // backwards compatible
            metric.layout = layoutName;

            // correct method
            metric.meta = metric.meta || {};
            metric.meta.layout = layoutName;
            callback(null, metric);
        },
    });
}

const PodiumLayout = class PodiumLayout {
    constructor(options = {}) {
        const validatedName = joi.validate(options.name, schemas.manifest.name);
        if (validatedName.error) {
            throw new Error(
                `The value for "options.name", ${options.name}, is not valid`
            );
        }

        Object.defineProperty(this, 'name', {
            value: validatedName.value,
        });

        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'options', {
            value: { proxy: {}, ...options },
        });

        const { publicPathname } = this.options.proxy;

        Object.defineProperty(this, 'client', {
            value: new Client(this.options),
            enumerable: true,
        });

        Object.defineProperty(this, 'context', {
            value: new Context({
                name: this.name,
                publicPathname,
            }),
            enumerable: true,
        });

        Object.defineProperty(this, 'proxy', {
            value: new Proxy(this.options),
            enumerable: true,
        });

        Object.defineProperty(this, 'chain', {
            value: [],
        });

        this.chain.push(this.context.middleware());
        this.chain.push(this.proxy.middleware(publicPathname));

        const metrics = new Metrics();
        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: decorateLayoutName(this.name).pipe(metrics),
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
};

module.exports = PodiumLayout;
