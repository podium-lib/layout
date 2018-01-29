'use strict';

const EventEmitter = require('events');
const Client = require('@podium/podlet-client');

const PodiumLayout = class PodiumLayout extends EventEmitter {
    constructor() {
        super();

        Object.defineProperty(this, 'client', {
            value: new Client(),
            enumerable: true,
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }
}

module.exports = PodiumLayout;
