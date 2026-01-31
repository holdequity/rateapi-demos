/**
 * Site-specific selectors and extraction logic
 *
 * Each site has different DOM structures for displaying price and location.
 * This module abstracts away those differences.
 */

export const SITES = {
  zillow: {
    name: 'Zillow',
    hostPattern: /zillow\.com/,
    pathPattern: /\/homedetails\//,

    // Price selectors (try in order)
    priceSelectors: [
      '[data-testid="price"] span',
      '.ds-summary-row .ds-value',
      '.price',
      '[class*="Price"]',
    ],

    // State extraction methods
    getState(doc) {
      // Try URL first (e.g., /homedetails/123-main-st-austin-tx-78701/12345_zpid/)
      const urlMatch = window.location.pathname.match(/-([a-z]{2})-\d{5}/i);
      if (urlMatch) {
        return urlMatch[1].toUpperCase();
      }

      // Try address element
      const addressEl = doc.querySelector('[data-testid="address"]');
      if (addressEl) {
        const stateMatch = addressEl.textContent.match(/,\s*([A-Z]{2})\s+\d{5}/);
        if (stateMatch) return stateMatch[1];
      }

      // Try breadcrumb
      const breadcrumb = doc.querySelector('.breadcrumb-link');
      if (breadcrumb) {
        const stateMatch = breadcrumb.textContent.match(/\b([A-Z]{2})\b/);
        if (stateMatch) return stateMatch[1];
      }

      return null;
    },

    // Best location to inject overlay (near price)
    anchorSelector: '[data-testid="price"]',
  },

  redfin: {
    name: 'Redfin',
    hostPattern: /redfin\.com/,
    pathPattern: /\/home\//,

    priceSelectors: ['.statsValue', '.price', '[data-rf-test-id="abp-price"]', '.HomeInfoPrice'],

    getState(doc) {
      // Try URL (e.g., /CA/San-Francisco/123-Main-St-94102/home/12345)
      const urlMatch = window.location.pathname.match(/^\/([A-Z]{2})\//i);
      if (urlMatch) {
        return urlMatch[1].toUpperCase();
      }

      // Try address
      const addressEl = doc.querySelector('.street-address');
      if (addressEl) {
        const parent = addressEl.closest('.homeAddress');
        if (parent) {
          const stateMatch = parent.textContent.match(/,\s*([A-Z]{2})\s+\d{5}/);
          if (stateMatch) return stateMatch[1];
        }
      }

      // Try region selector
      const region = doc.querySelector('.region');
      if (region) {
        const stateMatch = region.textContent.match(/\b([A-Z]{2})\b/);
        if (stateMatch) return stateMatch[1];
      }

      return null;
    },

    anchorSelector: '.statsValue',
  },

  realtor: {
    name: 'Realtor.com',
    hostPattern: /realtor\.com/,
    pathPattern: /\/realestateandhomes-detail\//,

    priceSelectors: [
      '[data-testid="list-price"]',
      '.price-details',
      '.listing-price',
      '.ldp-header-price',
    ],

    getState(doc) {
      // Try URL (e.g., /realestateandhomes-detail/123-Main-St_Austin_TX_78701_M12345-67890)
      const urlMatch = window.location.pathname.match(/_([A-Z]{2})_\d{5}/i);
      if (urlMatch) {
        return urlMatch[1].toUpperCase();
      }

      // Try address element
      const addressEl = doc.querySelector('[data-testid="address"]');
      if (addressEl) {
        const stateMatch = addressEl.textContent.match(/,\s*([A-Z]{2})\s+\d{5}/);
        if (stateMatch) return stateMatch[1];
      }

      // Try breadcrumb
      const breadcrumbs = doc.querySelectorAll('.breadcrumb a');
      for (const crumb of breadcrumbs) {
        const stateMatch = crumb.textContent.match(/\b([A-Z]{2})\b/);
        if (stateMatch && isValidState(stateMatch[1])) {
          return stateMatch[1];
        }
      }

      return null;
    },

    anchorSelector: '[data-testid="list-price"]',
  },
};

/**
 * Detect which site we're on
 */
export function detectSite() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  for (const [key, site] of Object.entries(SITES)) {
    if (site.hostPattern.test(hostname) && site.pathPattern.test(pathname)) {
      return { key, ...site };
    }
  }

  return null;
}

/**
 * Extract price from the page using site-specific selectors
 */
export function extractPrice(site, doc = document) {
  for (const selector of site.priceSelectors) {
    const el = doc.querySelector(selector);
    if (el) {
      const text = el.textContent || '';
      // Remove currency symbols, commas, and extract number
      const priceMatch = text.replace(/[,$]/g, '').match(/(\d+(?:\.\d+)?)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        // Sanity check: price should be reasonable for a home
        if (price > 10000 && price < 100000000) {
          return price;
        }
      }
    }
  }
  return null;
}

/**
 * Extract state from the page using site-specific logic
 */
export function extractState(site, doc = document) {
  return site.getState(doc);
}

/**
 * Get the anchor element where we should position the overlay near
 */
export function getAnchorElement(site, doc = document) {
  return doc.querySelector(site.anchorSelector);
}

/**
 * Valid US state abbreviations
 */
const US_STATES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
]);

function isValidState(abbrev) {
  return US_STATES.has(abbrev);
}
