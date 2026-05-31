/**
 * Extension build script:
 *  1. Vite  → popup.html + popup.js + assets → dist/
 *  2. esbuild → background.ts → dist/background.js (ESM, no splitting)
 *  3. Copy manifest.json + icons/ → dist/
 */
import { build } from 'esbuild'
import { execSync } from 'child_process'
import { copyFileSync, mkdirSync, rmSync } from 'fs'

// 1. Clean dist
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })

// 2. Build popup with Vite
console.log('\n📦 Building popup…')
execSync('npx vite build', { stdio: 'inherit' })

// 3. Build background service worker + content script with esbuild
console.log('\n⚙️  Building background service worker…')
await build({
  entryPoints: ['src/background.ts'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'esm',
  target: 'chrome121',
  minify: true,
})

console.log('⚙️  Building content script…')
await build({
  entryPoints: ['src/content.ts'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',       // IIFE for content scripts (no module system on host page)
  target: 'chrome121',
  minify: true,
  globalName: '_qaApplyAssistant',
})

// 4. Copy manifest + icons
console.log('\n📋 Copying static assets…')
copyFileSync('manifest.json', 'dist/manifest.json')
mkdirSync('dist/icons', { recursive: true })
for (const size of ['16', '48', '128']) {
  copyFileSync(`icons/icon${size}.png`, `dist/icons/icon${size}.png`)
}

console.log('\n✅ Extension built → dist/\n')
console.log('Load in Chrome: chrome://extensions → Developer mode → Load unpacked → select dist/')
