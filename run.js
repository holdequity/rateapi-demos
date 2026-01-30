#!/usr/bin/env node

/**
 * Demo Runner Helper
 *
 * Helps users run demos from the correct directory.
 * Usage: node run.js [demo-name]
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demos = {
  'rate-explorer': {
    dir: 'rate-explorer',
    cmd: 'node',
    args: ['rate-explorer.js'],
    setup: null,
  },
  'rate-monitor': {
    dir: 'rate-monitor',
    cmd: 'node',
    args: ['server.js'],
    setup: 'npm install',
  },
  'rate-agent': {
    dir: 'rate-agent',
    cmd: 'node',
    args: ['rate-agent.js'],
    setup: null,
  },
};

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log(`
\x1b[1mRateAPI Demo Runner\x1b[0m

Usage: node run.js <demo-name>

Available demos:
  \x1b[36mrate-explorer\x1b[0m  - Interactive CLI for exploring mortgage rates
  \x1b[36mrate-monitor\x1b[0m   - Webhook monitor dashboard (requires npm install)
  \x1b[36mrate-agent\x1b[0m     - AI-powered mortgage advisor (requires pip install)

Examples:
  node run.js rate-explorer
  node run.js rate-monitor
  node run.js rate-agent

Or run directly:
  cd rate-explorer && node rate-explorer.js
  cd rate-monitor && npm install && node server.js
  cd rate-agent && node rate-agent.js
`);
  process.exit(0);
}

const demo = demos[arg];

if (!demo) {
  console.error(`\x1b[31mUnknown demo: ${arg}\x1b[0m`);
  console.error(`\nAvailable demos: ${Object.keys(demos).join(', ')}`);
  console.error(`Run 'node run.js --help' for usage.`);
  process.exit(1);
}

const demoDir = path.join(__dirname, demo.dir);

console.log(`\x1b[1mRunning ${arg} demo...\x1b[0m\n`);

// Run the demo
const child = spawn(demo.cmd, demo.args, {
  cwd: demoDir,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(`\x1b[31mCommand not found: ${demo.cmd}\x1b[0m`);
    if (demo.setup) {
      console.error(`\nTry running setup first:`);
      console.error(`  cd ${demo.dir} && ${demo.setup}`);
    }
  } else {
    console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
  }
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});
