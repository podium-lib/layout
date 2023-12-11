import { HttpIncoming, AssetJs, AssetCss } from '@podium/utils';
import PodiumClient, { PodiumClientOptions } from '@podium/client';
import PodiumContext from '@podium/context';
import PodiumProxy, { PodiumProxyOptions } from '@podium/proxy';
import MetricsClient from '@metrics/client';

// Use declaration merging to extend Express.
declare global {
    namespace Express {
        interface Locals {
            podium: HttpIncoming & {
                context: PodiumContext;
            };
        }

        interface Response {
            podiumSend(fragment: string, ...args: unknown[]): Response;
        }
    }
}

declare class PodiumLayout {
    readonly client: PodiumClient;
    readonly metrics: MetricsClient;
    readonly context: any;
    readonly httpProxy: PodiumProxy;

    /**
     *
     * @example
     *  const express = require('express');
     *  const PodiumLayout = require('@podium/layout');
     *
     *  const layout = new PodiumLayout({
     *      name: 'myLayout',
     *      pathname: '/',
     *  });
     *
     *  const podlet = layout.client.register({
     *      name: 'myPodlet',
     *      uri: 'http://localhost:7100/manifest.json',
     *  });
     *
     *  const app = express();
     *  app.use(layout.middleware());
     *
     *  app.get('/', (req, res, next) => {
     *      const ctx = res.locals.podium.context;
     *      Promise.all([podlet.fetch(ctx)]).then(result => {
     *          res.status(200).send(`
     *                  <html><body>
     *                      <section>${result[0]}</section>
     *                  </body></html>
     *              `);
     *      });
     *  });
     *
     *  app.listen(7000);
     */
    constructor(options: PodiumLayout.LayoutOptions): Layout;

    middleware(): (req: any, res: any, next: any) => void;

    pathname(): string;

    js(options?: Partial<AssetJs> | Array<Partial<AssetJs>>): string;

    readonly jsRoute: AssetJs[];

    css(options?: Partial<AssetCss> | Array<Partial<AssetCss>>): string;

    readonly cssRoute: AssetCss[];

    view(
        template: (
            incoming: HttpIncoming,
            // TODO: figure out if ViewData is still supported, or if the readme is outdated
            fragment: string | PodiumLayout.ViewData,
            ...args: unknown[]
        ) => string,
    ): void;

    render<T = { [key: string]: unknown }>(
        incoming: HttpIncoming<T>,
        // TODO: figure out if ViewData is still supported, or if the readme is outdated
        fragment: string | PodiumLayout.ViewData,
        ...args: unknown[]
    ): string;

    process<T = { [key: string]: unknown }>(
        incoming: HttpIncoming<T>,
        options?: PodiumLayout.ProcessOptions,
    ): Promise<HttpIncoming<T>>;
}

declare namespace PodiumLayout {
    export type PodiumContextOptions = {
        name?: string;
        debug?: {
            /**
             * @default false
             */
            enable?: boolean;
        };
        locale?: {
            /**
             * A bcp47 compliant locale String
             * @default 'en-US'
             */
            locale?: string;
        };
        deviceType?: {
            /**
             * Number of UA Strings to keep in the LRU cache
             * @default 10000
             */
            cacheSize?: number;
        };
        mountOrigin?: {
            /**
             * Origin string that, if present, will override the origin found on request
             *
             * @default null
             */
            origin?: string | null;
        };
        mountPathname?: {
            /**
             * Pathname specifying where a Layout is mounted in an HTTP server
             * @default '/'
             */
            pathname?: string;
        };
        publicPathname?: {
            /**
             * Pathname where a Proxy is mounted in a HTTP server
             * @default '/'
             */
            pathname?: string;
            /**
             * Namespace used to isolate the proxy from other routes under the same pathname
             * @default 'podium-resource'
             */
            prefix?: string;
        };
    };

    type AbsLogger = {
        trace: LogFunction;
        debug: LogFunction;
        info: LogFunction;
        warn: LogFunction;
        error: LogFunction;
        fatal: LogFunction;
    };

    type LogFunction = (...args: any) => void;

    export type LayoutOptions = {
        name: string;
        pathname: string;
        logger?: AbsLogger | Console;
        /**
         * Options for `@podium/context`
         */
        context?: PodiumContextOptions;
        /**
         * Options for `@podium/client`
         */
        client?: PodiumClientOptions;
        /**
         * Options for `@podium/proxy`
         */
        proxy?: PodiumProxyOptions;
    };

    export type ProcessOptions = {
        /**
         * If `@podium/context` should be applied as part of the `.process()` method
         * @default true
         */
        context?: boolean;
        /**
         * If `@podium/proxy` should be applied as part of the `.process()` method
         * @default true
         */
        proxy?: boolean;
    };

    export type ViewData = {
        title?: string;
        /**
         * @default 'en-US'
         */
        locale?: string;
        /**
         * @default 'utf-8'
         */
        encoding?: string;
        head?: string;
        js?: string;
        css?: string;
        body?: string;
    };
}

export default PodiumLayout;
