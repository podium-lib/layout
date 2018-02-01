'use strict';

const Context = require('@podium/context');
const Client = require('@podium/podlet-client');

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

        Object.defineProperty(this, 'chain', {
            value: []
        });

        this.chain.push(this.context.middleware());
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    middleware () {
        return this.chain;
    }
}

module.exports = PodiumLayout;
