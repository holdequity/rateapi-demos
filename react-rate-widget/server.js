/**
 * Simple Express proxy server for the React Rate Widget demo
 *
 * This keeps your API key server-side where it belongs.
 *
 * Usage:
 *   RATEAPI_KEY=your-key node server.js
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const RATEAPI_KEY = process.env.RATEAPI_KEY;
const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

if (!RATEAPI_KEY) {
  console.error('Error: RATEAPI_KEY environment variable is required');
  console.log('Usage: RATEAPI_KEY=your-key node server.js');
  process.exit(1);
}

// Serve static files from dist (after build)
app.use(express.static(join(__dirname, 'dist')));

// Proxy endpoint - uses /v1/decisions to get rate recommendations
app.get('/api/rates', async (req, res) => {
  try {
    const { state, limit = 5 } = req.query;

    // Use the new decisions endpoint format
    const response = await fetch(`${RATEAPI_URL}/v1/decisions`, {
      method: 'POST',
      headers: {
        'X-API-Key': RATEAPI_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision_type: 'financing',
        context: {
          request_id: `widget_${Date.now()}`,
          geo: { state: state || 'CA' }
        },
        product_request: {
          product_type: 'mortgage',
          intent: 'purchase',
          amount: 500000,
          term_months: 360,
          rate_type: 'fixed'
        },
        preferences: {
          max_providers: parseInt(limit, 10),
          prefer_credit_unions: true
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();

    // Transform from new response format to widget-friendly format
    const offers = data.actions?.[0]?.offers || [];
    const results = offers.map((offer) => ({
      institution: offer.credit_union_name,
      city: '',
      state: offer.state || state || 'CA',
      rate: offer.rate,
      apr: offer.apr,
      points: offer.points || 0,
      monthlyPayment: offer.monthly_payment,
    }));

    res.json({ results });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// Serve the demo page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Rate Widget Demo</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 8px;
      color: #1a1a2e;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 32px;
    }
    .demo-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .demo-section h2 {
      font-size: 18px;
      margin-bottom: 16px;
      color: #333;
    }
    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    select, button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
    }
    select {
      border: 1px solid #ddd;
      background: white;
    }
    button {
      background: #1a1a2e;
      color: white;
      border: none;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }

    /* Widget styles */
    .rateapi-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      background: #ffffff;
      border: 1px solid #e5e7eb;
    }
    .rateapi-widget-dark {
      background: #1f2937;
      color: #f9fafb;
      border-color: #374151;
    }
    .rateapi-widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .rateapi-widget-dark .rateapi-widget-header {
      border-bottom-color: #374151;
    }
    .rateapi-widget-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .rateapi-widget-updated {
      font-size: 12px;
      opacity: 0.6;
    }
    .rateapi-widget-content {
      min-height: 150px;
    }
    .rateapi-widget-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 12px;
      opacity: 0.6;
    }
    .rateapi-widget-error {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 20px;
      gap: 8px;
      color: #ef4444;
    }
    .rateapi-widget-table-header {
      display: flex;
      padding: 12px 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }
    .rateapi-widget-row {
      display: flex;
      padding: 14px 20px;
      align-items: center;
      border-top: 1px solid #f3f4f6;
    }
    .rateapi-widget-dark .rateapi-widget-row {
      border-top-color: #374151;
    }
    .rateapi-widget-col-institution {
      flex: 2;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rateapi-widget-institution-name {
      font-weight: 500;
    }
    .rateapi-widget-institution-location {
      font-size: 12px;
      opacity: 0.6;
    }
    .rateapi-widget-col-rate,
    .rateapi-widget-col-apr {
      flex: 1;
      text-align: right;
      font-size: 14px;
    }
    .rateapi-widget-rate-value {
      font-weight: 600;
      color: #10b981;
    }
    .rateapi-widget-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .rateapi-widget-dark .rateapi-widget-footer {
      border-top-color: #374151;
      background: #111827;
    }
    .rateapi-widget-refresh {
      padding: 6px 12px;
      font-size: 13px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .rateapi-widget-powered {
      font-size: 11px;
      text-decoration: none;
      opacity: 0.5;
      color: inherit;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 React Rate Widget</h1>
    <p class="subtitle">Embeddable mortgage rate comparison widget</p>

    <div class="demo-section">
      <h2>Live Demo</h2>
      <div class="controls">
        <select id="state-select">
          <option value="">All States</option>
          <option value="CA">California</option>
          <option value="TX">Texas</option>
          <option value="NY">New York</option>
          <option value="FL">Florida</option>
          <option value="WA">Washington</option>
        </select>
        <select id="theme-select">
          <option value="light">Light Theme</option>
          <option value="dark">Dark Theme</option>
        </select>
        <button onclick="refreshWidget()">Refresh</button>
      </div>
      <div id="widget-root"></div>
    </div>
  </div>

  <script>
    const { useState, useEffect, useCallback } = React;

    // Simple RateWidget component
    function RateWidget({ proxyUrl, state, theme = 'light', limit = 5 }) {
      const [rates, setRates] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [lastUpdated, setLastUpdated] = useState(null);

      const fetchRates = useCallback(async () => {
        try {
          setLoading(true);
          setError(null);

          const params = new URLSearchParams();
          if (state) params.set('state', state);
          params.set('limit', limit);
          params.set('sortBy', 'apr');
          params.set('sortOrder', 'asc');

          const response = await fetch(proxyUrl + '?' + params.toString());
          if (!response.ok) throw new Error('Failed to fetch');

          const data = await response.json();
          setRates(data.results || []);
          setLastUpdated(new Date());
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }, [proxyUrl, state, limit]);

      useEffect(() => { fetchRates(); }, [fetchRates]);

      const formatRate = (r) => r.toFixed(3) + '%';
      const getRelativeTime = (date) => {
        const mins = Math.floor((Date.now() - date.getTime()) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        return Math.floor(mins / 60) + 'h ago';
      };

      const themeClass = theme === 'dark' ? 'rateapi-widget-dark' : '';

      return React.createElement('div', { className: 'rateapi-widget ' + themeClass },
        React.createElement('div', { className: 'rateapi-widget-header' },
          React.createElement('h3', { className: 'rateapi-widget-title' }, "Today's Best Rates"),
          lastUpdated && React.createElement('span', { className: 'rateapi-widget-updated' },
            'Updated ' + getRelativeTime(lastUpdated))
        ),
        React.createElement('div', { className: 'rateapi-widget-content' },
          loading && rates.length === 0 &&
            React.createElement('div', { className: 'rateapi-widget-loading' }, 'Loading rates...'),
          error &&
            React.createElement('div', { className: 'rateapi-widget-error' }, 'Error: ' + error),
          rates.length > 0 && React.createElement('div', { className: 'rateapi-widget-table' },
            React.createElement('div', { className: 'rateapi-widget-table-header' },
              React.createElement('span', { className: 'rateapi-widget-col-institution' }, 'Institution'),
              React.createElement('span', { className: 'rateapi-widget-col-rate' }, 'Rate'),
              React.createElement('span', { className: 'rateapi-widget-col-apr' }, 'APR')
            ),
            rates.map((rate, i) =>
              React.createElement('div', { key: i, className: 'rateapi-widget-row' },
                React.createElement('div', { className: 'rateapi-widget-col-institution' },
                  React.createElement('span', { className: 'rateapi-widget-institution-name' }, rate.institution),
                  React.createElement('span', { className: 'rateapi-widget-institution-location' },
                    rate.city + ', ' + rate.state)
                ),
                React.createElement('span', { className: 'rateapi-widget-col-rate rateapi-widget-rate-value' },
                  formatRate(rate.rate)),
                React.createElement('span', { className: 'rateapi-widget-col-apr' },
                  formatRate(rate.apr))
              )
            )
          )
        ),
        React.createElement('div', { className: 'rateapi-widget-footer' },
          React.createElement('button', { className: 'rateapi-widget-refresh', onClick: fetchRates },
            loading ? 'Loading...' : 'Refresh'),
          React.createElement('a', {
            className: 'rateapi-widget-powered',
            href: 'https://rateapi.dev',
            target: '_blank'
          }, 'Powered by RateAPI')
        )
      );
    }

    // App state
    let currentState = '';
    let currentTheme = 'light';

    function renderWidget() {
      const root = ReactDOM.createRoot(document.getElementById('widget-root'));
      root.render(React.createElement(RateWidget, {
        proxyUrl: '/api/rates',
        state: currentState,
        theme: currentTheme,
        limit: 5
      }));
    }

    document.getElementById('state-select').addEventListener('change', (e) => {
      currentState = e.target.value;
      renderWidget();
    });

    document.getElementById('theme-select').addEventListener('change', (e) => {
      currentTheme = e.target.value;
      renderWidget();
    });

    function refreshWidget() {
      renderWidget();
    }

    // Initial render
    renderWidget();
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('');
  console.log('📊 React Rate Widget Demo');
  console.log('=========================');
  console.log('');
  console.log(`Open: http://localhost:${PORT}`);
  console.log('');
  console.log('API Key: ✓ Configured (server-side)');
  console.log('');
});
