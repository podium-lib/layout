/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */

import {
    HttpIncoming,
    // @ts-ignore
    template,
    // @ts-ignore
    isFunction,
    // @ts-ignore
    pathnameBuilder,
    // @ts-ignore
    uriIsRelative,
    AssetCss,
    AssetJs,
} from '@podium/utils';
import * as schema from '@podium/schemas';
import Context from '@podium/context';
import Metrics from '@metrics/client';
import objobj from 'objobj';
import Client from '@podium/client';
import abslog from 'abslog';
import Proxy from '@podium/proxy';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pkgJson = fs.readFileSync(
    join(currentDirectory, '../package.json'),
    'utf-8',
);
const pkg = JSON.parse(pkgJson);

/**
 * @typedef {(...args: any) => void} LogFunction
 * @typedef {{ trace: LogFunction, debug: LogFunction, info: LogFunction, warn: LogFunction, error: LogFunction, fatal: LogFunction }} AbsLogger
 *
 * @typedef {Object} LayoutOptions
 * @property {string} name - (required) layout name
 * @property {string} pathname - (required) layout pathname
 * @property {Console | AbsLogger} [logger] - A logger to use when provided. Can be the console object if console logging is desired but can also be any Log4j compatible logging object as well. Nothing is logged if no logger is provided. (default null)
 * @property {LayoutContext} [context] - Options to be passed on to the internal `@podium/context` constructor. See that module for details. (default null)
 * @property {LayoutClientOptions} [client] - Options to be passed on to the internal `@podium/client` constructor. See that module for details. (default null)
 * @property {import("@podium/proxy").default.PodiumProxyOptions} [proxy] - Options to be passed on to the internal `@podium/proxy` constructor. See that module for details. (default null)
 *
 *
 * @typedef {Object} LayoutContext
 * @property {{enabled: boolean}} [debug] - Config object passed on to the debug parser. (default { enabled: false })
 * @property {Object} [locale] - Config object passed on to the locale parser.
 * @property {Object} [deviceType] - Config object passed on to the device type parser.
 * @property {Object} [mountOrigin] - Config object passed on to the mount origin parser.
 * @property {Object} [mountPathname] - Config object passed on to the mount pathname parser.
 * @property {Object} [publicPathname] - Config object passed on to the public pathname parser.
 *
 * @typedef {Object} LayoutClientOptions
 * @property {number} [retries=4] - Number of times the client should retry settling a version number conflict before terminating. (default 4)
 * @property {number} [timeout=1000] - Default value, in milliseconds, for how long a request should wait before the connection is terminated. (default 1000)
 * @property {number} [maxAge=Infinity] - Default value, in milliseconds, for how long manifests should be cached. (default Infinity)
 *
 * @typedef {{ as?: string | false | null, crossorigin?: string | null | boolean, disabled?: boolean | '' | null, hreflang?: string | false | null, title?: string | false | null, media?: string | false | null, rel?: string | false | null, type?: string | false | null, value: string | false | null, data?: Array<{ key: string; value: string }>, strategy?: "beforeInteractive" | "afterInteractive" | "lazy", scope?: "content" | "fallback" | "all", [key: string]: any }} AssetCssLike
 * @typedef {{ value: string | null, crossorigin?: string | null | boolean, type?: string | null | false, integrity?: string | null | false, referrerpolicy?: string | null | false, nomodule?: boolean | null | '', async?: boolean | null | '', defer?: boolean | null | '', data?: Array<{ key: string; value: string }>, strategy?: "beforeInteractive" | "afterInteractive" | "lazy", scope?: "content" | "fallback" | "all", [key: string]: any }} AssetJsLike
 */
export default class PodiumLayout {
    /**
     * Podium document template. A custom document template is set by using the .view() method in the podlet and layout modules.
     *
     * @see https://podium-lib.io/docs/api/document
     *
     * @example ```js
     * const layout = new Layout({ ... });
     * layout.view(myDocumentTemplate);
     * ```
     */
    #view = template;

    /**
     * Name that the layout identifies itself by (set in the constructor).
     * This value must be in camelCase.
     *
     * @see https://podium-lib.io/docs/api/layout/#name
     *
     * @example ```js
     * const layout = new Layout({
     *     name: 'myLayoutName',
     *     pathname: '/foo',
     * });
     * ```
     */
    name = '';

    /**
     * The Pathname to where the layout is mounted in an HTTP server.
     * It is important that this value matches the entry point of the route where content is served in the HTTP server
     * since this value is used to mount the proxy and inform podlets (through the Podium context) where they are mounted and where the proxy is mounted.
     * If the layout is mounted at the server "root", set the pathname to /:
     *
     * @see https://podium-lib.io/docs/api/layout/#pathname
     */
    #pathname = '';

    /**
     * A logger. The abstract logger "Abslog" is used to make it possible to provide different kinds of loggers.
     * The logger can be provided via the 'logger' constructor argument.
     *
     * @see https://www.npmjs.com/package/abslog
     *
     * @example ```js
     * const layout = new Layout({ logger: console, ... });
     * layout.log.trace('trace log to the console')
     * layout.log.debug('debug log to the console')
     * layout.log.info('info log to the console')
     * layout.log.warn('warn log to the console')
     * layout.log.error('error log to the console')
     * layout.log.fatal('fatal log to the console')
     * ```
     *
     * @type {AbsLogger}
     */
    log;

    /**
     * An instance of the `@podium/proxy` module
     * @see https://github.com/podium-lib/proxy
     *
     * @type{import("@podium/proxy").default}
     */
    httpProxy;

    /**
     * Options to be passed on to the context parsers. See the `@podium/context` module for details.
     *
     * @example ```js
     * const layout = new Layout({
     *     name: 'myLayout',
     *     pathname: '/foo',
     *     context: {
     *         debug: {
     *             enabled: true,
     *         },
     *     },
     * });
     * ```
     *
     * @see https://podium-lib.io/docs/api/layout/#context
     * @see https://podium-lib.io/docs/layout/context
     * @see https://podium-lib.io/docs/podlet/context
     *
     * @type {LayoutContext}
     */
    context;

    /**
     * Property that holds information about a Cascading Style Sheet related to a layout.
     *
     * @see https://podium-lib.io/docs/api/assets#assetcss
     * @see https://podium-lib.io/docs/api/assets
     *
     * @example ```js
     * const podlet = layout.client.register({
     *     name: 'myPodlet',
     *     uri: 'http://localhost:7100/manifest.json',
     * });
     *
     * app.get(layout.pathname(), async (req, res, next) => {
     *     const incoming = res.locals.podium;
     *
     *     const response = await podlet.fetch(incoming);
     *
     *     console.log(incoming.css)  // array with the layouts and podlets AssetCSS objects     *
     *
     *     [ ... ]
     * });
     * ```
     *
     * @type {AssetCss[]}
     */
    cssRoute = [];

    /**
     * Property that holds information about a layout's Javascript client side assets.
     *
     * @see https://podium-lib.io/docs/api/assets#assetjs
     * @see https://podium-lib.io/docs/api/assets
     *
     * @example ```js
     * const podlet = layout.client.register({
     *     name: 'myPodlet',
     *     uri: 'http://localhost:7100/manifest.json',
     * });
     *
     * app.get(layout.pathname(), async (req, res, next) => {
     *     const incoming = res.locals.podium;
     *
     *     const response = await podlet.fetch(incoming);
     *
     *     console.log(response.js)   // array with the podlets AssetJS objects
     *
     *     [ ... ]
     * });
     * ```
     *
     * @type {AssetJs[]}
     */
    jsRoute = [];

    /**
     * Metrics client stream object that can be used to consume metrics out of a Podium layout.
     * @see https://www.npmjs.com/package/@metrics/client for detailed documentation
     *
     * @example
     * ```js
     * const layout = new Layout(...);
     * layout.metrics.pipe(...);
     * // or
     * layout.metrics.on('data', chunk => { ... });
     * ```
     *
     * @type {import("@metrics/client")}
     */
    metrics = new Metrics();

    constructor({
        name = '',
        pathname = '',
        logger = undefined,
        context = {},
        client = {},
        proxy = {},
    }) {
        if (schema.name(name).error)
            throw new Error(
                `The value, "${name}", for the required argument "name" on the Layout constructor is not defined or not valid.`,
            );

        if (schema.uri(pathname).error)
            throw new Error(
                `The value, "${pathname}", for the required argument "pathname" on the Layout constructor is not defined or not valid.`,
            );

        this.name = name;
        this.#pathname = this.#sanitize(pathname);
        this.log = abslog(logger);
        this.client = new Client({
            name: this.name,
            logger: this.log,
            ...client,
        });
        this.httpProxy = new Proxy({
            pathname: this.#pathname,
            logger: this.log,
            ...proxy,
        });
        this.context = new Context({
            name: this.name,
            mountPathname: {
                pathname: this.#pathname,
            },
            publicPathname: {
                pathname: this.#pathname,
            },
            logger: this.log,
            ...context,
        });

        // Skip a tick to ensure the metric stream has been consumed
        setImmediate(() => {
            const moduleVersion = pkg.version;
            const segments = moduleVersion
                .split('.')
                .map((value) => parseInt(value, 10));

            const versionGauge = this.metrics.gauge({
                name: 'podium_layout_version_info',
                description: '@podium/layout version info',
                labels: {
                    version: moduleVersion,
                    major: segments[0],
                    minor: segments[1],
                    patch: segments[2],
                },
            });

            versionGauge.set(1);
        });

        this.metrics.on('error', (error) => {
            this.log.error(
                'Error emitted by metric stream in @podium/layout module',
                error,
            );
        });

        // Join metric streams
        this.httpProxy.metrics.pipe(this.metrics);
        // @ts-ignore
        this.context.metrics.pipe(this.metrics);
        this.client.metrics.pipe(this.metrics);

        // Register proxy endpoints
        // @ts-ignore
        this.client.registry.on('set', (key, item) => {
            // @ts-ignore
            this.httpProxy.register(key, item.newVal);
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumLayout';
    }

    /**
     * Takes an AssetCss instance or an object with equivalent properties, converts it to an AssetCss instance if necessary and adds it to the
     * cssRoute array.
     * @param { AssetCss | AssetCssLike } options
     * @returns {void}
     */
    #addCssAsset(options) {
        const clonedOptions = JSON.parse(JSON.stringify(options));
        clonedOptions.value = this.#sanitize(
            clonedOptions.value,
            clonedOptions.prefix,
        );
        const args = {
            prefix: true,
            ...clonedOptions,
            pathname: this.#pathname,
        };
        this.cssRoute.push(new AssetCss(args));
    }
    /**
     * Set relative or absolute URLs to Cascading Style Sheets (CSS) assets for the layout.
     * When set the values will be internally kept and made available for the document template to include.
     * This method can be called multiple times with a single options object to set multiple assets or one can provide an array of options objects to set multiple assets.
     * @see https://podium-lib.io/docs/api/layout/#cssoptionsoptions
     * @see https://podium-lib.io/docs/api/assets#assetcss
     * @see https://podium-lib.io/docs/api/assets
     *
     * @example ```js
     * const app = express();
     * const layout = new Layout({
     *     name: 'myLayout',
     *     pathname: '/',
     * });
     *
     * app.get('/assets.css', (req, res) => {
     *     res.status(200).sendFile('./src/js/main.css', err => {});
     * });
     *
     * layout.css({ value: '/assets.css' });
     * ```
     *
     * @param { AssetCss | AssetCss[] | AssetCssLike | AssetCssLike[] } options
     * @returns {void}
     */
    css(options) {
        if (Array.isArray(options)) {
            for (const opts of options) {
                this.#addCssAsset(opts);
            }
            return;
        }
        this.#addCssAsset(options);
    }

    /**
     * Takes an AssetJs instance or an object with equivalent properties, converts it to an AssetJs instance if necessary and adds it to the
     * jsRoute array.
     * @param { AssetJs | AssetJsLike } options
     * @returns {void}
     */
    #addJsAsset(options) {
        const clonedOptions = JSON.parse(JSON.stringify(options));
        clonedOptions.value = this.#sanitize(
            clonedOptions.value,
            clonedOptions.prefix,
        );

        const args = {
            prefix: true,
            ...clonedOptions,
            pathname: this.#pathname,
        };

        // Convert data attribute object structure to array of key value objects
        if (typeof args.data === 'object' && args.data !== null) {
            const data = [];
            Object.keys(args.data).forEach((key) => {
                data.push({
                    value: args.data[key],
                    key,
                });
            });
            args.data = data;
        }

        this.jsRoute.push(new AssetJs(args));
    }

    /**
     * Set relative or absolute URLs to JavaScript assets for the layout.
     * When set, the values will be internally kept and made available for the document template to include.
     * This method can be called multiple times with a single options object to set multiple assets or one can provide an array of options objects to set multiple assets.
     *
     * @see https://podium-lib.io/docs/api/layout/#jsoptionsoptions
     * @see https://podium-lib.io/docs/api/assets#assetjs
     * @see https://podium-lib.io/docs/api/assets
     *
     * @example ```js
     * const app = express();
     * const layout = new Layout({
     *     name: 'myLayout',
     *     pathname: '/',
     * });
     *
     * app.get('/assets.js', (req, res) => {
     *     res.status(200).sendFile('./src/js/main.js', err => {});
     * });
     *
     * layout.js({ value: '/assets.js' });
     * ```
     *
     * @param {AssetJs | AssetJs[] | AssetJsLike | AssetJsLike[] } [options]
     * @returns {void}
     */
    js(options) {
        if (Array.isArray(options)) {
            for (const opts of options) {
                this.#addJsAsset(opts);
            }
            return;
        }
        this.#addJsAsset(options);
    }

    /**
     * Sets the default document template.
     * Takes a template function that accepts an instance of HttpIncoming, a content string as well as any additional markup for the document's head section:
     * ```js
     * (incoming, body, head) => `Return an HTML string here`;
     * ```
     *
     * @see https://podium-lib.io/docs/api/layout/#viewtemplate
     * @see https://podium-lib.io/docs/api/document
     *
     * @example
     * A document template can be provided using the layout.view method
     * ```js
     * layout.view((incoming, body, head) => `<!doctype html>
     * <html lang="${incoming.context.locale}">
     *     <head>
     *         <meta charset="${incoming.view.encoding}">
     *         <title>${incoming.view.title}</title>
     *         ${head}
     *     </head>
     *     <body>
     *         ${body}
     *     </body>
     * </html>`;
     * );
     * ```
     *
     * @template {{ [key: string]: unknown }} T
     * @param {( incoming: HttpIncoming<T>, fragment: string, ...args: unknown[]) => string} fn
     * @returns {void}
     */
    view(fn) {
        if (!isFunction(fn)) {
            throw new Error(
                `Value on argument variable "template" must be a function`,
            );
        }
        this.#view = fn;
    }

    /**
     * Method to render the document template. By default this will render a default document template provided by Podium unless a custom one is set by using the .view method.
     * In most HTTP frameworks this method can be ignored in favour of res.podiumSend(). If present, res.podiumSend() has the advantage that it's not necessary to pass in HttpIncoming as the first argument.
     * @see https://podium-lib.io/docs/api/layout#renderhttpincoming-fragment-args
     *
     * @example
     * ```js
     * layout.view = (incoming, body, head) => {
     *     return `
     *         <html>
     *             <head>${head}</head>
     *             <body>${body}</body>
     *         </html>
     *     `;
     * };
     *
     * app.get(layout.pathname(), (req, res) => {
     *     const incoming = res.locals.podium;
     *
     *     const head = `<meta ..... />`;
     *     const body = `<section>my content</section>`;
     *
     *     const document = layout.render(incoming, body, head);
     *
     *     res.send(document);
     * });
     * ```
     *
     * @template {{ [key: string]: unknown }} T
     * @param {HttpIncoming<T>} incoming - Instance of Podium HttpIncoming object
     * @param {string} data - the content as an HTML markup string
     * @param  {...any} args - additional args depending on the template and what values it accepts
     * @returns {string}
     */
    render(incoming, data, ...args) {
        return this.#view(incoming, data, ...args);
    }

    /**
     * Method for processing an incoming HTTP request. This method is intended to be used to implement support for multiple HTTP frameworks and in most cases it won't be necessary for layout developers to use this method directly when creating a layout server.
     * What it does:
     * * Runs context parsers on the incoming request and sets an object with the context at HttpIncoming.context which can be passed on to the client when requesting content from podlets.
     * * Mounts a proxy so that each podlet can do transparent proxy requests as needed.
     * * Returns a Promise which will resolve with the HttpIncoming object that was passed in.
     *
     * If the inbound request matches a proxy endpoint the returned Promise will resolve with a HttpIncoming object where the .proxy property is set to true.
     *
     * @see https://podium-lib.io/docs/api/layout#processhttpincoming
     * @see https://podium-lib.io/docs/api/incoming
     *
     * @example
     * ```js
     * import { HttpIncoming } from '@podium/utils';
     * import Layout from '@podium/layout';
     *
     * const layout = new Layout({
     *     name: 'myLayout',
     *     pathname: '/',
     * });
     *
     * const server = http.createServer(async (req, res) => {
     *     const incoming = new HttpIncoming(req, res);
     *
     *     try {
     *         const result = await layout.process(incoming);
     *         if (result.proxy) return;
     *
     *         res.statusCode = 200;
     *         res.setHeader('Content-Type', 'application/json');
     *         res.end(JSON.stringify(result));
     *     } catch (error) {
     *         res.statusCode = 500;
     *         res.setHeader('Content-Type', 'text/plain');
     *         res.end('Internal server error');
     *     }
     * });
     * ```
     *
     * @param {HttpIncoming} incoming
     * @param {{ proxy?: boolean, context?: boolean }} [options]
     * @returns {Promise<HttpIncoming>}
     */
    async process(incoming, { proxy = true, context = true } = {}) {
        incoming.name = this.name;
        incoming.css = [...this.cssRoute];
        incoming.js = [...this.jsRoute];

        // @ts-ignore
        if (context) await this.context.process(incoming);
        if (proxy) await this.httpProxy.process(incoming);

        return incoming;
    }

    /**
     * A Connect/Express compatible middleware function which takes care of the various operations needed for a layout to operate correctly. This function is more or less just a wrapper for the .process() method.
     * The middleware will create an HttpIncoming object for each request and place it on the response at res.locals.podium.
     *
     * **Important:** *This middleware must be mounted before defining any routes.*
     *
     * @see https://podium-lib.io/docs/api/layout#middleware
     *
     * @example
     * ```js
     * const app = express();
     * app.use(layout.middleware());
     * ```
     *
     * @returns {(req: any, res: any, next: function) => Promise<void>}
     */
    middleware() {
        return async (req, res, next) => {
            const incoming = new HttpIncoming(req, res, res.locals);
            // @ts-ignore
            incoming.url = `${req.protocol}://${req.get('host')}${
                req.originalUrl
            }`;

            try {
                await this.process(incoming);
                // if this is a proxy request then no further work should be done.
                if (incoming.proxy) return;

                // set "incoming" on res.locals.podium
                objobj.set('locals.podium', incoming, res);

                res.podiumSend = (data, ...args) =>
                    res.send(this.render(incoming, data, ...args));

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * A helper method used to retrieve the pathname value that was set in the constructor. This can be handy when defining routes since the pathname set in the constructor must also be the base path for the layout's main content route
     * (set in the constructor)
     *
     * @see https://podium-lib.io/docs/api/layout/#pathname
     *
     * @example
     * The method returns the value of `pathname` as defined in the layout constructor
     * ```js
     * const layout = new Layout({ pathname: '/foo', ... });
     * layout.pathname() // /foo
     * ```
     *
     * @example
     * This method is typically used when defining routes to ensure the pathname is prepended to any routes
     * ```js
     * const layout = new Layout({
     *     name: 'myLayout',
     *     pathname: '/foo',
     * });
     *
     * app.get(layout.pathname(), (req, res, next) => {
     *     [ ... ]
     * });
     *
     * app.get(`${layout.pathname()}/bar`, (req, res, next) => {
     *     [ ... ]
     * });
     *
     * app.get(`${layout.pathname()}/bar/:id`, (req, res, next) => {
     *     [ ... ]
     * });
     * ```
     *
     * @returns {string}
     */
    pathname() {
        return this.#pathname;
    }

    /**
     * Sanitizes a uri and returns the resulting uri.
     * If prefix is true (default false) and the uri is relative, the layout pathname will be prepended to the uri
     * @param {string} uri
     * @param {boolean} prefix
     * @returns {string}
     */
    #sanitize(uri, prefix = false) {
        const pathname = prefix ? this.#pathname : '';
        if (uri) {
            // @ts-ignore
            return uriIsRelative(uri)
                ? // @ts-ignore
                  pathnameBuilder(pathname, uri)
                : uri;
        }
        return uri;
    }
}
