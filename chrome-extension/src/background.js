/**
 * Background Service Worker
 *
 * Handles API calls to the proxy server and caches responses.
 * The proxy server (Cloudflare Worker) holds the API key securely.
 */

import { CONFIG } from './lib/config.js';

// In-memory cache for rate data
const rateCache = new Map();

/**
 * Generate cache key from request params
 */
function getCacheKey(state, amount) {
  return `${state}-${Math.round(amount / 10000) * 10000}`; // Round to nearest 10k
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cachedData) {
  if (!cachedData) return false;
  const age = (Date.now() - cachedData.timestamp) / 1000;
  return age < CONFIG.CACHE_TTL;
}

/**
 * Fetch rates from the proxy server
 */
async function fetchRates(state, amount) {
  const cacheKey = getCacheKey(state, amount);

  // Check cache first
  const cached = rateCache.get(cacheKey);
  if (isCacheValid(cached)) {
    console.log('[RateAPI] Returning cached data for', cacheKey);
    return cached.data;
  }

  console.log('[RateAPI] Fetching rates for', state, amount);

  try {
    const response = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state,
        amount,
        termMonths: CONFIG.DEFAULT_TERM_MONTHS,
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy returned ${response.status}`);
    }

    const data = await response.json();

    // Cache the response
    rateCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error('[RateAPI] Fetch error:', error);

    // Return mock data for development/demo purposes
    // Remove this in production once proxy is deployed
    return getMockData(state, amount);
  }
}

/**
 * Mock data for development and demo purposes
 * This allows the extension to work without a deployed proxy
 */
function getMockData(state, amount) {
  const baseRate = 6.125;
  const monthlyPayment = calculateMonthlyPayment(amount, baseRate, 360);
  const avgPayment = calculateMonthlyPayment(amount, CONFIG.NATIONAL_AVG_RATE, 360);

  return {
    bestRate: baseRate,
    avgRate: CONFIG.NATIONAL_AVG_RATE,
    monthlySavings: Math.round(avgPayment - monthlyPayment),
    topOffers: [
      {
        credit_union_name: 'State Employees Credit Union',
        apr: 6.125,
        monthly_payment: monthlyPayment,
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
 * Message listener for content script communication
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getRates') {
    const { state, amount } = message;

    fetchRates(state, amount)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate async response
    return true;
  }

  if (message.action === 'clearCache') {
    rateCache.clear();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'getConfig') {
    sendResponse({
      success: true,
      config: {
        proxyUrl: CONFIG.PROXY_URL,
        nationalAvgRate: CONFIG.NATIONAL_AVG_RATE,
      },
    });
    return true;
  }
});

// Log when service worker starts
console.log('[RateAPI] Background service worker initialized');
