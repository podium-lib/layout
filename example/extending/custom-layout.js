import CustomContext from './custom-context.js';
import PodiumLayout from '../../lib/layout.js';

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

export default CustomLayout;
