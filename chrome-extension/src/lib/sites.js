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

  projectionlab: {
    name: 'ProjectionLab',
    hostPattern: /app\.projectionlab\.com/,
    pathPattern: /.*/, // Match any path on ProjectionLab

    // ProjectionLab shows liabilities - we look for mortgage amounts
    priceSelectors: [
      // Vuetify input fields with mortgage-related labels
      'input[type="number"]',
      // Liabilities card value
      '[class*="Liabilities"] [class*="value"]',
      '[class*="liabilities"]',
      // Fallback to any large dollar amount in the dashboard
      '[class*="stat"] [class*="value"]',
    ],

    getState(doc) {
      // ProjectionLab uses Vuetify components
      // Look for state in v-select or v-autocomplete components

      // First, try to find elements that contain state names
      const stateSelectors = [
        // Vuetify select components
        '.v-select__selection',
        '.v-field__input',
        '[class*="v-select"] .v-field__input',
        // Input values
        'input[aria-label*="State"]',
        'input[aria-label*="state"]',
        // Labels followed by values
        '.v-list-item-title',
      ];

      for (const selector of stateSelectors) {
        const elements = doc.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent || el.value || '';
          const stateMatch = matchStateName(text);
          if (stateMatch) {
            console.log('[RateAPI] Found state via selector:', selector, text, '->', stateMatch);
            return stateMatch;
          }
        }
      }

      // Search the entire page text for state names near "State" or "Location" labels
      const allText = doc.body?.innerText || '';

      // Look for patterns like "State\nSouth Carolina" or "State: South Carolina"
      const statePatterns = [
        /State[\s\n:]+([A-Za-z\s]+?)(?:\n|,|$)/gi,
        /Location[\s\n:]+(?:.*?[\n,])?\s*([A-Za-z\s]+?)(?:\n|,|$)/gi,
      ];

      for (const pattern of statePatterns) {
        let match;
        while ((match = pattern.exec(allText)) !== null) {
          const stateMatch = matchStateName(match[1].trim());
          if (stateMatch) {
            console.log('[RateAPI] Found state via text pattern:', match[1], '->', stateMatch);
            return stateMatch;
          }
        }
      }

      // Last resort: scan all text nodes for state names
      const stateNames = Object.keys(STATE_NAMES);
      for (const stateName of stateNames) {
        if (allText.toLowerCase().includes(stateName)) {
          const abbrev = STATE_NAMES[stateName];
          console.log('[RateAPI] Found state via full scan:', stateName, '->', abbrev);
          return abbrev;
        }
      }

      console.log('[RateAPI] Could not detect state');
      return null;
    },

    // For ProjectionLab, we extract mortgage data differently
    getMortgageData(doc) {
      const data = {
        balance: null,
        rate: null,
        monthlyPayment: null,
      };

      // Try to access ProjectionLab's data via their plugin API if available
      if (window.projectionlabPluginAPI) {
        // We can't use the API without user's key, but we can check if it exists
        console.log('[RateAPI] ProjectionLab Plugin API detected');
      }

      // Extract from visible UI elements
      // Look for mortgage/liability amounts
      const liabilitySelectors = [
        '[class*="Liabilities"]',
        '[class*="mortgage"]',
        '[class*="Mortgage"]',
        '[class*="debt"]',
      ];

      for (const selector of liabilitySelectors) {
        const el = doc.querySelector(selector);
        if (el) {
          const text = el.textContent || '';
          // Extract dollar amount
          const amountMatch = text.replace(/[,$]/g, '').match(/(\d+(?:\.\d+)?)\s*[KkMm]?/);
          if (amountMatch) {
            let amount = parseFloat(amountMatch[1]);
            // Handle K/M suffixes
            if (/K/i.test(text)) amount *= 1000;
            if (/M/i.test(text)) amount *= 1000000;
            if (amount > 10000) {
              data.balance = amount;
              break;
            }
          }
        }
      }

      return data;
    },

    // Flag to indicate this is a refinance context
    isRefinanceContext: true,

    anchorSelector: '[class*="Liabilities"]',
  },
};

/**
 * State name to abbreviation mapping
 */
const STATE_NAMES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

/**
 * Match a state name or abbreviation and return the abbreviation
 */
function matchStateName(text) {
  if (!text) return null;
  const normalized = text.toLowerCase().trim();

  // Check if it's already an abbreviation
  if (normalized.length === 2 && isValidState(normalized.toUpperCase())) {
    return normalized.toUpperCase();
  }

  // Check state names
  for (const [name, abbrev] of Object.entries(STATE_NAMES)) {
    if (normalized.includes(name)) {
      return abbrev;
    }
  }

  return null;
}

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
