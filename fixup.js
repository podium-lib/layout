import fs from 'node:fs';
import path from 'node:path';

let module = path.join(process.cwd(), 'types', 'layout.d.ts');

fs.writeFileSync(
    module,
    /* ts */ `
declare global {
  namespace Express {
    export interface Response {
      podiumSend(fragment: string, ...args: unknown[]): Response;
    }
  }
}

${fs.readFileSync(module, 'utf-8')}`,
    'utf-8',
);
