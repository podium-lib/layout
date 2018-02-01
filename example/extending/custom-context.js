'use strict';

const CustomContextParser = class CustomContextParser {
    get [Symbol.toStringTag]() {
        return 'CustomContextParser';
    }

    parse(req) {
        return new Promise(resolve => {
            resolve('custom-context-value');
        });
    }
};

module.exports = CustomContextParser;
