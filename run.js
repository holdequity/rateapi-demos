#!/usr/bin/env node

/**
 * Demo Runner Helper
 *
 * Helps users run demos from the correct directory.
 * Usage: node run.js [demo-name]
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demos = {
  'rate-explorer': {
    dir: 'rate-explorer',
    cmd: 'node',
    args: ['rate-explorer.js'],
    setup: null,
    description: 'Interactive CLI for exploring mortgage rates',
  },
  'rate-monitor': {
    dir: 'rate-monitor',
    cmd: 'node',
    args: ['server.js'],
    setup: 'npm install',
    description: 'Webhook monitor for rate alerts',
  },
  'rate-agent': {
    dir: 'rate-agent',
    cmd: 'node',
    args: ['rate-agent.js'],
    setup: null,
    description: 'AI mortgage advisor (mock mode)',
  },
  'react-widget': {
    dir: 'react-rate-widget',
    cmd: 'npm',
    args: ['start'],
    setup: 'npm install',
    description: 'React rate widget (http://localhost:3000)',
  },
  'langchain': {
    dir: 'langchain-mortgage-agent',
    cmd: 'npm',
    args: ['run', 'chat'],
    setup: 'npm install',
    description: 'LangChain AI agent (CLI)',
  },
  'langchain-web': {
    dir: 'langchain-mortgage-agent',
    cmd: 'npm',
    args: ['run', 'web'],
    setup: 'npm install',
    description: 'LangChain AI agent (http://localhost:3000)',
  },
  'chrome-extension': {
    dir: 'chrome-extension',
    cmd: 'npm',
    args: ['run', 'dev'],
    setup: 'npm install',
    description: 'Chrome extension with local proxy server',
  },
};

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log(`
\x1b[1mRateAPI Demo Runner\x1b[0m

Usage: node run.js <demo-name>

Available demos:
  \x1b[36mrate-explorer\x1b[0m     - Interactive CLI for exploring mortgage rates
  \x1b[36mrate-monitor\x1b[0m      - Webhook monitor for rate alerts
  \x1b[36mrate-agent\x1b[0m        - AI mortgage advisor (mock mode, no API key needed)
  \x1b[36mreact-widget\x1b[0m      - React rate widget (opens http://localhost:3000)
  \x1b[36mlangchain\x1b[0m         - LangChain AI agent CLI (requires OPENAI_API_KEY)
  \x1b[36mlangchain-web\x1b[0m     - LangChain AI agent web UI (http://localhost:3000)
  \x1b[36mchrome-extension\x1b[0m  - Chrome extension + local proxy (http://localhost:3000)

Quick start:
  node run.js rate-explorer     # No setup needed, creates API key for you

Examples:
  node run.js rate-explorer
  node run.js react-widget
  node run.js langchain-web
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

// Main async runner
(async () => {
  const demoDir = path.join(__dirname, demo.dir);

  // Auto-install dependencies if needed
  const nodeModulesPath = path.join(demoDir, 'node_modules');
  if (demo.setup && !fs.existsSync(nodeModulesPath)) {
    console.log(`\x1b[33mInstalling dependencies for ${arg}...\x1b[0m\n`);
    const install = spawn('npm', ['install'], {
      cwd: demoDir,
      stdio: 'inherit',
      shell: true,
    });

    await new Promise((resolve, reject) => {
      install.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install failed with code ${code}`));
      });
      install.on('error', reject);
    });
    console.log('');
  }

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
})();
