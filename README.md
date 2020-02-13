# @podium/layout

A Module for composing full page layouts out of page fragments in a micro frontend
architecture.

See the [official Podium documentation](https://podium-lib.io/) site.

[![Dependencies](https://img.shields.io/david/podium-lib/layout.svg)](https://david-dm.org/podium-lib/layout)
[![GitHub Actions status](https://github.com/podium-lib/layout/workflows/Run%20Lint%20and%20Tests/badge.svg)](https://github.com/podium-lib/layout/actions?query=workflow%3A%22Run+Lint+and+Tests%22)
[![Known Vulnerabilities](https://snyk.io/test/github/podium-lib/layout/badge.svg)](https://snyk.io/test/github/podium-lib/layout)

Module for building a layout server. A layout server is mainly responsible for
fetching HTML fragments and stitching these fragments into an full HTML page.

To do this, a layout instance provides three core features:

-   `@podium/client` used to fetch content from podlets
-   `@podium/context` used to set request bound information on the requests from the layout to podlets when fetching their content
-   `@podium/proxy` makes it possible to publicly expose data endpoints in a podlet or in any backend service

This module can be used together with a plain node.js HTTP server or any HTTP
framework and any templating language of your choosing (or none if you prefer).

_Note:_ Connect compatible middleware based frameworks (such as [Express]) are considered
first class in Podium so this module provides a `.middleware()` method for
convenience.

For writing layout servers with other HTTP frameworks the following modules exist:

-   [Hapi Layout Plugin]

## Installation

```bash
$ npm install @podium/layout
```

## Simple usage

Build a simple layout server including a single podlet using [Express]:

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

The Pathname of where the Layout is mounted into the HTTP server. It is
important that this value matches where the entry point of a route is in the
HTTP server since this value is used to mount the proxy and tell podlets
(through the context) where they are mounted and where the proxy is mounted.

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

If the layout is mounted at `/foo`, set pathname to `/foo`:

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

There is also a helper method for retrieving the set `pathname` which can be
used to get the pathname from the Layout object when defining routes.
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

Under the hood [abslog] is used to abstract out logging. Please see [abslog] for
further details.

#### context

Options to be passed on to the internal [@podium/context constructor].

Please see the [@podium/context constructor] for which options can be set.

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

Options to be passed on to the internal [@podium/client constructor].

Please see [@podium/client constructor] for which options which can be set.

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

Options to be passed on to the internal [@podium/proxy constructor].

Please see [@podium/proxy constructor] for which options which can be set.

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

### .process(HttpIncoming, options)

Method for processing an incoming HTTP request. This method is intended to be
used to implement support for multiple HTTP frameworks and it should not normally be
necessary to use this method directly when creating a layout server.

What it does:

-   Runs [@podium/context] parsers on the incoming request and sets an object with the context at `HttpIncoming.context` which can be passed on to the client when requesting content from podlets.
-   Mounts the [@podium/proxy] so each podlet can do transparent proxy requests if needed.

Returns a Promise. If the inbound request matches a proxy endpoint the returned
Promise will resolve with `undefined`. If the inbound request does not match a
proxy endpoint the returned Promise will resolve with the passed in
[HttpIncoming] object.

The method takes the following arguments:

#### HttpIncoming (required)

An instance of an [HttpIncoming] class.

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

#### options

| option  | default | type      | required | details                                                                   |
| ------- | ------- | --------- | -------- | ------------------------------------------------------------------------- |
| context | `true`  | `boolean` | `false`  | If `@podium/context` should be applied as part of the `.process()` method |
| proxy   | `true`  | `boolean` | `false`  | If `@podium/proxy` should be applied as part of the `.process()` method   |

### .render(httpIncoming, data)

This method is intended to be used to implement support for multiple HTTP frameworks and it should not normally be
necessary to use this method directly when creating a layout server.

This method is used by `.podiumSend()` when using the [Express] HTTP framework.

The method takes the following arguments:

#### HttpIncoming (required)

An instance of the [HttpIncoming] class.

```js
const { HttpIncoming } = require('@podium/utils');
const Layout = require('@podium/layout');
const express = require('express);

const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

const app = express();

app.get('/', (req, res) => {
    const incoming = new HttpIncoming(req, res, res.locals)
    layout.render(incoming, '<div>content to render</div>');
});
```

#### data

An HTML string or an object with the following shape:

-   `data.title` - document title
-   `data.locale` - language tag/locale identifier defaults to `en-US`
-   `data.encoding` - defaults to `utf-8`
-   `data.head` - Any additional HTML markup that should be placed in the document `<head>`
-   `data.js` - JavaScript URL, will be used as a `src` value in a script tag
-   `data.css` - CSS URL, will be used as an `href` value in a link tag
-   `data.body` - HTML body markup to be rendered

Using a string

```js
layout.render(incoming, '<div>content to render</div>');
```

Using a data object

```js
layout.render(incoming, {
    title: 'my doc title',
    body: '<div>my content</div>',
});
```

### .middleware()

A Connect compatible middleware which takes care of the operations needed for
a layout to fully work. This method is more or less a wrapper for the `.process()` method.

**Important:** This middleware must be mounted before defining any routes.

Example

```js
const app = express();
app.use(layout.middleware());
```

The context generated by the middleware will be stored at
`res.locals.podium.context`.

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

### .js(options)

Sets the pathname for a Layout's JavaScript assets.

`options` can be either an object or an array of options objects as described below.

When a value is set it will be kept internally and returned when the method is called again.

### options

| option | type      | default   | required |
| ------ | --------- | --------- | -------- |
| value  | `string`  |           |          |
| prefix | `boolean` | `false`   |          |
| type   | `string`  | `default` |          |

#### value

Used to set the pathname for the JavaScript assets for the Layout. The value
can be a URL at which the Layout's user facing JavaScript is served. The value
can be the [pathname] of a [URL] or an absolute URL.

_Examples:_

Serve a javascript file at `/assets/main.js`:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

layout.js({ value: '/assets/main.js' });

// or

layout.js([{ value: '/assets/main.js' }, { value: '/assets/secondary.js' }]);
```

Serve assets statically along side the app and set a relative URI to the
JavaScript file:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

app.use('/assets', express.static('./app/files/assets'));
layout.js({ value: '/assets/main.js' });
```

Set an absolute URL to where the JavaScript file is located:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

layout.js({ value: 'http://cdn.mysite.com/assets/js/e7rfg76.js' });
```

#### prefix

Specify whether the method should prefix the return value with the value for
`pathname` set in the constructor.

_Examples:_

Return the full pathname, `/foo/assets/main.js`, to the JavaScript assets:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
});

layout.js({ value: '/assets/main.js', prefix: true });
```

Prefix will be ignored if the returned value is an absolute URL.

#### type

Set the type of script which is set. `default` indicates an unknown type.
`module` inidcates as ES6 module.

### .css(options)

Sets the pathname for a Layout's CSS assets.

`options` can be either an object or an array of options objects as described below.

When a value is set it will be kept internally and returned when the method is called again.

### options

| option | type      | default | required |
| ------ | --------- | ------- | -------- |
| value  | `string`  |         |          |
| prefix | `boolean` | `false` |          |

#### value

Used to set the pathname for the CSS assets for the Layout. The value can be a
URL at which the Layout's user facing CSS is served. The value can be the
[pathname] of a [URL] or an absolute URL.

The value can be set only once. If called multiple times with a value, the
method will throw. The method can be called multiple times to retrieve the
value though.

_Examples:_

Serve a CSS file at `/assets/main.css`:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

layout.css({ value: '/assets/main.css' });

// or

layout.css([{ value: '/assets/main.css' }, { value: '/assets/secondary.css' }]);
```

Serve assets from a static file server and set a relative URI to the CSS file:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

app.use('/assets', express.static('./app/files/assets'));
layout.css({ value: '/assets/main.css' });
```

Set an absolute URL to where the CSS file is located:

```js
const layout = new Layout({
    name: 'myLayout',
    pathname: '/',
});

layout.css({ value: 'http://cdn.mysite.com/assets/css/3ru39ur.css' });
```

#### prefix

Sets whether the method should prefix the return value with the value for
`pathname` set in the constructor.

_Examples:_

Return the full pathname (`/foo/assets/main.css`) to the CSS assets:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
    pathname: '/foo',
});

layout.css({ value: '/assets/main.css', prefix: true });
```

Prefix will be ignored if the returned value is an absolute URL

### .view(template)

Override the default encapsulating HTML document.

Takes a function with the following shape:

```js
layout.view(data => `<!doctype html>
<html lang="${data.locale}">
    <head>
        <meta charset="${data.encoding}">
        <title>${data.title}</title>
        <link href="${data.css}" rel="stylesheet">
        <script src="${data.js}" defer></script>
        ${data.head}
    </head>
    <body>
        ${data.body}
    </body>
</html>`;
);
```

### res.podiumSend(fragment)

Method on the `http.ServerResponse` object for sending an HTML fragment. Calls
the send / write method on the `http.ServerResponse` object.

This method will wrap the provided fragment in a default HTML document before dispatching.
You can use the `.view()` method to disable using a template or to set a custom template.

_Example of sending an HTML fragment:_

```js
app.get(layout.pathname(), (req, res) => {
    res.podiumSend('<h1>Hello World</h1>');
});
```

_Example of sending additional content with an HTML fragment:_

```js
app.get(layout.pathname(), (req, res) => {
    res.podiumSend({
        title: 'Document title',
        head: '<script src="additional-script.js" defer></script>',
        body: '<h1>Hello World</h1>',
    });
});
```

### .client

A property that exposes an instance of the [@podium/client] for fetching content
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

Please see [@podium/client] for full documentation.

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

Please see [@podium/context] for full documentation.

### .metrics

Property that exposes a metric stream. This stream joins all internal metrics
streams into one stream resulting in all metrics from all sub modules being
exposed here.

Please see [@metrics/metric] for full documentation.

## License

Copyright (c) 2019 FINN.no

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[express]: https://expressjs.com/ 'Express'
[hapi layout plugin]: https://github.com/podium-lib/hapi-layout 'Hapi Layout Plugin'
[@podium/client constructor]: https://github.com/podium-lib/client#constructor '@podium/client constructor'
[@podium/proxy constructor]: https://github.com/podium-lib/proxy#constructor '@podium/proxy constructor'
[@podium/context]: https://github.com/podium-lib/context '@podium/context'
[@podium/client]: https://github.com/podium-lib/client '@podium/client'
[@podium/proxy]: https://github.com/podium-lib/proxy '@podium/proxy'
[httpincoming]: https://github.com/podium-lib/utils/blob/master/lib/http-incoming.js 'HttpIncoming'
[@metrics/metric]: https://github.com/metrics-js/metric '@metrics/metric'
[abslog]: https://github.com/trygve-lie/abslog 'abslog'
