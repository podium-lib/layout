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

| option         | default   | type     | required |
| -------------- | --------- | -------- | -------- |
| name           | `null`    | `string` | `true`   |
| logger         | `console` | `object` | `false`  |

#### name

Name that the layout identifies itself by. The name value must be in camelCase

Example

```js
const layout = new Layout({
    name: 'myLayoutName';
});
```

#### logger

Any log4j compatible logger can be passed in and will be used for logging.
Console is also supported for easy test / development.

Example

```js
const layout = new Layout({
    logger: console;
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
