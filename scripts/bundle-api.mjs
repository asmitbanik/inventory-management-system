import * as esbuild from 'esbuild';

await esbuild.build({
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['@prisma/client', '.prisma/client'],
  logLevel: 'info',
  entryPoints: ['server/src/api/auth-handlers.ts'],
  outfile: 'api/auth-handlers.cjs',
});
