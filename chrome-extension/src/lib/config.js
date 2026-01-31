/**
 * Extension configuration
 *
 * For demo: Run the local proxy server with `npm run server`
 * For production: Deploy a Cloudflare Worker and update PROXY_URL
 */
export const CONFIG = {
  // Local proxy server for demo (run `npm run server`)
  // For production, use a Cloudflare Worker URL
  PROXY_URL: 'http://localhost:3000/rates',

  // Cache duration in seconds (1 hour)
  CACHE_TTL: 3600,

  // National average rate for comparison display
  // This is updated periodically based on market data
  NATIONAL_AVG_RATE: 6.75,

  // Default loan term in months (30-year fixed)
  DEFAULT_TERM_MONTHS: 360,

  // Overlay display delay in ms (wait for page to settle)
  OVERLAY_DELAY: 1500,
};
