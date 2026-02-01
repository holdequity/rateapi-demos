# ProjectionLab Integration - Developer Implementation Guide

**Reference implementation for integrating RateAPI's refinance rates into financial planning applications**

![ProjectionLab Integration Demo](./assets/projection-lab.png)
*Demo showing refinance API pattern: 5.652% APR offers vs 7% current rate*

## Overview

This integration demonstrates how to implement **refinance-specific mortgage rate lookups** in financial planning applications. It showcases API patterns for extracting existing loan data and presenting refinance options, contrasting with the purchase-focused patterns used in the real estate site integrations.

**What This Demonstrates:**
- Refinance vs. purchase API request structures
- Extracting loan data from financial planning UI components
- Persistent state management with chrome.storage
- Current rate comparison logic
- Vuetify form field extraction patterns

**Target Developers:** Teams building financial planning tools, refinance calculators, or mortgage optimization features.

## Why This Integration Pattern Matters

**Refinance rate integrations solve a different problem than purchase rate lookups.** Key differences:

- **Context:** Existing loan optimization vs. new home purchase
- **Data Input:** Current loan balance + rate vs. list price
- **User Intent:** Cost reduction decision vs. affordability check
- **API Call:** `intent: "refinance"` vs. `intent: "purchase"`
- **Comparison:** Current rate vs. national average

This integration shows developers how to handle both contexts in the same application, demonstrating the flexibility of RateAPI's Decision Engine.

## How It Works

### 1. Automatic Detection

The extension runs seamlessly in the background on `app.projectionlab.com`. When you're viewing your dashboard, it:

- Detects your mortgage liability from Vuetify form fields
- Extracts your current loan balance (e.g., `Current Loan Balance: $400,000`)
- Reads your current APR if available (e.g., `Annual Percentage Rate: 7.0%`)
- Identifies your state location from ProjectionLab settings

### 2. Smart State Handling

The extension uses multiple strategies to determine your location:

**Priority 1: Page Detection**
- Scans Vuetify select components for state selections
- Searches for state names in location fields
- Matches full state names (e.g., "South Carolina" → SC)

**Priority 2: Chrome Storage**
- Remembers your state selection between sessions
- Persists even if ProjectionLab doesn't show location

**Priority 3: User Selection**
- If state can't be auto-detected, shows a dropdown selector
- One-time selection is saved for future visits

### 3. Live Credit Union Rates

Once state and mortgage amount are detected, the extension displays:

- **Best available rate** from 2,900+ credit unions in your state
- **Monthly savings** vs. your current rate (or national average)
- **Top 5 credit union offers** with specific APRs and monthly payments
- **Refinance-optimized display** (not purchase rates)

### 4. Refinance Context

Unlike the real estate site integrations, ProjectionLab shows refinance-specific data:

- Uses your **current loan balance** (not purchase price)
- Defaults to `intent: refinance` in API calls
- Compares against your **existing APR** if detected
- Shows **"Potential Savings"** rather than "vs. National Average"

## Running the Demo

### For Developers

1. **Clone the demos repository:**
   ```bash
   git clone https://github.com/rate-api/demos.git
   cd rateapi-demos
   node run.js chrome-extension
   ```

2. **Load in Chrome:**
   - Open `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Test the integration:**
   - Visit `app.projectionlab.com` (requires a ProjectionLab account)
   - Navigate to your dashboard with mortgage data visible
   - The overlay will inject automatically

4. **Observe the extraction:**
   - Open DevTools Console (F12)
   - Look for `[RateAPI]` log messages showing data extraction
   - See how state detection and storage works

### Testing with Live API Data

The demo works with mock data by default. To test with real RateAPI calls:

1. **Get an API key:** [https://api.rateapi.dev](https://api.rateapi.dev) (free tier available)

2. **Configure the proxy:**
   ```bash
   cd chrome-extension
   RATEAPI_KEY=your-key-here npm run server
   ```

3. **Or deploy your own Cloudflare Worker** (see Production Setup in main README)

This lets you test the full API integration flow with real rate data.

## Technical Details

### Data Extraction

The extension uses site-specific extraction for ProjectionLab's Vuetify-based UI:

```javascript
// Scans all Vuetify input fields
const allInputs = document.querySelectorAll('input.v-field__input');

for (const input of allInputs) {
  const label = input.closest('.v-field__field')?.querySelector('.v-label')?.textContent;
  const rawValue = input.value;

  // Check for Annual Percentage Rate / APR
  if (label.includes('annual percentage rate')) {
    currentRate = parseFloat(rawValue.replace(/[%]/g, ''));
  }

  // Check for Current Loan Balance
  if (label.includes('loan balance')) {
    mortgageAmount = parseFloat(rawValue.replace(/[$,]/g, ''));
  }
}
```

### State Matching Algorithm

Handles various ProjectionLab state display formats:

```javascript
// Full state names
matchStateName("South Carolina") → "SC"
matchStateName("New York") → "NY"

// State abbreviations
matchStateName("CA") → "CA"

// Mixed case / whitespace
matchStateName("  california  ") → "CA"
```

Searches in priority order:
1. Vuetify select components (`.v-select__selection`)
2. Input aria-labels (`input[aria-label*="State"]`)
3. Text pattern matching (`State\nSouth Carolina`)
4. Full page text scan for state names

### Refinance API Integration

API request differs from purchase context:

```json
{
  "decision_type": "financing",
  "product_request": {
    "product_type": "mortgage",
    "intent": "refinance",         // ← Key difference
    "amount": 400000,              // Current loan balance, not purchase price
    "term_months": 360
  },
  "context": {
    "geo": { "state": "SC" }
  }
}
```

Response includes refinance-specific savings calculations:

```json
{
  "summary": {
    "estimated_savings": {
      "monthly": 214,
      "total": 77040
    }
  }
}
```

### SPA Navigation Handling

ProjectionLab is a Vue.js SPA, so the extension:

- Waits 2 seconds for initial page load
- Retries state detection 3 times (1-second intervals)
- Polls for URL changes to handle client-side routing
- Re-injects overlay on navigation if needed

## User Experience

### First-Time Flow

1. User opens ProjectionLab dashboard with mortgage liability
2. Extension detects page: `[RateAPI] Detected ProjectionLab page`
3. Waits for SPA to load: `[RateAPI] Page settled, extracting data...`
4. Extracts mortgage amount: `[RateAPI] ✓ Found mortgage balance: 400000`
5. Tries to detect state (may fail on first load)
6. Shows state selector if needed
7. User selects state → saved to Chrome storage
8. Fetches and displays live rates

### Returning User Flow

1. User opens ProjectionLab
2. Extension loads saved state from storage: `[RateAPI] Retrieved saved state: SC`
3. Immediately shows loading overlay
4. Fetches and displays rates (no state selection needed)

### Overlay States

**Loading State**
```
┌─────────────────────────────────┐
│ Finding best refinance rates... │
│           [spinner]             │
└─────────────────────────────────┘
```

**State Selection**
```
┌─────────────────────────────────┐
│ Select your state:              │
│ [Dropdown: South Carolina ▼]    │
│           [Continue]            │
└─────────────────────────────────┘
```

**Rates Display**
```
┌─────────────────────────────────┐
│ Credit Union Refinance Rates    │
│                                 │
│ Best Rate: 6.125% APR          │
│ Save $214/mo vs. current rate  │
│                                 │
│ Top Offers:                    │
│ 1. State Employees CU - 6.125% │
│    Monthly: $2,431             │
│ 2. Technology CU - 6.250%      │
│ ... [expand for 3 more]        │
│                                 │
│ [Minimize] [Close]             │
└─────────────────────────────────┘
```

**Error State**
```
┌─────────────────────────────────┐
│ ⚠ Unable to load rates          │
│ Could not connect to rate       │
│ service. Try again?             │
│           [Retry]               │
└─────────────────────────────────┘
```

## Privacy & Security

### What Data is Accessed

The extension reads:
- **Mortgage amount**: From Vuetify input fields labeled "Current Loan Balance" or similar
- **Current APR**: From fields labeled "Annual Percentage Rate" (if present)
- **State**: From ProjectionLab settings or user selection

### What Data is NOT Accessed

The extension does NOT:
- Read your ProjectionLab account credentials
- Access your net worth, income, or other financial details
- Store any financial data (only state abbreviation is saved locally)
- Send data to third parties (only to RateAPI or local proxy)
- Modify your ProjectionLab data in any way

### Data Transmission

- **Demo mode**: No data leaves your browser (uses mock rates)
- **Live mode**: Only state + loan amount sent to RateAPI decision engine
- **Chrome storage**: Only state abbreviation (e.g., "SC") is persisted locally
- **No analytics**: Extension doesn't include tracking or telemetry

### ProjectionLab Plugin API

ProjectionLab offers a Plugin API for integrations, but this extension:
- Does NOT require the Plugin API
- Does NOT access private user data through the API
- Works entirely through DOM extraction (same as Zillow/Redfin integrations)
- Is independent from ProjectionLab (unofficial integration)

## Comparison to Other Integrations

| Feature | Zillow/Redfin | ProjectionLab |
|---------|---------------|---------------|
| **Context** | Home purchase | Refinance existing mortgage |
| **Amount** | List price | Current loan balance |
| **Intent** | `purchase` | `refinance` |
| **User** | Home shoppers | FIRE planners |
| **State Detection** | From property address/URL | From settings or user selection |
| **Savings vs.** | National average | Current rate (if available) |
| **Persistence** | Per-page load | Saved state across sessions |

## Troubleshooting

### Overlay doesn't appear

**Check:**
1. Are you on `app.projectionlab.com` (not the marketing site)?
2. Is there a mortgage/liability visible in your dashboard?
3. Does the mortgage have a "Current Loan Balance" field?

**Debug:**
1. Open DevTools Console (F12)
2. Look for `[RateAPI]` log messages
3. Check if extension detected the page: `[RateAPI] Detected ProjectionLab page`

### "Could not detect state"

**This is normal on first visit.** Solutions:
1. The extension will show a state selector - pick your state
2. Your selection is saved for future visits
3. If ProjectionLab shows your state in settings, make sure it's visible when the page loads

**To clear saved state:**
1. Click extension icon (toolbar)
2. Select "Clear Saved State"
3. Reload ProjectionLab page

### Mortgage amount seems wrong

The extension scans for input fields labeled:
- "Current Loan Balance"
- "Principal"
- "Mortgage Balance"

**If extraction fails:**
1. It will default to $400,000 for demonstration
2. Check that your mortgage is entered in ProjectionLab's Liabilities section
3. Make sure the field label includes one of the keywords above

**To see extraction logs:**
```
Open DevTools Console, look for:
[RateAPI] Input: Current Loan Balance = "$400,000" -> 400000
[RateAPI] ✓ Found mortgage balance: 400000
```

### Rates show "Demo Mode"

This means the local proxy server isn't running or isn't configured with a RateAPI key.

**To use live data:**
1. Get API key from `https://api.rateapi.dev`
2. Run: `RATEAPI_KEY=your-key npm run server` in `chrome-extension/`
3. Reload ProjectionLab page

Demo mode still shows realistic credit union rates - they're just not live data.

## Implementation Patterns for Developers

### Key Code Patterns

**1. Extracting Loan Data from Vuetify Components**

```javascript
// From src/lib/sites.js - ProjectionLab configuration
const allInputs = document.querySelectorAll('input.v-field__input');

for (const input of allInputs) {
  const label = input.closest('.v-field__field')
    ?.querySelector('.v-label')?.textContent || '';
  const rawValue = input.value;

  // Match various label formats
  if (label.toLowerCase().includes('annual percentage rate') ||
      label.toLowerCase().includes('apr')) {
    currentRate = parseFloat(rawValue.replace(/[%]/g, ''));
  }

  if (label.toLowerCase().includes('loan balance') ||
      label.toLowerCase().includes('principal')) {
    mortgageAmount = parseFloat(rawValue.replace(/[$,]/g, ''));
  }
}
```

**2. Refinance API Request Structure**

```javascript
// From src/background.js
const apiRequest = {
  decision_type: 'financing',
  context: {
    request_id: `projectionlab-${Date.now()}`,
    geo: { state: userState }
  },
  product_request: {
    product_type: 'mortgage',
    intent: 'refinance',  // Key difference from purchase
    amount: currentLoanBalance,  // Not list price
    term_months: 360
  },
  preferences: { max_providers: 5 }
};
```

**3. Persistent State Management**

```javascript
// Saving user's state selection
await chrome.storage.local.set({ userState: 'CA' });

// Retrieving on next page load
const { userState } = await chrome.storage.local.get('userState');
```

**4. Current Rate Comparison Logic**

```javascript
// Calculate savings against current rate (not national avg)
const monthlySavings = currentRate
  ? calculatePayment(amount, currentRate) - calculatePayment(amount, bestRate)
  : calculatePayment(amount, NATIONAL_AVG) - calculatePayment(amount, bestRate);
```

## Extending This Pattern

### Adapting for Other Financial Planning Apps

This integration pattern works for any financial planning application with visible loan data. Consider:

**Personal Capital / Empower:**
- Similar dashboard layout with loan widgets
- Extract from account detail views
- Handle multiple linked accounts

**Mint / Fidelity:**
- Budget-focused interfaces
- Loan data in debt tracking sections
- May require different selector strategies

**Custom Financial Dashboards:**
- Easier to integrate if you control the markup
- Can add data attributes for extraction
- Consider building RateAPI directly into your API backend

### Potential Enhancements

If you fork this code, consider adding:

- [ ] 15-year mortgage rate support (detect term from UI)
- [ ] ARM vs. Fixed rate toggle
- [ ] Points buydown calculator
- [ ] Multi-property support (iterate through all mortgages)
- [ ] Auto-refresh on mortgage data changes (MutationObserver)
- [ ] Export to CSV for financial planning import
- [ ] Rate change alerts (monitor mode)

### Contributing

Want to improve this integration demo? Contributions welcome:

- **GitHub Issues**: [Open an issue](https://github.com/rate-api/demos/issues) with `[ProjectionLab]` tag
- **Pull Requests**: Fork and submit improvements
- **Share Your Implementation**: Building something similar? We'd love to see it

**Email us:** support@rateapi.dev with "ProjectionLab Demo" in subject

## For ProjectionLab Power Users

### Advanced Scenarios

**Scenario 1: Coast FI Calculation**

Many FIRE followers pursue "Coast FI" (stop contributing, let investments grow). Refinancing reduces your mandatory expenses, lowering your Coast FI number.

```
Current mortgage: $2,661/mo × 12 = $31,932/year
After refinance: $2,431/mo × 12 = $29,172/year
Reduction: $2,760/year

Coast FI calculation:
- Reduce "Required Annual Spending" by $2,760 in ProjectionLab
- Multiply by 25 (4% rule) = $69,000 lower FI number
- Or continue current spending and reach FI sooner
```

**Scenario 2: Geographic Arbitrage**

Planning to relocate? Use the extension to compare rates across states:

1. Click extension icon → "Clear Saved State"
2. Reload ProjectionLab
3. Select target state in dropdown
4. Compare credit union rates between current and target locations
5. Factor into relocation decision in ProjectionLab

**Scenario 3: Extra Payments**

Credit unions often have zero prepayment penalties. Model in ProjectionLab:

1. Get refinance rate from extension (e.g., 6.125%)
2. Update mortgage rate in ProjectionLab
3. Add extra payments in "Additional Principal" field
4. Extension rates update savings calculation
5. Model payoff timeline with ProjectionLab's charts

### ProjectionLab + RateAPI Workflow

**Monthly review process:**

1. Update net worth in ProjectionLab
2. Extension shows current refinance rates
3. If rates dropped significantly (>0.25%), investigate refinancing
4. Create ProjectionLab scenario with new rate
5. Compare FI dates between scenarios
6. Decide whether closing costs justify refinance

**Quarterly check:**

1. Review mortgage balance in ProjectionLab
2. Check if your state's credit union rates improved
3. Model different loan terms (15yr vs 30yr)
4. Update FI projection based on mortgage progress

## Developer Notes

### Extending for Other Financial Apps

This integration pattern could work for:

- **Personal Capital** - Similar dashboard layout
- **Empower (formerly Personal Capital)** - Retirement planning
- **Fidelity Full View** - Net worth tracking
- **Mint** (before shutdown) - Budget + goals

**Key requirements:**
- SPA architecture (Vue/React)
- Visible mortgage/loan data in DOM
- State/location information available
- iframe-free interface (for content scripts)

### Contributing

Want to improve the ProjectionLab integration?

**High-value contributions:**
- Better state detection (ProjectionLab's location field changes)
- Multiple mortgage support
- ARM vs. Fixed rate toggle
- Integration with ProjectionLab Plugin API (if you have access)
- 15-year mortgage rate display

**How to contribute:**
1. Fork the repo: `https://github.com/rate-api/demos`
2. Create feature branch: `git checkout -b projectionlab-feature`
3. Test on your ProjectionLab account
4. Submit PR with screenshots

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Legal & Disclaimer

**Unofficial Integration / Demo Code**: This integration is not affiliated with, endorsed by, or supported by ProjectionLab. It's example code built by RateAPI to demonstrate API integration patterns.

**For Developers Only**: This is demonstration code for learning purposes, not a consumer product. Actual implementations should consider user privacy, terms of service, and proper authentication.

**Educational Purpose**: Rate data shown is for informational and demonstration purposes. Actual rates depend on credit score, debt-to-income ratio, and lender underwriting.

**ProjectionLab Trademark**: "ProjectionLab" is a trademark of ProjectionLab, Inc. Used here for identification purposes only.

**License**: MIT License - see [LICENSE](../LICENSE)

## Developer Resources

- [RateAPI Documentation](https://docs.rateapi.dev) - API reference and guides
- [Get API Key](https://api.rateapi.dev) - Sign up for API access
- [Extension Source Code](https://github.com/rate-api/demos/tree/main/chrome-extension) - Full implementation
- [Report Issues](https://github.com/rate-api/demos/issues) - Bugs and questions
- [ProjectionLab](https://projectionlab.com) - The financial planning app (not affiliated)

---

**Part of the [RateAPI Demos](https://github.com/rate-api/demos) repository** - Example implementations for developers evaluating RateAPI
