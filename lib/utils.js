'use strict';

const { Transform } = require('readable-stream');

module.exports.decorateLayoutName = layoutName =>
    new Transform({
        objectMode: true,
        transform(metric, encoding, callback) {
            metric.meta.layout = layoutName;
            callback(null, metric);
        },
    });
