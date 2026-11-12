import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const watch = process.argv.includes('--watch')

mkdirSync(resolve(root, 'lib'), { recursive: true })

/** Browser platform modules supplied by the DSH client module loader. */
const external = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
  '@tanstack/react-virtual',
  'zod',
]

const clientOptions = {
  entryPoints: [resolve(root, 'src/client/index.ts')],
  outfile: resolve(root, 'lib/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120', 'safari17'],
  jsx: 'automatic',
  external,
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-nebula", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
  },
  footer: {
    js: 'return module.exports; } });',
  },
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
}

const hostOptions = {
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'lib/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  external: ['@deepseek-ai/cordis'],
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
}

if (watch) {
  const { context } = await import('esbuild')
  const [clientContext, hostContext] = await Promise.all([context(clientOptions), context(hostOptions)])
  await Promise.all([clientContext.watch(), hostContext.watch()])
  console.log('[dsh-nebula] watching…')
} else {
  await Promise.all([build(clientOptions), build(hostOptions)])
  console.log('[dsh-nebula] built lib/index.js + lib/client.js')
}
