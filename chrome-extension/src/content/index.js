/**
 * Content Script Entry Point
 *
 * Detects the current site, extracts listing information,
 * and injects the rate overlay component.
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

  console.log(`[RateAPI] Detected ${site.name} listing page`);

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
 * Inject the rate overlay component into the page
 */
async function injectOverlay(price, state) {
  if (overlayInjected) {
    console.log('[RateAPI] Overlay already injected');
    return;
  }

  // Register the custom element
  if (!registerComponent()) {
    console.error('[RateAPI] Could not register custom element, aborting');
    return;
  }

  // Create the overlay element
  overlayElement = document.createElement('rateapi-overlay');
  overlayElement.loading = true;

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
    fetchAndDisplayRates(price, state);
  });

  // Append to body
  document.body.appendChild(overlayElement);
  overlayInjected = true;

  console.log('[RateAPI] Overlay injected');

  // Fetch rate data
  fetchAndDisplayRates(price, state);
}

/**
 * Fetch rates from background worker and update overlay
 * Uses bridge script for chrome API access (since we're in MAIN world)
 */
async function fetchAndDisplayRates(price, state) {
  if (!overlayElement) return;

  overlayElement.loading = true;
  overlayElement.error = null;

  try {
    // Send message via bridge to background worker
    const response = await sendMessage('getRates', { state, amount: price });

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
