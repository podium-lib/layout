import fs from 'node:fs';
import path from 'node:path';

let fixup = path.join(process.cwd(), 'types', 'podium.d.ts');
let module = path.join(process.cwd(), 'types', 'layout.d.ts');

fs.writeFileSync(
    module,
    `${fs.readFileSync(fixup, 'utf-8')}
${fs.readFileSync(module, 'utf-8')}`,
    'utf-8',
);
