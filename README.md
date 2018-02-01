# layout


```js
const express = require('express');
const Layout = require('@podium/layout');

const layout = new Layout('my-layout');
const podlet = layout.client.register({ ... });

const app = express();
app.use(layout.middleware());

app.get('/', (req, res, next) => {
    Promise
        .all([
            example.fetch(),
        ])
        .then((result) => {
            res.status(200).send(result[0]);
        });
});

app.listen(7000);
```