# RateAPI Chrome Extension

**See credit union mortgage rates while browsing Zillow, Redfin & Realtor.com**

A Chrome extension that automatically detects property listings and displays competitive credit union mortgage rates with potential savings calculations. Works in demo mode with no setup required.

![Chrome Extension Demo](../assets/chrome-extension-demo.png)

## Features

- **Auto-Detection** - Recognizes property listings on Zillow, Redfin, and Realtor.com
- **Real-Time Rates** - Shows best available credit union rates vs national average
- **Savings Calculator** - Instantly calculates potential monthly savings
- **Top Offers** - Displays 5 best credit union mortgage options
- **Non-Intrusive UI** - Clean overlay with minimize/expand controls
- **Demo Mode** - Works immediately with realistic sample data

## Supported Sites

| Site | URL Pattern | Status |
|------|-------------|--------|
| **Zillow** | `zillow.com/homedetails/*` | Supported |
| **Redfin** | `redfin.com/*/home/*` | Supported |
| **Realtor.com** | `realtor.com/realestateandhomes-detail/*` | Supported |

## Quick Start

### Option 1: Using run.js (Recommended)

From the repo root:

```bash
# Build extension and start proxy server
node run.js chrome-extension

# Then load in Chrome:
# 1. Open chrome://extensions
# 2. Enable "Developer mode" (top right)
# 3. Click "Load unpacked"
# 4. Select the chrome-extension folder
# 5. Visit any property listing on Zillow, Redfin, or Realtor.com
```

The proxy server runs at `http://localhost:3000` and uses the shared `.env` file.

**To use live RateAPI data**, add your key to the root `.env`:
```bash
# In rateapi-demos/.env
RATEAPI_KEY=your-key
```

Or run rate-explorer first to auto-create an API key:
```bash
node run.js rate-explorer
```

### Option 2: Manual Setup

```bash
cd chrome-extension
npm install
npm run dev  # Builds extension and starts proxy server
```

### Option 3: Extension Only (No Server)

The extension also works without the proxy server, falling back to built-in mock data:

```bash
cd chrome-extension
npm install
npm run build
# Load in Chrome and visit a property listing
```

You should see a floating overlay showing credit union rates when you visit a property listing on Zillow, Redfin, or Realtor.com.

## Development

### Watch Mode

Automatically rebuild on file changes:

```bash
npm run watch
```

After making code changes:
1. Save your files
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card
4. Reload any property listing pages to see changes

### Project Structure

```
chrome-extension/
├── manifest.json              # Chrome Manifest V3 configuration
├── package.json               # Dependencies (Lit, esbuild)
├── esbuild.config.js          # Build configuration
│
├── src/
│   ├── background.js          # Service worker (API calls, caching)
│   │
│   ├── content/
│   │   ├── index.js           # Entry point, site detection, overlay injection
│   │   ├── bridge.js          # ISOLATED world script (chrome API bridge)
│   │   └── components/
│   │       └── rate-overlay.js  # Lit web component (Shadow DOM)
│   │
│   ├── lib/
│   │   ├── config.js          # Extension configuration
│   │   └── sites.js           # Site-specific DOM selectors
│   │
│   ├── styles/
│   │   └── overlay.css        # Global styles (minimal)
│   │
│   └── popup/
│       ├── popup.html         # Extension popup UI
│       └── popup.js           # Popup logic
│
├── icons/                     # Extension icons (16, 48, 128)
└── dist/                      # Built output (load this in Chrome)
    ├── background.js
    ├── content.js
    ├── bridge.js
    └── content.css
```

### Architecture

The extension uses a **three-tier architecture** to work around Chrome's content script isolation:

```
┌─────────────────────────────────────────────────────┐
│  Background Service Worker (background.js)          │
│  - Handles API calls to proxy server                │
│  - In-memory rate caching (1 hour TTL)              │
│  - Provides mock data for demo mode                 │
└──────────────────┬──────────────────────────────────┘
                   │ chrome.runtime.sendMessage()
                   │
┌──────────────────▼──────────────────────────────────┐
│  Bridge Script (bridge.js) - ISOLATED World         │
│  - Access to chrome.* APIs                          │
│  - Bridges MAIN world ↔ background worker           │
│  - Uses window.postMessage for communication        │
└──────────────────┬──────────────────────────────────┘
                   │ window.postMessage()
                   │
┌──────────────────▼──────────────────────────────────┐
│  Content Script (index.js) - MAIN World             │
│  - Site detection (Zillow/Redfin/Realtor)           │
│  - Price/state extraction from page DOM             │
│  - Overlay component injection                      │
│  - SPA navigation handling                          │
└──────────────────┬──────────────────────────────────┘
                   │ customElements.define()
                   │
┌──────────────────▼──────────────────────────────────┐
│  Rate Overlay (rate-overlay.js) - Lit Component     │
│  - Shadow DOM for style isolation                   │
│  - Loading/error/data states                        │
│  - Minimize/expand/close controls                   │
│  - Rate comparison display                          │
└─────────────────────────────────────────────────────┘
```

**Why Two Content Scripts?**

Chrome Manifest V3 requires content scripts to run in an ISOLATED world for security. However, Lit components need to run in the MAIN world to access the page's `customElements` API. The bridge script acts as a messenger between these two isolated contexts.

### How Site Detection Works

Each supported site has a configuration in `src/lib/sites.js`:

```javascript
{
  name: 'Zillow',
  hostPattern: /zillow\.com/,
  pathPattern: /\/homedetails\//,
  priceSelectors: ['[data-testid="price"]', '.ds-value', ...],
  getState(doc) { /* extraction logic */ },
  anchorSelector: '[data-testid="price"]'
}
```

The content script:
1. Matches current URL against `hostPattern` and `pathPattern`
2. Waits for page to settle (async content loading)
3. Tries each `priceSelector` until it finds a valid price
4. Calls `getState()` to extract state from URL or DOM
5. Injects overlay near `anchorSelector` element

### How API Communication Works

```javascript
// Content script (MAIN world)
const data = await sendMessage('getRates', { state: 'CA', amount: 500000 });

// ↓ window.postMessage()

// Bridge script (ISOLATED world)
const response = await chrome.runtime.sendMessage({ action: 'getRates', ... });

// ↓ chrome.runtime.sendMessage()

// Background worker
const rateData = await fetchRates(state, amount);  // Calls proxy or returns mock
```

## Local Proxy Server

The included Express server (`server.js`) proxies requests to RateAPI:

```bash
# Start with demo data (no API key needed)
npm run server

# Start with live RateAPI data
RATEAPI_KEY=your-key npm run server
```

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rates` | POST | Get mortgage rates for state/amount |
| `/health` | GET | Server health check |

**Request:**
```bash
curl -X POST http://localhost:3000/rates \
  -H "Content-Type: application/json" \
  -d '{"state": "CA", "amount": 500000}'
```

**Response:**
```json
{
  "bestRate": 6.125,
  "avgRate": 6.75,
  "monthlySavings": 127,
  "topOffers": [
    {
      "credit_union_name": "State Employees Credit Union",
      "apr": 6.125,
      "monthly_payment": 3035,
      "state": "CA"
    }
  ],
  "isMockData": true
}
```

---

## Production Setup

For **production deployments**, deploy a Cloudflare Worker proxy to protect your API key.

### Step 1: Create Cloudflare Worker

Deploy this code to Cloudflare Workers:

```javascript
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Validate origin (Chrome extension or localhost for dev)
    const origin = request.headers.get('Origin') || '';
    const isValidOrigin =
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('http://localhost');

    if (!isValidOrigin) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const { state, amount, termMonths } = await request.json();

      // Call RateAPI Decision Engine
      const response = await fetch('https://api.rateapi.dev/v1/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.RATEAPI_KEY,
        },
        body: JSON.stringify({
          decision_type: 'financing',
          context: {
            request_id: `cf-worker-${Date.now()}`,
            geo: { state },
          },
          product_request: {
            product_type: 'mortgage',
            intent: 'purchase',
            amount: amount,
            term_months: termMonths || 360,
          },
          preferences: {
            max_providers: 5,
          },
        }),
      });

      const data = await response.json();

      // Transform API response to extension format
      const offers = data.actions?.[0]?.offers || [];
      const bestRate = offers[0]?.apr || 0;
      const avgRate = 6.75; // National average for comparison

      return Response.json({
        bestRate,
        avgRate,
        monthlySavings: data.summary?.estimated_savings?.monthly || 0,
        topOffers: offers.slice(0, 5).map(offer => ({
          credit_union_name: offer.credit_union_name,
          apr: offer.apr,
          monthly_payment: offer.monthly_payment,
          state: state,
        })),
      }, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } catch (error) {
      return Response.json({
        error: error.message
      }, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
        }
      });
    }
  }
};
```

### Step 2: Configure Worker Secrets

```bash
# Install Wrangler (if not already installed)
npm install -g wrangler

# Add your RateAPI key as a secret
wrangler secret put RATEAPI_KEY
# Enter your RateAPI key when prompted
```

### Step 3: Deploy Worker

```bash
wrangler deploy
# Note the deployed URL (e.g., https://rateapi-proxy.your-subdomain.workers.dev)
```

### Step 4: Update Extension Config

Edit `src/lib/config.js`:

```javascript
export const CONFIG = {
  PROXY_URL: 'https://rateapi-proxy.your-subdomain.workers.dev',
  CACHE_TTL: 3600,
  NATIONAL_AVG_RATE: 6.75,
  DEFAULT_TERM_MONTHS: 360,
  OVERLAY_DELAY: 1500,
};
```

### Step 5: Rebuild Extension

```bash
npm run build
```

Reload the extension in `chrome://extensions` and visit a property listing to see live rate data.

## API Endpoints Used

This extension integrates with RateAPI's Decision Engine:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/decisions` | POST | Get mortgage rate recommendations by state and loan amount |

**Request Example:**
```json
{
  "decision_type": "financing",
  "context": {
    "request_id": "chrome-ext-1234567890",
    "geo": { "state": "CA" }
  },
  "product_request": {
    "product_type": "mortgage",
    "intent": "purchase",
    "amount": 500000,
    "term_months": 360
  },
  "preferences": { "max_providers": 5 }
}
```

**Response Example:**
```json
{
  "summary": {
    "recommended_action": "shop_providers",
    "confidence": 0.92,
    "estimated_savings": {
      "monthly": 127,
      "total": 45720
    }
  },
  "actions": [{
    "offers": [
      {
        "rank": 1,
        "credit_union_name": "State Employees Credit Union",
        "product_name": "30-Year Fixed",
        "apr": 6.125,
        "monthly_payment": 3035,
        "estimated_monthly_savings": 127,
        "credit_union_slug": "state-employees-cu"
      }
    ]
  }]
}
```

## Tech Stack

| Technology | Purpose | Size |
|------------|---------|------|
| **Lit** | Web Components framework | ~5kb |
| **esbuild** | Fast bundler | Dev only |
| **Shadow DOM** | Style isolation | Built-in |
| **Chrome Manifest V3** | Extension API | - |

### Why Lit?

- Lightweight (5kb vs 40kb+ for React)
- Native Shadow DOM support for perfect style isolation
- No virtual DOM overhead
- Works seamlessly with customElements API

### Why Shadow DOM?

Shadow DOM prevents the extension's styles from conflicting with Zillow/Redfin/Realtor stylesheets (and vice versa). This is critical for extensions that inject UI into existing pages.

## Customization

### Styling the Overlay

The overlay component uses CSS custom properties for theming. Edit `src/content/components/rate-overlay.js`:

```javascript
static styles = css`
  :host {
    --rateapi-brand: #2563eb;        /* Primary color */
    --rateapi-success: #059669;      /* Savings color */
    --rateapi-surface: #ffffff;      /* Background */
    --rateapi-radius: 12px;          /* Border radius */
    --rateapi-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  }
  // ...
`;
```

### Adding New Sites

To support additional real estate sites, add a configuration to `src/lib/sites.js`:

```javascript
export const SITES = {
  // Existing sites...

  newsite: {
    name: 'New Site',
    hostPattern: /newsite\.com/,
    pathPattern: /\/property\//,

    // Price selectors (try in order)
    priceSelectors: ['.listing-price', '.price-value'],

    // State extraction logic
    getState(doc) {
      const match = window.location.pathname.match(/\/([A-Z]{2})\//);
      return match ? match[1] : null;
    },

    // Where to position overlay
    anchorSelector: '.listing-price',
  },
};
```

Then update `manifest.json` to include the new site:

```json
{
  "content_scripts": [
    {
      "matches": [
        "https://*.zillow.com/homedetails/*",
        "https://*.redfin.com/*/home/*",
        "https://*.realtor.com/realestateandhomes-detail/*",
        "https://*.newsite.com/property/*"
      ],
      // ...
    }
  ]
}
```

### Changing Cache Duration

Edit `src/lib/config.js`:

```javascript
export const CONFIG = {
  CACHE_TTL: 1800, // 30 minutes (in seconds)
  // ...
};
```

## Troubleshooting

### Overlay doesn't appear

**Symptoms:** No rate overlay shows on property listings

**Solutions:**
1. Verify you're on a property **detail page**, not search results
2. Open DevTools Console (F12) and look for `[RateAPI]` logs
3. Check that the extension is enabled in `chrome://extensions`
4. Try refreshing the page (some sites use lazy loading)
5. Verify the site is supported (Zillow/Redfin/Realtor detail pages only)

### "Demo Mode" badge showing

**Symptoms:** Extension displays sample data with a yellow "Demo Mode" badge

**Explanation:** This is expected behavior when the proxy isn't configured. The extension falls back to realistic mock data for demonstration purposes.

**To use live data:** Follow the [Production Setup](#production-setup) guide above.

### Rate data seems stale

**Symptoms:** Rates don't update when revisiting the same property

**Solution:**
1. Click the extension icon (top-right toolbar)
2. Select "Clear Cached Rates"
3. Refresh the property page

Rates are cached for 1 hour to reduce API calls and improve performance.

### Extension doesn't load after updates

**Symptoms:** Changes don't appear after rebuilding

**Solution:**
1. Go to `chrome://extensions`
2. Find "RateAPI - Credit Union Rate Checker"
3. Click the refresh icon (circular arrow)
4. Reload any open property listing pages

### Console errors about customElements

**Symptoms:** `customElements is not defined` errors in console

**Explanation:** The extension is configured to run content scripts in the MAIN world (not ISOLATED), which should have access to customElements. This error suggests a configuration issue.

**Solution:**
1. Verify `manifest.json` has `"world": "MAIN"` for the content script
2. Check that you're using the built `dist/content.js`, not the source file
3. Rebuild the extension: `npm run build`

### CORS errors in DevTools

**Symptoms:** Console shows CORS policy errors when fetching rates

**Explanation:** The Cloudflare Worker proxy must include proper CORS headers for Chrome extension origins.

**Solution:** Verify your proxy includes:
```javascript
'Access-Control-Allow-Origin': request.headers.get('Origin')
```

The origin will be something like `chrome-extension://abcdefghijklmnop`.

## Publishing to Chrome Web Store

To publish this extension publicly:

1. **Prepare assets:**
   - Create promotional images (1400x560, 920x680, 640x400)
   - Write store description
   - Take screenshots of the extension in action

2. **Update manifest:**
   - Set final version number
   - Add production proxy URL to config
   - Remove demo mode code if desired

3. **Create ZIP:**
   ```bash
   npm run build
   zip -r extension.zip manifest.json dist/ icons/ src/popup/
   ```

4. **Submit:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay one-time $5 developer fee (if first extension)
   - Upload `extension.zip`
   - Fill out store listing
   - Submit for review (typically 1-3 days)

5. **Consider:**
   - Privacy policy URL (required if collecting data)
   - Support email address
   - Pricing model (free or paid)

## Performance

The extension is optimized for minimal impact:

- **Bundle size:** ~15kb total (content + background scripts)
- **Memory:** ~2-5MB (including cached rate data)
- **Network:** 1 API call per property (cached for 1 hour)
- **CPU:** Negligible (event-driven architecture)

## Security Considerations

- **API Key Protection:** Never embed API keys in extension code. Always use a proxy server.
- **Content Security Policy:** The extension follows Chrome's recommended CSP.
- **Origin Validation:** Proxy server validates requests come from the extension.
- **Shadow DOM Isolation:** Prevents host page scripts from accessing extension UI.
- **Minimal Permissions:** Only requests `storage` and `activeTab` permissions.

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Resources

- [RateAPI Documentation](https://rateapi.dev)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Lit Documentation](https://lit.dev)
- [Cloudflare Workers](https://workers.cloudflare.com)

## Support

- Questions? [Open an issue](https://github.com/rate-api/demos/issues)
- Feature requests? [Submit a PR](https://github.com/rate-api/demos/pulls)
- API support? [Email support@rateapi.dev](mailto:support@rateapi.dev)
