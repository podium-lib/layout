/* eslint-disable no-underscore-dangle */

'use strict';

const schemas = require('@podium/schemas');
const Context = require('@podium/context');
const Metrics = require('@metrics/client');
const Client = require('@podium/client');
const abslog = require('abslog');
const Proxy = require('@podium/proxy');
const merge = require('lodash.merge');
const putils = require('@podium/utils');
const joi = require('joi');
const State = require('./state');

const utils = require('./utils');

const _pathname = Symbol('_pathname');

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
            enumerable: true,
        });

        Object.defineProperty(this, 'proxy', {
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

        const decorate = utils.decorateLayoutName(this.name);

        this.client.metrics
            .pipe(decorate)
            .on('error', err => {
                /* istanbul ignore next */
                this.log.error(err);
            })
            .pipe(this.metrics)
            .on('error', err => {
                /* istanbul ignore next */
                this.log.error(err);
            });

        this.proxy.metrics
            .pipe(decorate)
            .on('error', err => {
                /* istanbul ignore next */
                this.log.error(err);
            })
            .on('error', err => {
                /* istanbul ignore next */
                this.log.error(err);
            });

        this.client.registry.pipe(this.proxy.registry);
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    async process(req, res) {
        let state = new State(req, res);
        state.name = this.name;
        state = await this.context.process(state);
        state = await this.proxy.process(state);
        return state;
    }

    middleware() {
        return async (req, res, next) => {
            try {
                const state = await this.process(req, res);
                if (state) {
                    putils.setAtLocalsPodium(res, 'context', state.context);
                    next();
                }
            } catch(error) {
                next(error);
            }
        };
    }

    pathname() {
        return this[_pathname];
    }
};

module.exports = PodiumLayout;
