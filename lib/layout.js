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
            metric.layout = layoutName;
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
            value: new Proxy(name, this.client, {useZipkin: false}, this.options),
            enumerable: true,
        });

        Object.defineProperty(this, 'chain', {
            value: []
        });

        this.chain.push(this.context.middleware());
        this.chain.push(this.proxy.middleware());

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });
        this.client.metrics.pipe(decorateLayoutName(name)).pipe(this.metrics);
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    middleware () {
        return this.chain;
    }
}

module.exports = PodiumLayout;
