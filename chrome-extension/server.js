/**
 * Local Proxy Server for Chrome Extension Demo
 *
 * This Express server proxies requests from the Chrome extension to RateAPI,
 * keeping your API key secure. Run this locally to see live rate data.
 *
 * Usage:
 *   RATEAPI_KEY=your-key npm run server
 *
 * Or create a .env file:
 *   RATEAPI_KEY=your-key
 */

import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from parent directory if exists
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const RATEAPI_KEY = process.env.RATEAPI_KEY;
const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

// Middleware
app.use(express.json());

// CORS - Allow Chrome extension origins
app.use((req, res, next) => {
  const origin = req.headers.origin || '';

  // Allow Chrome extensions and localhost
  if (origin.startsWith('chrome-extension://') || origin.startsWith('http://localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!RATEAPI_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Main proxy endpoint
app.post('/rates', async (req, res) => {
  const { state, amount, termMonths = 360 } = req.body;

  // Validate input
  if (!state || !amount) {
    return res.status(400).json({
      error: 'Missing required fields: state, amount',
    });
  }

  // If no API key, return mock data
  if (!RATEAPI_KEY) {
    console.log(`[Mock] Returning demo data for ${state}, $${amount.toLocaleString()}`);
    return res.json(getMockData(state, amount));
  }

  try {
    console.log(`[API] Fetching rates for ${state}, $${amount.toLocaleString()}`);

    const response = await fetch(`${RATEAPI_URL}/v1/decisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': RATEAPI_KEY,
      },
      body: JSON.stringify({
        decision_type: 'financing',
        context: {
          request_id: `chrome-ext-${Date.now()}`,
          geo: { state },
        },
        product_request: {
          product_type: 'mortgage',
          intent: 'purchase',
          amount: amount,
          term_months: termMonths,
        },
        preferences: {
          max_providers: 5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error ${response.status}: ${errorText}`);

      // Fall back to mock data on API error
      console.log('[API] Falling back to mock data');
      return res.json(getMockData(state, amount));
    }

    const data = await response.json();

    // Transform API response to extension format
    const offers = data.actions?.[0]?.offers || [];
    const bestRate = offers[0]?.apr || 6.125;
    const avgRate = 6.75; // National average for comparison

    const result = {
      bestRate,
      avgRate,
      monthlySavings: data.summary?.estimated_savings?.monthly || calculateSavings(amount, bestRate, avgRate),
      topOffers: offers.slice(0, 5).map((offer) => ({
        credit_union_name: offer.credit_union_name,
        apr: offer.apr,
        monthly_payment: offer.monthly_payment,
        state: state,
      })),
      isLiveData: true,
    };

    console.log(`[API] Returning ${result.topOffers.length} offers, best rate: ${result.bestRate}%`);
    res.json(result);
  } catch (error) {
    console.error('[API] Fetch error:', error.message);

    // Fall back to mock data on network error
    console.log('[API] Falling back to mock data');
    res.json(getMockData(state, amount));
  }
});

/**
 * Calculate monthly mortgage payment
 */
function calculateMonthlyPayment(principal, annualRate, termMonths) {
  const monthlyRate = annualRate / 100 / 12;
  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
}

/**
 * Calculate monthly savings between two rates
 */
function calculateSavings(amount, bestRate, avgRate) {
  const bestPayment = calculateMonthlyPayment(amount, bestRate, 360);
  const avgPayment = calculateMonthlyPayment(amount, avgRate, 360);
  return Math.round(avgPayment - bestPayment);
}

/**
 * Generate realistic mock data for demo purposes
 */
function getMockData(state, amount) {
  const baseRate = 6.125;
  const avgRate = 6.75;

  return {
    bestRate: baseRate,
    avgRate: avgRate,
    monthlySavings: calculateSavings(amount, baseRate, avgRate),
    topOffers: [
      {
        credit_union_name: 'State Employees Credit Union',
        apr: 6.125,
        monthly_payment: calculateMonthlyPayment(amount, 6.125, 360),
        state: state,
      },
      {
        credit_union_name: 'Navy Federal Credit Union',
        apr: 6.25,
        monthly_payment: calculateMonthlyPayment(amount, 6.25, 360),
        state: state,
      },
      {
        credit_union_name: 'PenFed Credit Union',
        apr: 6.375,
        monthly_payment: calculateMonthlyPayment(amount, 6.375, 360),
        state: state,
      },
      {
        credit_union_name: 'Alliant Credit Union',
        apr: 6.5,
        monthly_payment: calculateMonthlyPayment(amount, 6.5, 360),
        state: state,
      },
      {
        credit_union_name: 'Digital Federal Credit Union',
        apr: 6.625,
        monthly_payment: calculateMonthlyPayment(amount, 6.625, 360),
        state: state,
      },
    ],
    isMockData: true,
  };
}

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RateAPI Chrome Extension - Local Proxy Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Health check:      http://localhost:${PORT}/health`);
  console.log('');

  if (RATEAPI_KEY) {
    console.log('  ✓ API Key detected - returning LIVE rate data');
  } else {
    console.log('  ⚠ No API key - returning DEMO data');
    console.log('');
    console.log('  To use live data, set RATEAPI_KEY:');
    console.log('    RATEAPI_KEY=your-key npm run server');
    console.log('');
    console.log('  Or add to ../.env file:');
    console.log('    RATEAPI_KEY=your-key');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
