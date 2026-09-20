import { defineConfig } from 'tsup'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: false,
  minify: false,
  external: ['node:sqlite'],
  onSuccess: async () => {
    const distFile = resolve('dist', 'index.js')
    let content = readFileSync(distFile, 'utf-8')
    content = content.replace(/from "sqlite"/g, 'from "node:sqlite"')
    content = content.replace(/from 'sqlite'/g, "from 'node:sqlite'")
    writeFileSync(distFile, content, 'utf-8')
  },
})
