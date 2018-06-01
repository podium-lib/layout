'use strict';

const Context = require('@podium/context');
const Metrics = require('@podium/metrics');
const Client = require('@podium/podlet-client');
const Proxy = require('@podium/proxy');
const { Transform } = require('readable-stream');

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
    constructor(name, options = {}) {
        Object.defineProperty(this, 'options', {
            value: options,
        });

        Object.defineProperty(this, 'client', {
            value: new Client(this.options),
            enumerable: true,
        });

        Object.defineProperty(this, 'context', {
            value: new Context(name),
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
        this.chain.push(this.proxy.middleware());

        const metrics = new Metrics();
        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: decorateLayoutName(name).pipe(metrics),
        });

        this.client.metrics.pipe(this.metrics);

        this.client.registry.pipe(this.proxy.registry);

        this.proxy.proxy.on('proxyReq', req => {
            this.metrics.metric({
                name: 'layout_request_count',
                description:
                    'Count of requests to layout route and additional resources',
                meta: {
                    type: 'proxy_route',
                    url: req.path,
                    method: req.method,
                },
            });
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    middleware() {
        return this.chain;
    }
};

module.exports = PodiumLayout;
