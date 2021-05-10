export default {
    input: 'lib/layout.js',
    external: [
        '@podium/schemas',
        '@podium/context',
        '@metrics/client',
        '@podium/client',
        '@podium/utils',
        '@podium/proxy',
        '@podium/utils',
        'abslog',
        'objobj',
        'path',
        'url',
        'fs',
    ],
    output: [
        {
            exports: 'auto',
            format: 'cjs',
            dir: 'dist/',
            preserveModules: true,
        }
    ],
};
