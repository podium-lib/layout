'use strict';

const CustomContext = require('./custom-context');
const PodiumLayout = require("../..");

const CustomLayout = class CustomLayout extends PodiumLayout {
    constructor(name) {
        super(name, {
            logger: console,
        });

        this.context.register('custom', new CustomContext());
    }

    get [Symbol.toStringTag]() {
        return 'CustomLayout';
    }
};

module.exports = CustomLayout;
