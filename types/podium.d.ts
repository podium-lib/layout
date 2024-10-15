declare global {
    namespace Express {
        export interface PodiumHttpIncomingParameters {
            [key: string]: unknown;
        }

        /**
         * In a layout setting the values on the context are serialized to HTTP headers
         * and mainly intended as an "outbox" for information that is sent to the podlet.
         */
        export interface PodiumHttpIncomingContext {
            /**
             * @see https://podium-lib.io/docs/guides/context#default-context-variables
             */
            'podium-debug'?: string;
            /**
             * Does user agent sniffing to try to guess the visitor's device type.
             * @see https://podium-lib.io/docs/guides/context#default-context-variables
             */
            'podium-device-type'?: string;
            /**
             * Locale information from the layout.
             * @see https://podium-lib.io/docs/guides/context#default-context-variables
             */
            'podium-locale'?: string;
            /**
             * Used to calculate the podlet's public URL when proxied behind a layout.
             * @see https://podium-lib.io/docs/guides/context#construct-public-urls
             */
            'podium-mount-origin'?: string;
            /**
             * Used to calculate the podlet's public URL when proxied behind a layout.
             * @see https://podium-lib.io/docs/guides/context#construct-public-urls
             */
            'podium-mount-pathname'?: string;
            /**
             * Used to calculate the podlet's public URL when proxied behind a layout.
             * @see https://podium-lib.io/docs/guides/context#construct-public-urls
             */
            'podium-public-pathname'?: string;
            /**
             * Name of the caller.
             */
            'podium-requested-by'?: string;
            [key: string]: unknown;
        }

        export interface PodiumHttpIncomingViewParameters {
            [key: string]: unknown;
        }

        export interface Locals {
            podium: HttpIncoming<
                PodiumHttpIncomingParameters,
                PodiumHttpIncomingContext,
                PodiumHttpIncomingViewParameters
            >;
        }

        export interface Response {
            /**
             * This method wraps the provided fragment in a default HTML document before dispatching.
             *
             * @param markup The HTML contents of the document
             * @param args Parameters sent to the template function
             *
             * @see https://podium-lib.io/docs/api/layout#respodiumsendfragment
             */
            podiumSend(fragment: string, ...args: unknown[]): Response;
        }
    }
}
