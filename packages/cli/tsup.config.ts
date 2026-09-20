import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node18',
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
    sourcemap: false,
    minify: false,
    external: ['@kaddo/admin-server'],
  },
  {
    entry: ['src/core.ts'],
    format: ['esm'],
    target: 'node18',
    clean: false,
    sourcemap: false,
    minify: false,
  },
])
