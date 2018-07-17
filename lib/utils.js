'use strict';

const { Transform } = require('readable-stream');

module.exports.decorateLayoutName = layoutName =>
    new Transform({
        objectMode: true,
        transform(metric, encoding, callback) {
            // backwards compatible
            metric.layout = layoutName;

            // correct method
            metric.meta = metric.meta || {};
            metric.meta.layout = layoutName;
            callback(null, metric);
        },
    });
