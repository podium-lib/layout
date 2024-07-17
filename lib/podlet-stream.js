import EventEmitter from 'stream';

/**
 * Helper class that wraps multiple Podium podlet streams in one
 * easy to consume stream for layouts. It emits the same events
 * as an individual podlet stream, with the following timings:
 *
 * - `beforeStream` emits once all podlets have emitted their event of the same name.
 *   It contains a merged payload that includes all podlet CSS and JS assets.
 * - `data` is emitted once an individual podlet emits its `end` event.
 *   It contains the full response for that podlet.
 * - `end` is emitted after the `data` event is emitted for the last remaining podlet.
 *
 * @example
 *
 * ```js
 * let podletStream = new PodletStream(incoming);
 *
 *
 * ```
 */
export class PodletStream extends EventEmitter {
    /**
     * @param {import("@podium/utils").HttpIncoming} incoming
     */
    #incoming;

    /**
     * @param {import("@podium/utils").HttpIncoming} incoming
     */
    constructor(incoming) {
        super();
        this.#incoming = incoming;
    }

    /**
     * @param {import("@podium/client").PodiumClientResource[]} podlets
     */
    from(podlets) {
        /**
         * @typedef {object} BeforeStreamPayload
         * @property {Array<import("@podium/utils").AssetJs>} js
         * @property {Array<import("@podium/utils").AssetCss>} css
         */

        /** @type {Map<string, BeforeStreamPayload>} */
        let assets = new Map();
        /** @type {Map<string, string[]>} */
        let contents = new Map();

        let didEmitBeforeStream = false;
        /** @type {string[]} */
        let queue = [];
        let done = 0;

        for (let podlet of podlets) {
            podlet
                .stream(this.#incoming)
                .once(
                    'beforeStream',
                    /**
                     * @param {BeforeStreamPayload} data
                     */
                    (data) => {
                        assets.set(podlet.name, data);

                        // emit once all assets are in place
                        if (assets.size === podlets.length) {
                            /** @type {BeforeStreamPayload} */
                            let merged = {
                                css: [],
                                js: [],
                            };
                            for (let value of assets.values()) {
                                merged.css.push(...value.css);
                                merged.js.push(...value.js);
                            }
                            this.emit('beforeStream', merged);
                            didEmitBeforeStream = true;
                        }
                    },
                )
                .on('data', (chunk) => {
                    let buffer = contents.get(podlet.name);
                    if (buffer) {
                        buffer.push(chunk);
                        return;
                    }
                    contents.set(podlet.name, [chunk]);
                })
                .on('end', () => {
                    let toEmit = `<div slot="${podlet.name}">${contents.get(
                        podlet.name,
                    )}</div>`;

                    if (!didEmitBeforeStream) {
                        queue.push(toEmit);
                        return;
                    } else if (queue.length !== 0) {
                        do {
                            let toEmit = queue.pop();
                            this.emit('data', toEmit);
                            done += 1;
                        } while (queue.length !== 0);
                    }

                    this.emit('data', toEmit);
                    done += 1;

                    if (done === podlets.length) {
                        this.emit('end');
                    }
                });
        }

        return this;
    }
}
