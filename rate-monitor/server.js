#!/usr/bin/env node

/**
 * RateAPI Webhook Monitor Demo
 *
 * Demonstrates the full monitor lifecycle:
 * 1. Create a monitor with conditions
 * 2. Simulate a rate change (dry run)
 * 3. Show what webhook payload would look like
 * 4. Demonstrate signature verification locally
 * 5. Clean up
 *
 * Usage: node server.js
 *        node server.js --with-tunnel  # If you have a public HTTPS URL
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { verifyWebhookSignature, signWebhookPayload } from './verify-signature.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if user is running from wrong directory
const scriptName = path.basename(__filename);
const cwd = process.cwd();
if (!fs.existsSync(path.join(cwd, scriptName)) && !process.argv[1].includes(path.sep)) {
  console.error(`\x1b[33mNote: Make sure you're in the right directory.\x1b[0m`);
  console.error(`\nRun one of these commands:`);
  console.error(`  cd ${__dirname} && npm install && node ${scriptName}`);
  console.error(`  node ${__filename}\n`);
  process.exit(1);
}
const DEMOS_DIR = path.resolve(__dirname, '..');
const SHARED_ENV_PATH = path.join(DEMOS_DIR, '.env');

// Configuration
const DEFAULT_API_URL = 'https://api.rateapi.dev';
const DEFAULT_PORT = 3456;

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function print(text, color = '') {
  console.log(color ? `${color}${text}${colors.reset}` : text);
}

function printBold(text) { print(text, colors.bold); }
function printSuccess(text) { print(text, colors.green); }
function printWarning(text) { print(text, colors.yellow); }
function printError(text) { print(text, colors.red); }
function printDim(text) { print(text, colors.dim); }

// Load environment from file
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch {
    return {};
  }
}

// Get API key from environment or file
function getApiKey() {
  if (process.env.RATEAPI_KEY) return process.env.RATEAPI_KEY;

  const sharedEnv = loadEnvFile(SHARED_ENV_PATH);
  if (sharedEnv.RATEAPI_KEY) return sharedEnv.RATEAPI_KEY;

  const localEnv = loadEnvFile(path.join(__dirname, '.env'));
  if (localEnv.RATEAPI_KEY) return localEnv.RATEAPI_KEY;

  return null;
}

function getApiUrl() {
  return process.env.RATEAPI_URL ||
         loadEnvFile(SHARED_ENV_PATH).RATEAPI_URL ||
         DEFAULT_API_URL;
}

function getPort() {
  return parseInt(process.env.PORT || DEFAULT_PORT, 10);
}

// API Functions
async function createMonitor(apiUrl, apiKey, webhookUrl) {
  const response = await fetch(`${apiUrl}/v1/monitors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      name: 'Demo Rate Alert',
      decision_context: {
        state: 'CA',
        intent: 'purchase',
        amount: 500000,
      },
      conditions: [
        {
          field: 'apr',
          operator: 'lt',
          value: 6.5,
        },
      ],
      webhook_url: webhookUrl,
      cooldown_hours: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || `Failed to create monitor: ${response.status}`);
  }

  return response.json();
}

async function simulateRateChange(apiUrl, apiKey, monitorId, deliverWebhook = false) {
  const response = await fetch(`${apiUrl}/v1/monitors/${monitorId}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      rate_change: {
        state: 'CA',
        product_type: '30yr_fixed',
        previous_rate: 6.75,
        new_rate: 6.25,
      },
      options: {
        dry_run: !deliverWebhook,
        deliver_webhook: deliverWebhook,
        override_cooldown: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || `Simulation failed: ${response.status}`);
  }

  return response.json();
}

async function deleteMonitor(apiUrl, apiKey, monitorId) {
  const response = await fetch(`${apiUrl}/v1/monitors/${monitorId}`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete monitor: ${response.status}`);
  }
}

async function listMonitors(apiUrl, apiKey) {
  const response = await fetch(`${apiUrl}/v1/monitors`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to list monitors: ${response.status}`);
  }

  return response.json();
}

// Simulate a webhook delivery locally to demonstrate signature verification
async function demonstrateSignatureVerification(webhookSecret) {
  print('\n' + '='.repeat(50), colors.cyan);
  printBold('Demonstrating Webhook Signature Verification');
  print('='.repeat(50), colors.cyan);

  // Create a sample webhook payload
  const samplePayload = {
    event: 'rate_change_alert',
    monitor_id: 'demo_monitor',
    timestamp: new Date().toISOString(),
    data: {
      state: 'CA',
      product_type: '30yr_fixed',
      credit_union_name: 'First Tech Federal Credit Union',
      previous_rate: 6.75,
      new_rate: 6.25,
      change_pct: -7.41,
      triggered_conditions: ['apr < 6.5%'],
    },
  };

  const payloadString = JSON.stringify(samplePayload);
  const timestamp = Math.floor(Date.now() / 1000);

  // Sign the payload
  const signature = await signWebhookPayload(payloadString, webhookSecret, timestamp);

  print('\nSample Webhook Payload:', colors.bold);
  print(JSON.stringify(samplePayload, null, 2), colors.dim);

  print('\nWebhook Headers:', colors.bold);
  print(`  X-RateAPI-Signature: ${signature}`, colors.dim);
  print(`  X-RateAPI-Timestamp: ${timestamp}`, colors.dim);

  // Verify the signature
  print('\nVerifying signature...', colors.bold);
  const verifyResult = await verifyWebhookSignature(
    payloadString,
    signature,
    webhookSecret,
    timestamp
  );

  if (verifyResult.valid) {
    printSuccess('  Signature is VALID');
  } else {
    printError(`  Signature is INVALID: ${verifyResult.error}`);
  }

  // Demonstrate what happens with a tampered payload
  print('\nTesting with tampered payload...', colors.bold);
  const tamperedPayload = { ...samplePayload, data: { ...samplePayload.data, new_rate: 5.0 } };
  const tamperedVerify = await verifyWebhookSignature(
    JSON.stringify(tamperedPayload),
    signature,
    webhookSecret,
    timestamp
  );

  if (!tamperedVerify.valid) {
    printSuccess(`  Tampered payload correctly rejected: ${tamperedVerify.error}`);
  } else {
    printError('  ERROR: Tampered payload was accepted!');
  }

  print('\n' + '='.repeat(50), colors.cyan);
}

// Main demo
async function main() {
  const useTunnel = process.argv.includes('--with-tunnel');
  const tunnelUrl = process.env.WEBHOOK_URL;

  console.clear();
  printBold('RateAPI Webhook Monitor Demo');
  print('============================\n');

  const apiUrl = getApiUrl();
  const apiKey = getApiKey();
  const port = getPort();

  if (!apiKey) {
    printError('No API key found!');
    print('\nRun the rate-explorer demo first to create a key:');
    print('  cd ../rate-explorer && node rate-explorer.js');
    print('\nOr set RATEAPI_KEY in ../demos/.env');
    process.exit(1);
  }

  printDim(`Using API: ${apiUrl}`);
  printDim(`Using key: ${apiKey.substring(0, 10)}...`);
  console.log('');

  // Track monitor ID for cleanup
  let monitorId = null;
  let webhookSecret = null;
  let server = null;

  // Handle cleanup on exit
  const cleanup = async () => {
    if (monitorId) {
      print('\nCleaning up...');
      try {
        await deleteMonitor(apiUrl, apiKey, monitorId);
        printSuccess(`Monitor ${monitorId} deleted.`);
      } catch (error) {
        printWarning(`Cleanup failed: ${error.message}`);
      }
    }
    if (server) {
      server.close();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Determine webhook URL
    let webhookUrl;
    let canReceiveWebhooks = false;

    if (useTunnel && tunnelUrl) {
      webhookUrl = tunnelUrl;
      canReceiveWebhooks = true;
      print(`Using tunnel URL: ${webhookUrl}`);
    } else if (useTunnel) {
      printWarning('--with-tunnel specified but WEBHOOK_URL not set.');
      print('Set WEBHOOK_URL to your ngrok/tunnel HTTPS URL.\n');
      webhookUrl = 'https://example.com/webhook'; // Placeholder
    } else {
      // Use a placeholder URL - we'll demonstrate with dry_run mode
      webhookUrl = 'https://example.com/webhook';
      printDim('Note: Using placeholder webhook URL (dry-run mode).');
      printDim('For real webhooks, use: node server.js --with-tunnel');
      printDim('and set WEBHOOK_URL=https://your-tunnel.ngrok.io/webhook\n');
    }

    // Start local server if we can receive webhooks
    if (canReceiveWebhooks) {
      print(`Starting webhook server on port ${port}...`);

      const app = express();

      app.use(express.json({
        verify: (req, res, buf) => {
          req.rawBody = buf.toString();
        },
      }));

      app.post('/webhook', async (req, res) => {
        console.log('');
        print('=' .repeat(50), colors.cyan);
        printBold('[Webhook Received]');

        const signature = req.headers['x-rateapi-signature'];
        const timestamp = req.headers['x-rateapi-timestamp'];

        print(`  Timestamp: ${new Date(parseInt(timestamp, 10) * 1000).toISOString()}`);

        if (webhookSecret && signature && timestamp) {
          const result = await verifyWebhookSignature(
            req.rawBody,
            signature,
            webhookSecret,
            parseInt(timestamp, 10)
          );

          if (result.valid) {
            printSuccess('  Signature Valid: YES');
          } else {
            printError(`  Signature Valid: NO - ${result.error}`);
          }
        }

        const payload = req.body;
        print(`  Event: ${payload.event || 'unknown'}`);

        if (payload.data) {
          if (payload.data.credit_union_name) print(`  Provider: ${payload.data.credit_union_name}`);
          if (payload.data.new_rate !== undefined) print(`  New Rate: ${payload.data.new_rate}%`);
        }

        print('=' .repeat(50), colors.cyan);
        res.status(200).json({ received: true });
      });

      app.get('/health', (req, res) => res.json({ status: 'ok' }));

      server = app.listen(port, () => {
        printSuccess(`Webhook server running at http://localhost:${port}/webhook`);
        console.log('');
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 1: Create monitor
    print('Creating a rate monitor...');

    const createResult = await createMonitor(apiUrl, apiKey, webhookUrl);
    const monitor = createResult.monitor;
    monitorId = monitor.id;
    webhookSecret = createResult.webhook_signing_secret;

    printSuccess(`Monitor created: ${monitorId}`);
    console.log('');

    print('Conditions:');
    for (const condition of monitor.conditions) {
      const opDisplay = {
        lt: '<', lte: '<=', gt: '>', gte: '>=', eq: '=', ne: '!=',
      }[condition.operator] || condition.operator;

      print(`  - ${condition.field.toUpperCase()} ${opDisplay} ${condition.value}%`);
    }
    console.log('');

    printDim(`Webhook secret: ${webhookSecret.substring(0, 15)}...`);
    printDim('(Store this securely to verify webhook signatures)');
    console.log('');

    // Step 2: Simulate rate change
    print('Simulating a rate drop from 6.75% to 6.25%...');

    const simulation = await simulateRateChange(apiUrl, apiKey, monitorId, canReceiveWebhooks);

    if (simulation.would_trigger) {
      printSuccess('Monitor WOULD trigger!');
      print(`  Rate change: ${simulation.rate_change.previous_rate}% -> ${simulation.rate_change.new_rate}%`);
      print(`  Conditions met: ${simulation.evaluation.conditions_met}/${simulation.evaluation.conditions_summary?.length || 1}`);
    } else {
      printWarning('Monitor would NOT trigger (conditions not met)');
    }

    // Wait for webhook if real delivery
    if (canReceiveWebhooks) {
      print('\nWaiting for webhook delivery...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Step 3: Demonstrate signature verification locally
    await demonstrateSignatureVerification(webhookSecret);

    // Step 4: Show list of monitors
    console.log('');
    print('Listing all your monitors...');
    const monitorList = await listMonitors(apiUrl, apiKey);
    print(`Found ${monitorList.total} monitor(s):`);

    for (const m of monitorList.monitors) {
      print(`  - ${m.name} (${m.status}) - ID: ${m.id}`);
    }

    // Cleanup
    console.log('');
    print('Demo complete! Cleaning up...');
    await deleteMonitor(apiUrl, apiKey, monitorId);
    printSuccess(`Monitor ${monitorId} deleted.`);
    monitorId = null; // Prevent double delete

    console.log('');
    printSuccess('All done! Key takeaways:');
    print('  1. Monitors watch for rate changes matching your conditions');
    print('  2. Webhooks are signed with HMAC-SHA256 for security');
    print('  3. Use verify-signature.js in your production code');
    console.log('');

    if (server) {
      server.close();
    }

  } catch (error) {
    printError(`Error: ${error.message}`);
    await cleanup();
  }
}

// Run
main().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  process.exit(1);
});
