#!/usr/bin/env node

/**
 * RateAPI Rate Explorer CLI
 *
 * Interactive CLI demo showcasing the RateAPI decision engine.
 * Creates API key automatically, then lets you explore financial rates.
 *
 * Usage: node rate-explorer.js
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if user is running from wrong directory
const scriptName = path.basename(__filename);
const cwd = process.cwd();
if (!fs.existsSync(path.join(cwd, scriptName)) && !process.argv[1].includes(path.sep)) {
  console.error(`\x1b[33mNote: Make sure you're in the right directory.\x1b[0m`);
  console.error(`\nRun one of these commands:`);
  console.error(`  cd ${__dirname} && node ${scriptName}`);
  console.error(`  node ${__filename}\n`);
  process.exit(1);
}
const DEMOS_DIR = path.resolve(__dirname, '..');
const SHARED_ENV_PATH = path.join(DEMOS_DIR, '.env');

// API Configuration
const DEFAULT_API_URL = 'https://api.rateapi.dev';

// State name mapping for display
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

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
};

// Helper to print colored text
function print(text, color = '') {
  console.log(color ? `${color}${text}${colors.reset}` : text);
}

function printBold(text) {
  print(text, colors.bold);
}

function printSuccess(text) {
  print(text, colors.green);
}

function printWarning(text) {
  print(text, colors.yellow);
}

function printError(text) {
  print(text, colors.red);
}

function printDim(text) {
  print(text, colors.dim);
}

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

// Save API key to shared .env file
function saveApiKey(apiKey) {
  let content = '';

  // Read existing content if file exists
  if (fs.existsSync(SHARED_ENV_PATH)) {
    content = fs.readFileSync(SHARED_ENV_PATH, 'utf-8');
    // Update existing RATEAPI_KEY or append
    if (content.includes('RATEAPI_KEY=')) {
      content = content.replace(/RATEAPI_KEY=.*/, `RATEAPI_KEY=${apiKey}`);
    } else {
      content += `\nRATEAPI_KEY=${apiKey}`;
    }
  } else {
    content = `# RateAPI configuration (created by rate-explorer demo)\nRATEAPI_KEY=${apiKey}\n`;
  }

  fs.writeFileSync(SHARED_ENV_PATH, content);
}

// Get API key from environment or file
function getApiKey() {
  // 1. Check environment variable
  if (process.env.RATEAPI_KEY) {
    return process.env.RATEAPI_KEY;
  }

  // 2. Check shared demos/.env file
  const sharedEnv = loadEnvFile(SHARED_ENV_PATH);
  if (sharedEnv.RATEAPI_KEY) {
    return sharedEnv.RATEAPI_KEY;
  }

  // 3. Check local .env file
  const localEnv = loadEnvFile(path.join(__dirname, '.env'));
  if (localEnv.RATEAPI_KEY) {
    return localEnv.RATEAPI_KEY;
  }

  return null;
}

// Get API URL
function getApiUrl() {
  return process.env.RATEAPI_URL ||
         loadEnvFile(SHARED_ENV_PATH).RATEAPI_URL ||
         DEFAULT_API_URL;
}

// Create readline interface for user input
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Promisified question
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// API Functions
async function createApiKey(apiUrl) {
  const response = await fetch(`${apiUrl}/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create API key: ${response.status}`);
  }

  return response.json();
}

async function getFinancingDecision(apiUrl, apiKey, params) {
  const requestBody = {
    decision_type: 'financing',
    context: {
      request_id: `demo-${Date.now()}`,
      geo: {
        state: params.state.toUpperCase(),
      },
    },
    product_request: {
      product_type: params.productType || 'mortgage',
      intent: params.intent,
      amount: params.amount,
      term_months: params.termMonths,
    },
    preferences: {
      max_providers: params.maxProviders || 5,
    },
  };

  // Add current offer if refinancing with rate
  if (params.currentRate) {
    requestBody.current_offer = {
      rate: params.currentRate,
      apr: params.currentApr || params.currentRate,
    };
  }

  const response = await fetch(`${apiUrl}/v1/decisions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Decision API error: ${response.status}`);
  }

  return response.json();
}

async function getCreditUnion(apiUrl, apiKey, state, slug) {
  const response = await fetch(`${apiUrl}/credit-unions/${state.toLowerCase()}/${slug}`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.message || `Credit union lookup error: ${response.status}`);
  }

  return response.json();
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Display decision results
function displayDecision(decision) {
  console.log('');

  // Summary and recommendation
  const actionDisplay = {
    'shop_providers': 'Shop Around - Better rates available',
    'wait_and_watch': 'Wait & Watch - Monitor for better rates',
    'do_nothing': 'Hold - Current offer is competitive',
  }[decision.summary.recommended_action] || decision.summary.recommended_action;

  printBold(`Recommendation: ${actionDisplay}`);
  print(`Confidence: ${Math.round(decision.summary.confidence * 100)}%`);
  console.log('');

  // Get primary action
  const action = decision.actions?.[0];
  if (!action) {
    printWarning('No recommendations available for this query.');
    return [];
  }

  // Why section
  if (action.why && action.why.length > 0) {
    printBold('Why:');
    for (const reason of action.why) {
      print(`  - ${reason}`);
    }
    console.log('');
  }

  // Estimated savings
  if (decision.summary.estimated_savings) {
    const savings = decision.summary.estimated_savings;
    printSuccess(`Potential Savings: ${formatCurrency(savings.monthly)}/month (${formatCurrency(savings.total)} total)`);
    console.log('');
  }

  // Top offers
  const offers = action.offers || [];
  if (offers.length === 0) {
    printWarning('No offers found for this query.');
    return [];
  }

  printBold(`Top ${Math.min(offers.length, 5)} Offers:`);
  console.log('');

  for (const offer of offers.slice(0, 5)) {
    print(`${colors.cyan}#${offer.rank} ${offer.credit_union_name}${colors.reset}`);
    print(`   ${offer.product_name} @ ${colors.bold}${offer.apr}% APR${colors.reset}`);
    print(`   Monthly Payment: ${formatCurrency(offer.monthly_payment)}`);
    if (offer.estimated_monthly_savings) {
      printSuccess(`   Savings: ${formatCurrency(offer.estimated_monthly_savings)}/month`);
    }
    if (offer.points > 0) {
      printDim(`   Points: ${offer.points}`);
    }
    console.log('');
  }

  return offers;
}

// Display credit union details
function displayCreditUnion(profile) {
  console.log('');
  printBold(`${profile.name}`);
  print(`${profile.city ? profile.city + ', ' : ''}${profile.stateName}`);
  if (profile.url) {
    printDim(`Website: ${profile.url}`);
  }
  console.log('');

  if (profile.rates && profile.rates.length > 0) {
    printBold('All Available Rates:');
    console.log('');

    for (const rate of profile.rates) {
      print(`  ${rate.productName}`);
      print(`    Rate: ${rate.rate}%  |  APR: ${rate.apr}%  |  Points: ${rate.points}`);
      printDim(`    Last updated: ${new Date(rate.lastUpdated).toLocaleDateString()}`);
      console.log('');
    }
  } else {
    printWarning('No current rates available for this credit union.');
  }
}

// Main CLI flow
async function main() {
  console.clear();
  printBold('Welcome to RateAPI Rate Explorer!');
  print('Get personalized financial rate recommendations in seconds.\n');

  const apiUrl = getApiUrl();
  let apiKey = getApiKey();

  // Create API key if needed
  if (!apiKey) {
    print('No API key found. Creating one for you...');
    try {
      const keyResult = await createApiKey(apiUrl);
      apiKey = keyResult.key;
      saveApiKey(apiKey);
      printSuccess(`API key created and saved to ${path.relative(process.cwd(), SHARED_ENV_PATH)}`);
      print(`Key ID: ${keyResult.id}`);
      print(`Tier: ${keyResult.tier.name} (${keyResult.tier.limit} requests/month)\n`);
    } catch (error) {
      printError(`Failed to create API key: ${error.message}`);
      process.exit(1);
    }
  } else {
    printDim(`Using API key: ${apiKey.substring(0, 10)}...`);
    console.log('');
  }

  const rl = createPrompt();

  try {
    // Main interaction loop
    while (true) {
      // Get state
      let state = await ask(rl, `${colors.cyan}Enter your state (e.g., CA, TX, NY):${colors.reset} `);
      state = state.toUpperCase();

      if (!STATE_NAMES[state]) {
        printWarning(`Invalid state code: ${state}. Please use a 2-letter state code.`);
        continue;
      }

      // Get product type
      print('');
      print('Product types:');
      print('  1. Mortgage (home loan)');
      print('  2. Auto Loan (vehicle financing)');
      print('  3. HELOC (home equity line of credit)');
      print('  4. Personal Loan');
      print('  5. Credit Card');
      print('');
      let productTypeChoice = await ask(rl, `${colors.cyan}Select product type (1-5) [1]:${colors.reset} `);
      productTypeChoice = productTypeChoice || '1';

      const productTypeMap = {
        '1': 'mortgage',
        '2': 'auto_loan',
        '3': 'heloc',
        '4': 'personal_loan',
        '5': 'credit_card',
      };

      const productType = productTypeMap[productTypeChoice];
      if (!productType) {
        printWarning('Please enter a number between 1-5.');
        continue;
      }

      // Define intent options based on product type
      const intentOptions = {
        'mortgage': ['purchase', 'refinance'],
        'auto_loan': ['purchase', 'refinance'],
        'heloc': ['new_credit', 'cash_out'],
        'personal_loan': ['new_credit'],
        'credit_card': ['new_credit', 'balance_transfer'],
      };

      const validIntents = intentOptions[productType];
      const defaultIntent = validIntents[0];

      // Get loan amount
      const amountLabel = productType === 'credit_card' ? 'credit limit' : 'loan amount';
      const amountStr = await ask(rl, `${colors.cyan}Enter ${amountLabel} (e.g., 400000):${colors.reset} `);
      const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);

      if (isNaN(amount) || amount < 1000) {
        printWarning(`Please enter a valid ${amountLabel} (minimum $1,000).`);
        continue;
      }

      // Get intent
      const intentPrompt = validIntents.length > 1
        ? `${validIntents.join(' or ')}? [${defaultIntent}]`
        : `[${defaultIntent}]`;
      let intent = await ask(rl, `${colors.cyan}Intent - ${intentPrompt}:${colors.reset} `);
      intent = intent.toLowerCase() || defaultIntent;

      if (!validIntents.includes(intent)) {
        printWarning(`Please enter one of: ${validIntents.join(', ')}`);
        continue;
      }

      // Get term months based on product type
      let termMonths;
      if (productType === 'credit_card') {
        // Credit cards don't have a term
        termMonths = undefined;
      } else {
        const defaultTerms = {
          'mortgage': 360,      // 30 years
          'auto_loan': 60,      // 5 years
          'heloc': 120,         // 10 years
          'personal_loan': 36,  // 3 years
        };
        termMonths = defaultTerms[productType];
      }

      // Get current rate if refinancing
      let currentRate = null;
      if (intent === 'refinance' || intent === 'balance_transfer') {
        const rateStr = await ask(rl, `${colors.cyan}Current rate (optional, e.g., 7.5):${colors.reset} `);
        if (rateStr) {
          currentRate = parseFloat(rateStr);
          if (isNaN(currentRate) || currentRate < 0 || currentRate > 30) {
            printWarning('Invalid rate. Proceeding without current rate.');
            currentRate = null;
          }
        }
      }

      // Fetch recommendations
      console.log('');
      print('Fetching personalized recommendations...');

      try {
        const decision = await getFinancingDecision(apiUrl, apiKey, {
          state,
          amount,
          intent,
          productType,
          termMonths,
          currentRate,
        });

        const offers = displayDecision(decision);

        // Drill-down option
        if (offers.length > 0) {
          const drillDown = await ask(rl, `${colors.cyan}Enter a number (1-${Math.min(offers.length, 5)}) to see credit union details, or press Enter to search again:${colors.reset} `);

          if (drillDown && /^[1-5]$/.test(drillDown)) {
            const selectedIndex = parseInt(drillDown, 10) - 1;
            const selectedOffer = offers[selectedIndex];

            if (selectedOffer && selectedOffer.credit_union_slug) {
              print('\nFetching credit union details...');

              try {
                const profile = await getCreditUnion(
                  apiUrl,
                  apiKey,
                  state,
                  selectedOffer.credit_union_slug
                );

                if (profile) {
                  displayCreditUnion(profile);
                } else {
                  printWarning('Credit union details not found.');
                }
              } catch (error) {
                printError(`Failed to fetch details: ${error.message}`);
              }
            }
          }
        }

      } catch (error) {
        printError(`Error: ${error.message}`);
      }

      // Continue or quit
      console.log('');
      const again = await ask(rl, `${colors.cyan}Search again? (y/n) [y]:${colors.reset} `);
      if (again.toLowerCase() === 'n' || again.toLowerCase() === 'no') {
        break;
      }
      console.log('');
    }

  } finally {
    rl.close();
  }

  console.log('');
  printSuccess('Thanks for using RateAPI Rate Explorer!');
  print('Learn more at https://rateapi.dev');
}

// Run
main().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  process.exit(1);
});
