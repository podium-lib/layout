import * as utils from '@podium/utils';
import { ResponseStream } from './response-stream.js';

/**
 * @param {import('@podium/utils').PodiumHttpIncoming} incoming Typically res.local.podium
 * @param {string | import('./response-stream.js')} [body=''] HTML content for <body> or a writeable stream to write the template to
 * @param {string} [head=''] HTML content for <head>
 * @returns {string | undefined} HTML document as a string
 */
export const document = (incoming, body = '', head = '') => {
    let scripts = incoming.js;
    let styles = incoming.css;
    const lang =
        incoming.view.locale ||
        incoming.context['podium-locale'] ||
        incoming.context.locale ||
        incoming.params?.locale ||
        'en-US';

    // backwards compatibility for scripts and styles
    if (typeof incoming.js === 'string')
        scripts = [{ type: 'default', value: incoming.js }];
    if (typeof incoming.css === 'string')
        styles = [{ type: 'text/css', value: incoming.css, rel: 'stylesheet' }];

    const documentHeaders = /* html */ `<!doctype html>
    <html lang="${lang}">
        <head>
            <meta charset="${
                incoming.view.encoding ? incoming.view.encoding : 'utf-8'
            }">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="X-UA-Compatible" content="IE=Edge">
            ${styles.map(utils.buildLinkElement).join('\n        ')}
            ${scripts
                .filter(
                    (script) =>
                        typeof script !== 'string' &&
                        script.strategy === 'beforeInteractive',
                )
                .map(utils.buildScriptElement)
                .join('\n        ')}
            <title>${incoming.view.title ? incoming.view.title : ''}</title>
            ${head}
        </head>
        <body>`;

    const documentTrailers = `${scripts
        .filter(
            (script) =>
                typeof script === 'string' ||
                script.strategy === 'afterInteractive' ||
                !script.strategy,
        )
        .map(utils.buildScriptElement)
        .join('\n        ')}
    ${scripts
        .filter(
            (script) =>
                typeof script !== 'string' && script.strategy === 'lazy',
        )
        .map(
            (script) =>
                `<script type="module">import("${
                    typeof script !== 'string' ? script.value : script
                }")</script>`,
        )
        .join('\n        ')}
</body>
</html>`;

    // If body is a string, template behaves basically as before
    if (!(body instanceof ResponseStream)) {
        return `${documentHeaders}${body}${documentTrailers}`;
    }

    // If body is a response stream, template does streaming
    // first wait for assets to be ready and then send the document head
    body.send(documentHeaders);

    // Once the developer hands back control to Podium, we send the document closing html
    body.on('done', () => {
        body.send(documentTrailers);
        body.end();
    });
};
