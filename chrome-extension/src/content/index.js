/**
 * Content Script Entry Point
 *
 * Detects the current site, extracts listing information,
 * and injects the rate overlay component.
 *
 * Supports:
 * - Real estate sites (Zillow, Redfin, Realtor.com) - purchase context
 * - Financial planning apps (ProjectionLab) - refinance context
 */

import { detectSite, extractPrice, extractState } from '../lib/sites.js';
import { CONFIG } from '../lib/config.js';
import { RateOverlay } from './components/rate-overlay.js';

// Track if we've already injected the overlay
let overlayInjected = false;
let overlayElement = null;
let componentRegistered = false;

/**
 * Register the custom element
 * Running in MAIN world, so customElements should be available
 */
function registerComponent() {
  if (componentRegistered) return true;

  console.log('[RateAPI] Registering in MAIN world, customElements:', window.customElements);

  if (!window.customElements || typeof window.customElements.define !== 'function') {
    console.error('[RateAPI] customElements API not available!');
    return false;
  }

  if (!window.customElements.get('rateapi-overlay')) {
    try {
      window.customElements.define('rateapi-overlay', RateOverlay);
      console.log('[RateAPI] Custom element registered');
    } catch (e) {
      console.error('[RateAPI] Failed to register custom element:', e);
      return false;
    }
  }

  componentRegistered = true;
  return true;
}

// Messaging helpers for MAIN world (uses bridge script)
let requestIdCounter = 0;
const pendingRequests = new Map();

// Listen for responses from bridge
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== 'rateapi-bridge') {
    return;
  }

  const { requestId, response, error, ready } = event.data;

  if (ready) {
    console.log('[RateAPI] Bridge is ready');
    return;
  }

  const pending = pendingRequests.get(requestId);
  if (pending) {
    pendingRequests.delete(requestId);
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(response);
    }
  }
});

/**
 * Send message to background via bridge
 */
function sendMessage(action, payload) {
  return new Promise((resolve, reject) => {
    const requestId = ++requestIdCounter;
    pendingRequests.set(requestId, { resolve, reject });

    try {
      window.postMessage({
        source: 'rateapi-main',
        action,
        payload,
        requestId,
      }, window.location.origin);
    } catch (e) {
      window.postMessage({
        source: 'rateapi-main',
        action,
        payload,
        requestId,
      }, '*');
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

/**
 * Main initialization
 */
async function init() {
  console.log('[RateAPI] Content script loaded');

  // Detect which site we're on
  const site = detectSite();
  if (!site) {
    console.log('[RateAPI] Not on a supported listing page');
    return;
  }

  console.log(`[RateAPI] Detected ${site.name} page`);

  // Handle ProjectionLab differently (it's a SPA with different data)
  if (site.key === 'projectionlab') {
    await initProjectionLab(site);
    return;
  }

  // Standard real estate site flow
  // Wait for page to settle (dynamic content)
  await waitForElement(site.priceSelectors[0], 5000);
  await sleep(CONFIG.OVERLAY_DELAY);

  // Extract listing data
  const price = extractPrice(site);
  const state = extractState(site);

  if (!price) {
    console.log('[RateAPI] Could not extract price from page');
    return;
  }

  if (!state) {
    console.log('[RateAPI] Could not extract state from page');
    return;
  }

  console.log(`[RateAPI] Extracted: $${price.toLocaleString()} in ${state}`);

  // Inject the overlay
  await injectOverlay(price, state);
}

/**
 * Initialize for ProjectionLab (financial planning app)
 * This is a refinance context - we show rates to help users evaluate refinancing
 */
async function initProjectionLab(site) {
  console.log('[RateAPI] Initializing ProjectionLab integration');
  console.log('[RateAPI] Current URL:', window.location.href);

  // Wait for ProjectionLab SPA to fully load
  await sleep(2000);
  console.log('[RateAPI] Page settled, extracting data...');

  // Try to extract state from the page
  let state = site.getState(document);
  console.log('[RateAPI] Initial state detection:', state);

  // If we can't find state, try a few more times as the page loads
  if (!state) {
    for (let i = 0; i < 3; i++) {
      await sleep(1000);
      state = site.getState(document);
      console.log(`[RateAPI] State detection attempt ${i + 2}:`, state);
      if (state) break;
    }
  }

  if (!state) {
    console.log('[RateAPI] Could not detect state in ProjectionLab - will prompt user or use saved state');
    // Don't default - let injectOverlay check storage or show selector
  }

  // Try to extract mortgage/liability amount
  let mortgageAmount = null;
  let currentRate = null;

  // Look for actual input elements (not div containers) with v-field__input class
  const allInputs = document.querySelectorAll('input.v-field__input');
  console.log('[RateAPI] Found', allInputs.length, 'Vuetify input elements');

  for (const input of allInputs) {
    // Get the label from the parent v-field__field container
    const fieldContainer = input.closest('.v-field__field');
    const label = fieldContainer?.querySelector('.v-label')?.textContent?.trim() || '';
    const rawValue = input.value || '';

    // Parse the value (remove $, commas, %)
    const numericValue = parseFloat(rawValue.replace(/[$,%,]/g, ''));

    console.log('[RateAPI] Input:', label, '= "' + rawValue + '" ->', numericValue);

    // Check for Annual Percentage Rate / APR
    if (label.toLowerCase().includes('annual percentage rate') || label.toLowerCase().includes('apr')) {
      if (!isNaN(numericValue) && numericValue > 0 && numericValue < 30) {
        currentRate = numericValue;
        console.log('[RateAPI] ✓ Found current APR:', currentRate);
      }
    }

    // Check for Current Loan Balance
    if (label.toLowerCase().includes('loan balance') || label.toLowerCase().includes('current balance') || label.toLowerCase().includes('principal')) {
      if (!isNaN(numericValue) && numericValue >= 10000 && numericValue <= 10000000) {
        mortgageAmount = numericValue;
        console.log('[RateAPI] ✓ Found mortgage balance:', mortgageAmount);
      }
    }
  }

  // If we couldn't extract mortgage amount, look for dollar amounts in page text
  if (!mortgageAmount) {
    const pageText = document.body.innerText || '';
    // Look for amounts like $600K, $1.21M, $400,000
    const amounts = pageText.match(/\$[\d,]+(?:\.\d+)?[KkMm]?/g) || [];
    console.log('[RateAPI] Dollar amounts found on page:', amounts.slice(0, 10));

    for (const amountStr of amounts) {
      let amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      if (/K/i.test(amountStr)) amount *= 1000;
      if (/M/i.test(amountStr)) amount *= 1000000;

      // Reasonable mortgage range (between 100k and 2M)
      if (amount >= 100000 && amount <= 2000000) {
        mortgageAmount = amount;
        console.log('[RateAPI] Using dollar amount as mortgage:', mortgageAmount);
        break;
      }
    }
  }

  // Default mortgage amount for demo if we still can't find it
  if (!mortgageAmount) {
    mortgageAmount = 400000;
    console.log('[RateAPI] Using default mortgage amount: $400,000');
  }

  console.log(`[RateAPI] ProjectionLab Summary - State: ${state}, Mortgage: $${mortgageAmount.toLocaleString()}, Current Rate: ${currentRate || 'unknown'}%`);

  // Inject the refinance-focused overlay
  await injectOverlay(mortgageAmount, state, { isRefinance: true, currentRate });
}

// Store current loan amount for re-fetching after state change
let currentLoanAmount = null;
let currentOptions = {};

/**
 * Inject the rate overlay component into the page
 * @param {number} price - The loan amount (purchase price or mortgage balance)
 * @param {string} state - US state abbreviation (or null to prompt user)
 * @param {object} options - Additional options
 * @param {boolean} options.isRefinance - Whether this is a refinance context
 */
async function injectOverlay(price, state, options = {}) {
  if (overlayInjected) {
    console.log('[RateAPI] Overlay already injected');
    return;
  }

  // Store for later use
  currentLoanAmount = price;
  currentOptions = options;

  // Register the custom element
  if (!registerComponent()) {
    console.error('[RateAPI] Could not register custom element, aborting');
    return;
  }

  // Try to get saved state from storage
  let savedState = null;
  try {
    const stored = await sendMessage('getState', {});
    savedState = stored?.state || null;
    console.log('[RateAPI] Retrieved saved state:', savedState);
  } catch (e) {
    console.log('[RateAPI] Could not retrieve saved state:', e.message);
  }

  // Use saved state if we don't have one from the page
  const effectiveState = state || savedState;

  // Create the overlay element
  overlayElement = document.createElement('rateapi-overlay');
  overlayElement.loading = !effectiveState; // Only show loading if we have a state

  // Set refinance mode if applicable
  if (options.isRefinance) {
    overlayElement.isRefinance = true;
  }

  // If we have a state, set it; otherwise show selector
  if (effectiveState) {
    overlayElement.selectedState = effectiveState;
    overlayElement.showStateSelector = false;
  } else {
    overlayElement.showStateSelector = true;
    overlayElement.loading = false;
  }

  // Handle close event
  overlayElement.addEventListener('close', () => {
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
      overlayInjected = false;
    }
  });

  // Handle retry event
  overlayElement.addEventListener('retry', () => {
    const currentState = overlayElement.selectedState;
    if (currentState) {
      fetchAndDisplayRates(currentLoanAmount, currentState, currentOptions);
    }
  });

  // Handle state change event
  overlayElement.addEventListener('statechange', async (e) => {
    const newState = e.detail.state;
    console.log('[RateAPI] User selected state:', newState);

    // Save state to storage
    try {
      await sendMessage('saveState', { state: newState });
      console.log('[RateAPI] State saved to storage');
    } catch (err) {
      console.error('[RateAPI] Failed to save state:', err);
    }

    // Fetch rates with new state
    fetchAndDisplayRates(currentLoanAmount, newState, currentOptions);
  });

  // Append to body
  document.body.appendChild(overlayElement);
  overlayInjected = true;

  console.log('[RateAPI] Overlay injected');

  // Fetch rate data if we have a state
  if (effectiveState) {
    fetchAndDisplayRates(price, effectiveState, options);
  }
}

/**
 * Fetch rates from background worker and update overlay
 * Uses bridge script for chrome API access (since we're in MAIN world)
 * @param {number} price - The loan amount
 * @param {string} state - US state abbreviation
 * @param {object} options - Additional options
 */
async function fetchAndDisplayRates(price, state, options = {}) {
  if (!overlayElement) return;

  overlayElement.loading = true;
  overlayElement.error = null;

  try {
    // Send message via bridge to background worker
    const response = await sendMessage('getRates', {
      state,
      amount: price,
      intent: options.isRefinance ? 'refinance' : 'purchase',
    });

    if (response.success) {
      overlayElement.setRateData(response.data);
      console.log('[RateAPI] Rate data loaded:', response.data);
    } else {
      overlayElement.setError(response.error || 'Failed to load rates');
      console.error('[RateAPI] Error:', response.error);
    }
  } catch (error) {
    console.error('[RateAPI] Message error:', error);
    overlayElement.setError('Unable to connect to rate service');
  }
}

/**
 * Wait for an element to appear in the DOM
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Simple sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handle SPA navigation (sites like Zillow use client-side routing)
 */
function setupNavigationListener() {
  let lastUrl = location.href;

  // Poll for URL changes (more reliable than popstate for SPAs)
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('[RateAPI] URL changed, re-checking page');

      // Clean up existing overlay
      if (overlayElement) {
        overlayElement.remove();
        overlayElement = null;
        overlayInjected = false;
      }

      // Re-run detection after a delay
      setTimeout(init, 1000);
    }
  }, 1000);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupNavigationListener();
  });
} else {
  init();
  setupNavigationListener();
}
