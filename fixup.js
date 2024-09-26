import fs from 'node:fs';
import path from 'node:path';

let module = path.join(process.cwd(), 'types', 'layout.d.ts');

fs.writeFileSync(
    module,
    /* ts */ `
import { ResponseStream } from './lib/response-stream.js';
declare global {
  namespace Express {
    export interface Response {
      podiumSend(fragment: string, ...args: unknown[]): Response;
      podiumStream(...args: unknown[]): ResponseStream;
    }
  }
}

${fs.readFileSync(module, 'utf-8')}`,
    'utf-8',
);
