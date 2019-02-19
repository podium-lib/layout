# @podium/layout

Module for composing full page layouts out of page fragments in a micro frontend architecture.

[![Build Status](https://travis-ci.org/podium-lib/layout.svg?branch=master)](https://travis-ci.org/podium-lib/layout)
[![Greenkeeper badge](https://badges.greenkeeper.io/podium-lib/layout.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/podium-lib/layout/badge.svg)](https://snyk.io/test/github/podium-lib/layout)

Module for building a layout server. A layout server is mainly responsible for fetching HTML content
from [podlets](https://github.com/podium-lib/layout) and stitching these fragments into an full HTML
page (called a layout in Podium speak).

To do this, a layout instance provides three core features:

-   `@podium/client` used to fetch content from podlets
-   `@podium/context` used to set request bound information on the requests from the layout to podlets when fetching their content
-   `@podium/proxy` makes it possible to publicly expose data endpoints in a podlet or in any backend service

This module can be used together with a plain node.js http server or any http framework and any templating
language of your choosing (or none if you prefer). Though; Connect compatible middleware based frameworks
(such as express.js) is first class in Podium so this module comes with a `.middleware()` method for convenience.

For writing layout servers with other http frameworks the following modules exist:

-   [Hapi Layout Plugin](https://github.com/podium-lib/hapi-layout)

## Installation

```bash
$ npm install @podium/layout
```

## Simple usage

Build a simple layout server including a single podlet using Express.js:

```js
const express = require('express');
const Layout = require('@podium/layout');

const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

const podlet = layout.client.register({
    name: 'myPodlet',
    uri: 'http://localhost:7100/manifest.json',
});

const app = express();
app.use(layout.middleware());

app.get('/', (req, res, next) => {
    const ctx = res.locals.podium.context;
    Promise.all([podlet.fetch(ctx)]).then(result => {
        res.status(200).send(`
                <html><body>
                    <section>${result[0]}</section>
                </body></html>
            `);
    });
});

app.listen(7000);
```

## Constructor

Create a new Layout instance.

```js
const layout = new Layout(options);
```

### options

| option   | default | type     | required | details                                                             |
| -------- | ------- | -------- | -------- | ------------------------------------------------------------------- |
| name     | `null`  | `string` | `true`   | Name that the layout identifies itself by                           |
| pathname | `null`  | `string` | `true`   | Pathname of where a Layout is mounted in a http server              |
| logger   | `null`  | `object` | `false`  | A logger which conform to a log4j interface                         |
| context  | `null`  | `object` | `false`  | Options to be passed on to the internal @podium/context constructor |
| client   | `null`  | `object` | `false`  | Options to be passed on to the internal @podium/client constructor  |
| proxy    | `null`  | `object` | `false`  | Options to be passed on to the internal @podium/proxy constructor   |

#### name

Name that the layout identifies itself by. The name value must be in camelCase.

Example:

```js
const layout = new Layout({
    name: 'myLayoutName',
    pathname: '/foo',
});
```

#### pathname

The Pathname of where the Layout is mounted into the HTTP server. It is important that this value matches where the entry point of a route is in the HTTP server
since this value is used to mount the proxy and tell podlets (through the context) where they are mounted and where the proxy is mounted.

If the layout is mounted at the server "root", set `pathname` to `/`:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

app.use(layout.middleware());

app.get('/', (req, res, next) => {
    [ ... ]
});
```

If the layout is mouned at `/foo`, set pathname to `/foo`:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
});

app.use('/foo', layout.middleware());

app.get('/foo', (req, res, next) => {
    [ ... ]
});

app.get('/foo/:id', (req, res, next) => {
    [ ... ]
});
```

There is also a helper method for retrieving the set `pathname` which can
be used to get the pathname from the Layout object when defining routes.
See [`.pathname()`](#pathname-1) for further details.

#### logger

Any log4j compatible logger can be passed in and will be used for logging.
Console is also supported for easy test / development.

Example:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
    logger: console,
});
```

Under the hood [abslog](https://github.com/trygve-lie/abslog) is used to
abstract out logging. Please see [abslog](https://github.com/trygve-lie/abslog)
for further details.

#### context

Options to be passed on to the internal @podium/context constructor.

Please see the [@podium/context constructor](https://github.com/podium-lib/context#constructor)
for which options can be set.

Example of setting the `debug` context to default `true`:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
    context: {
        debug: {
            enabled: true,
        },
    },
});
```

#### client

Options to be passed on to the internal @podium/client constructor.

Please see [@podium/client constructor](https://github.com/podium-lib/client#constructor)
for which options which can be set.

Example of setting the `retries` on the client to `6`:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
    client: {
        retries: 6,
    },
});
```

#### proxy

Options to be passed on to the internal @podium/proxy constructor.

Please see [@podium/proxy constructor](https://github.com/podium-lib/proxy#constructor)
for which options which can be set.

Example of setting the `timeout` on the proxy to 30 seconds:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
    proxy: {
        timeout: 30000,
    },
});
```

## API

The Layout instance has the following API:

### .process(HttpIncoming)

Metod for processing a incomming http request. This method is intended to be used
to implement support for multiple http frameworks and should not really be used
directly in a layout server.

What it does:

-   Runs [context parsers](https://github.com/podium-lib/context) on the incomming request and sets an object with the context at `HttpIncoming.context` which can be passed on to the client when requesting content from podlets.
-   Mounts the [proxy](https://github.com/podium-lib/proxy) so each podlet can do transparent proxy requests if needed.

Returns a Promise. If the inbound request does match a proxy endpoint the returned Promise will resolve with
`undefined`. If the inbound request does not match a proxy endpoint the returned Promise will resolve with the
passed in `HttpIncoming` object.

The method take the following arguments:

#### HttpIncoming (required)

An instance of a [HttpIncoming object](https://github.com/podium-lib/utils/blob/master/lib/http-incoming.js).

```js
const { HttpIncoming } = require('@podium/utils');
const Layout = require('@podium/layout');

const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

app.use(async (req, res, next) => {
    const incoming = new HttpIncoming(req, res, res.locals);
    try {
        const result = await layout.process(incoming);
        if (result) {
            res.locals.podium = result;
            next();
        }
    } catch (error) {
        next(error);
    }
});
```

### .middleware()

A Connect compatible middleware which takes care of the operations needed for
a layout to fully work. It is more or less a wrapper for the `.process()` method.

**Important:** This middleware must be mounted before defining any routes.

Example

```js
const app = express();
app.use(layout.middleware());
```

The context generated by the middleware will be stored at `res.locals.podium.context`.

Returns an Array of internal middleware performing the tasks described above.

### .pathname()

A helper method to retrieve the `pathname` set on the constructor. This can be
handy to use in defining routes since the `pathname` set in the constructor
must match whatever is defined as root in each route in a HTTP router.

Example:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo'
});

app.get(layout.pathname(), (req, res, next) => {
    [ ... ]
});

app.get(`${layout.pathname()}/bar`, (req, res, next) => {
    [ ... ]
});

app.get(`${layout.pathname()}/bar/:id`, (req, res, next) => {
    [ ... ]
});
```

### .client

A property that exposes an instance of the @podium/client for fetching content
from podlets.

Example of registering a podlet and fetching it:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

const podlet = layout.client.register({
    name: 'myPodlet',
    uri: 'http://localhost:7100/manifest.json',
});

podlet.fetch({}).then(result => {
    console.log(result);
});
```

Please see the [@podium/client module](https://github.com/podium-lib/client)
for full documentation.

### .context

A property that exposes an instance of the @podium/context used to create a
context.

Example of registering a custom third party context parser to the context:

```js
const Parser = require('my-custom-parser');

const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

layout.context.register('customParser', new Parser('someConfig'));
```

Please see the [@podium/context module](https://github.com/podium-lib/context)
for full documentation.

### .metrics

Property that exposes a metric stream. This stream joins all internal metrics streams into one stream resulting in all metrics
from all sub modules being exposed here.

Please see the [@podium/metrics module](https://github.com/podium-lib/metrics)
for full documentation.
