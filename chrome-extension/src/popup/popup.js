/**
 * Popup Script
 *
 * Handles the extension popup UI interactions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const proxyStatus = document.getElementById('proxy-status');
  const mockNotice = document.getElementById('mock-notice');
  const clearCacheBtn = document.getElementById('clear-cache');

  // Check proxy configuration
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (response.success) {
      const { proxyUrl } = response.config;

      if (proxyUrl.includes('YOUR_SUBDOMAIN')) {
        proxyStatus.textContent = 'Not Configured';
        proxyStatus.classList.add('inactive');
        mockNotice.style.display = 'block';
      } else {
        // Try to ping the proxy
        try {
          const pingResponse = await fetch(proxyUrl, {
            method: 'OPTIONS',
            mode: 'cors',
          });
          if (pingResponse.ok || pingResponse.status === 204) {
            proxyStatus.textContent = 'Connected';
            proxyStatus.classList.add('active');
          } else {
            proxyStatus.textContent = 'Error';
            proxyStatus.classList.add('inactive');
            mockNotice.style.display = 'block';
          }
        } catch (e) {
          // CORS error or network error - likely means proxy is configured but we can't ping it from popup
          proxyStatus.textContent = 'Configured';
          proxyStatus.classList.add('active');
        }
      }
    }
  } catch (error) {
    console.error('Error checking config:', error);
    proxyStatus.textContent = 'Unknown';
    proxyStatus.classList.add('inactive');
  }

  // Clear cache button
  clearCacheBtn.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearCache' });
      clearCacheBtn.textContent = 'Cache Cleared!';
      clearCacheBtn.disabled = true;

      setTimeout(() => {
        clearCacheBtn.textContent = 'Clear Cached Rates';
        clearCacheBtn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      clearCacheBtn.textContent = 'Error - Try Again';

      setTimeout(() => {
        clearCacheBtn.textContent = 'Clear Cached Rates';
      }, 2000);
    }
  });
});
