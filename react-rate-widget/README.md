# 📊 React Rate Widget

<p align="center">
  <b>Embeddable mortgage rate comparison widget for React apps</b><br>
  Real-time rates from 4,000+ credit unions • Light/Dark themes • Customizable
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-%3E%3D18.0.0-blue" alt="React 18+" />
  <img src="https://img.shields.io/badge/typescript-supported-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

---

## 🚀 Just Want a Quick Embed?

If you don't need a custom React component, use our **no-code embed** instead:

```html
<script
  src="https://rateapi.dev/widgets/v1/embed.js"
  data-rateapi
  data-product="30-year-fixed"
  data-theme="dark"
></script>
```

No API key required. Works on any website. [**View full embed docs →**](https://rateapi.dev/widget-docs)

---

## ⚡ Quick Start

```bash
cd react-rate-widget
npm install
RATEAPI_KEY=your-key npm start
# Open http://localhost:3000
```

The demo includes an Express server that keeps your API key server-side.

### Get an API Key

```bash
curl -X POST https://api.rateapi.dev/keys \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}'
```

---

## 🎨 Features

- **Live Data** - Real-time rates from 4,000+ credit unions
- **Customizable** - Filter by state, limit results
- **Themeable** - Light, dark, and auto (system preference) themes
- **Responsive** - Looks great on mobile and desktop
- **TypeScript** - Full type definitions included

---

## 📦 Using in Your Own App

This demo shows how to build a rate widget. To use it in your app:

**1. Copy the component files** from `src/components/` and `src/hooks/`

**2. Create a backend proxy** (keeps your API key server-side):

```typescript
// Next.js: app/api/rates/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch('https://api.rateapi.dev/v1/decisions', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.RATEAPI_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: body.state || 'CA',
      intent: 'purchase',
      amount: 500000,
      product_type: 'mortgage',
      term_months: 360,
      max_providers: body.limit || 5,
    }),
  });

  const data = await response.json();

  // Transform to widget format
  const results = (data.recommendations || []).map((rec: any) => ({
    institution: rec.provider_name,
    city: rec.city,
    state: rec.state,
    rate: rec.rate,
    apr: rec.apr,
  }));

  return NextResponse.json({ results });
}
```

**3. Use the widget:**

```tsx
import { RateWidget } from './components/RateWidget';
import './components/RateWidget.css';

<RateWidget proxyUrl="/api/rates" state="CA" limit={5} />
```

---

## 🔧 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `proxyUrl` | `string` | *required* | Your backend proxy URL |
| `state` | `string` | `undefined` | Filter by US state code (e.g., "CA", "NY") |
| `limit` | `number` | `5` | Number of rates to display |
| `title` | `string` | `"Today's Best Rates"` | Widget title |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Color theme |
| `compact` | `boolean` | `false` | Compact mode for smaller spaces |
| `showStateFilter` | `boolean` | `false` | Show state dropdown |
| `showRefreshButton` | `boolean` | `true` | Show refresh button |
| `refreshInterval` | `number` | `0` | Auto-refresh interval in ms (0 = disabled) |
| `onRateClick` | `(rate) => void` | `undefined` | Callback when a rate row is clicked |
| `className` | `string` | `""` | Additional CSS class |

---

## 🎭 Themes

```tsx
// Light (default)
<RateWidget proxyUrl="/api/rates" theme="light" />

// Dark
<RateWidget proxyUrl="/api/rates" theme="dark" />

// Auto (follows system preference)
<RateWidget proxyUrl="/api/rates" theme="auto" />
```

---

## 📝 Examples

### Basic Usage
```tsx
<RateWidget proxyUrl="/api/rates" />
```

### With State Filter
```tsx
<RateWidget
  proxyUrl="/api/rates"
  state="CA"
  showStateFilter={true}
/>
```

### Compact Mode
```tsx
<RateWidget
  proxyUrl="/api/rates"
  compact={true}
  limit={3}
/>
```

### With Click Handler
```tsx
<RateWidget
  proxyUrl="/api/rates"
  onRateClick={(rate) => {
    console.log('Selected:', rate.institution);
  }}
/>
```

### Auto-Refresh Every 5 Minutes
```tsx
<RateWidget
  proxyUrl="/api/rates"
  refreshInterval={300000}
/>
```

---

## 🪝 Using the Hook Directly

For more control, use the `useRateAPI` hook:

```tsx
import { useRateAPI } from './hooks/useRateAPI';

function CustomRateDisplay() {
  const { rates, loading, error, refresh, lastUpdated } = useRateAPI({
    proxyUrl: '/api/rates',
    state: 'CA',
    limit: 10,
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Best Rates in California</h2>
      <ul>
        {rates.map((rate, i) => (
          <li key={i}>
            {rate.institution}: {rate.rate}% ({rate.apr}% APR)
          </li>
        ))}
      </ul>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

---

## 🎨 Custom Styling

```css
.rateapi-widget {
  max-width: 400px;
  font-family: 'Inter', sans-serif;
}

/* Override specific elements */
.rateapi-widget-title {
  font-size: 20px;
}

.rateapi-widget-rate-value {
  color: #059669;
}
```

---

## 📄 License

MIT

---

<p align="center">
  Built with ❤️ by <a href="https://rateapi.dev">RateAPI</a>
</p>
