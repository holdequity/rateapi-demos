import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Build configuration for content script (Lit components) - MAIN world
const contentConfig = {
  entryPoints: ['src/content/index.js'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  target: ['chrome100'],
  minify: !isWatch,
  sourcemap: isWatch,
};

// Build configuration for bridge script - ISOLATED world
const bridgeConfig = {
  entryPoints: ['src/content/bridge.js'],
  bundle: true,
  outfile: 'dist/bridge.js',
  format: 'iife',
  target: ['chrome100'],
  minify: !isWatch,
  sourcemap: isWatch,
};

// Build configuration for background service worker
const backgroundConfig = {
  entryPoints: ['src/background.js'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'esm',
  target: ['chrome100'],
  minify: !isWatch,
  sourcemap: isWatch,
};

// Copy CSS to dist
function copyCSS() {
  const cssContent = fs.readFileSync('src/styles/overlay.css', 'utf8');
  fs.writeFileSync('dist/content.css', cssContent);
  console.log('Copied CSS to dist/content.css');
}

async function build() {
  try {
    if (isWatch) {
      // Watch mode
      const contentCtx = await esbuild.context(contentConfig);
      const bridgeCtx = await esbuild.context(bridgeConfig);
      const backgroundCtx = await esbuild.context(backgroundConfig);

      await contentCtx.watch();
      await bridgeCtx.watch();
      await backgroundCtx.watch();

      copyCSS();
      console.log('Watching for changes...');

      // Watch CSS file
      fs.watch('src/styles', (eventType, filename) => {
        if (filename === 'overlay.css') {
          copyCSS();
        }
      });
    } else {
      // Single build
      await esbuild.build(contentConfig);
      console.log('Built content script');

      await esbuild.build(bridgeConfig);
      console.log('Built bridge script');

      await esbuild.build(backgroundConfig);
      console.log('Built background script');

      copyCSS();
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
