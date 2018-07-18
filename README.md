# @podium/layout

[![Build Status](https://travis.schibsted.io/Podium/layout.svg?token=qt273uGfEz64UyWuNHJ1&branch=master)](https://travis.schibsted.io/Podium/layout)

Module for building a Layout server.


## Installation

```bash
$ npm i @podium/layout
```

## Simple usage

Build a simple Layout server with Express including one podlet:

```js
const express = require('express');
const Layout = require('@podium/layout');

const layout = new Layout({ name: 'myLayout' });
const podlet = layout.client.register({
    name: 'myPodlet',
    uri: 'http://localhost:7100/manifest.json',
});

const app = express();
app.use(layout.middleware());

app.get('/', (req, res, next) => {
    Promise
        .all([
            podlet.fetch(),
        ])
        .then((result) => {
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

| option         | default   | type     | required | details                                                |
| -------------- | --------- | -------- | -------- | ------------------------------------------------------ |
| name           | `null`    | `string` | `true`   | Name that the layout identifies itself by              |
| pathname       | `/`       | `string` | `false`  | Pathname of where a Layout is mounted in a http server |
| logger         | `null`    | `object` | `false`  | A logger which conform to a log4j interface            |


#### name

Name that the layout identifies itself by. The name value must be in camelCase

Example

```js
const layout = new Layout({
    name: 'myLayoutName',
});
```

#### pathname

Pathname of where a Layout is mounted in a http server. It is important that
this value match with where the entry point of a route are in a http server
since this value is used to mount the proxy and tell podlets, through the
context, where they are mounted and where the proxy is mounted.

The default value for `pathname` is `/` so if the layout is mounted on "root",
this is perfectly fine:

```js
const app = express();
const layout = new Layout({
    name: 'myLayout',
});

app.use(layout.middleware());

app.get('/', (req, res, next) => {
    [ ... ]
});
```

But if the layout is mouned on ex `/foo` one should do like this:

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

#### logger

Any log4j compatible logger can be passed in and will be used for logging.
Console is also supported for easy test / development.

Example

```js
const layout = new Layout({
    name: 'myLayout',
    logger: console,
});
```

Under the hood [abslog](https://github.com/trygve-lie/abslog) is used to
abstract out logging. Please see [abslog](https://github.com/trygve-lie/abslog)
for further details.


## API

The Layout instance has the following API:


### .middleware()

A connect compatible middleware which takes care of multiple operations needed for
a Layout to fully work.

It does:

 * Runs [context parsers](https://github.schibsted.io/Podium/context) on incomming requests and creates a  object on the `res.locals.podium.context` which can be passed on to the client requesting content from each podlet.
 * Mounts the [proxy](https://github.schibsted.io/Podium/proxy) so each podlet can do transparent proxy requests if needed.

This middleware should be mounted before defining any routes.

Example

```js
const app = express();
app.use(layout.middleware());
```

Returns an Array of internal middleware performing the tasks described above.
