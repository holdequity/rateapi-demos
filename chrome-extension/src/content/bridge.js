/**
 * Bridge Script - Runs in ISOLATED world
 *
 * Provides access to chrome.* APIs for the MAIN world content script
 * Uses window messaging to communicate between worlds
 */

console.log('[RateAPI Bridge] Initialized in ISOLATED world');

// Listen for messages from MAIN world
window.addEventListener('message', async (event) => {
  // Only accept messages from our extension
  if (event.source !== window || !event.data || event.data.source !== 'rateapi-main') {
    return;
  }

  const { action, payload, requestId } = event.data;
  console.log('[RateAPI Bridge] Received:', action, payload);

  try {
    let response;

    if (action === 'getRates') {
      // Forward to background script
      response = await chrome.runtime.sendMessage({
        action: 'getRates',
        state: payload.state,
        amount: payload.amount,
      });
    } else if (action === 'clearCache') {
      response = await chrome.runtime.sendMessage({ action: 'clearCache' });
    } else if (action === 'getConfig') {
      response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    }

    // Send response back to MAIN world
    try {
      window.postMessage({
        source: 'rateapi-bridge',
        requestId,
        response,
      }, window.location.origin);
    } catch (e) {
      // Fallback for special origins
      window.postMessage({
        source: 'rateapi-bridge',
        requestId,
        response,
      }, '*');
    }

  } catch (error) {
    console.error('[RateAPI Bridge] Error:', error);
    try {
      window.postMessage({
        source: 'rateapi-bridge',
        requestId,
        error: error.message,
      }, window.location.origin);
    } catch (e) {
      window.postMessage({
        source: 'rateapi-bridge',
        requestId,
        error: error.message,
      }, '*');
    }
  }
});

// Signal that bridge is ready
try {
  window.postMessage({ source: 'rateapi-bridge', ready: true }, window.location.origin);
} catch (e) {
  window.postMessage({ source: 'rateapi-bridge', ready: true }, '*');
}
