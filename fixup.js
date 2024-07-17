import fs from 'node:fs';
import path from 'node:path';

let module = path.join(process.cwd(), 'types', 'layout.d.ts');

fs.writeFileSync(
    module,
    /* ts */ `
import type { PodiumClientResource } from "@podium/client";
import type { HttpIncoming } from "@podium/utils";

declare global {
  namespace Express {
    export interface Locals {
      podium: HttpIncoming;
    }

    export interface Response {
      podiumSend(fragment: string, ...args: unknown[]): Response;
      /**
       * Streams the response from the layout to the browser.
       * To use this method your layout markup needs to use
       * Declarative Shadow DOM and slots to place the markup
       * from podlets.
       *
       * @example
       *
       *
       */
      podiumStream(podlets: PodiumClientResource[], layoutMarkup: string, ...args: unknown[]): void;
    }
  }
}

${fs.readFileSync(module, 'utf-8')}`,
    'utf-8',
);
