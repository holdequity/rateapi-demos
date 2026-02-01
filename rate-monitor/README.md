# Webhook Monitor Demo

**Reference implementation** for building rate alert systems with [RateAPI](https://rateapi.dev) webhooks. This code demonstrates monitor CRUD operations and production-ready HMAC signature verification.

> **For Developers:** Copy the webhook verification code directly into your production systems. This is how you'd build rate drop alerts for users.

## Quick Start

```bash
cd demos/rate-monitor
npm install
node server.js
```

The demo will:
1. Start a local webhook server on port 3456
2. Create a monitor that alerts when APR drops below 6.5%
3. Simulate a rate change and show the webhook delivery
4. Demonstrate HMAC-SHA256 signature verification

## What It Demonstrates

- **Create monitors** - `POST /v1/monitors`
- **Simulate rate changes** - `POST /v1/monitors/:id/simulate`
- **List monitors** - `GET /v1/monitors`
- **Delete monitors** - `DELETE /v1/monitors/:id`
- **Webhook signature verification** - Production-ready code you can copy

## Prerequisites

Run the Rate Explorer demo first to create an API key:
```bash
cd ../rate-explorer
node rate-explorer.js
```

Or set `RATEAPI_KEY` in `../demos/.env` manually.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RATEAPI_KEY` | Yes | Your API key (from rate-explorer demo or `POST /keys`) |
| `RATEAPI_URL` | No | API base URL (default: `https://api.rateapi.dev`) |
| `PORT` | No | Local webhook server port (default: `3456`) |

## Sample Output

```
RateAPI Webhook Monitor Demo
============================

Starting webhook server on port 3456...
Webhook server running at http://localhost:3456/webhook

Creating a rate monitor...
Monitor created: mon_abc123

Conditions:
  - APR < 6.5%

Simulating a rate drop from 6.75% to 6.25%...

[Webhook Received]
  Timestamp: 2024-01-15T10:30:00Z
  Signature Valid: YES
  Event: rate_change_alert
  Provider: First Tech Federal Credit Union
  New APR: 6.25%
  Triggered Conditions: APR < 6.5%

Cleaning up... Monitor deleted.
```

## Webhook Signature Verification

The `verify-signature.js` file contains production-ready code for verifying webhook signatures:

```javascript
import { verifyWebhookSignature } from './verify-signature.js';

// In your webhook handler:
const payload = req.body; // raw JSON string
const signature = req.headers['x-rateapi-signature'];
const timestamp = req.headers['x-rateapi-timestamp'];

const result = await verifyWebhookSignature(
  JSON.stringify(payload),
  signature,
  WEBHOOK_SECRET,
  parseInt(timestamp, 10)
);

if (!result.valid) {
  console.error('Invalid signature:', result.error);
  return res.status(401).send('Invalid signature');
}
```

## Architecture

```
[RateAPI] --> POST /webhook --> [Your Server]
                                     |
                            Verify HMAC-SHA256
                                     |
                            Process Alert
```

## Use This Pattern For

- **Rate alert apps** - Notify users when rates drop
- **Internal monitoring** - Track credit union rate changes
- **Automated workflows** - Trigger actions based on rate conditions
- **Email/SMS services** - Send rate notifications to subscribers

## Code You Can Reuse

Copy these patterns into your own projects:

- `verify-signature.js` - Production-ready HMAC verification (drop-in)
- Monitor lifecycle - Create, list, update, delete monitors
- Simulation testing - Test webhooks without waiting for rate changes

## Learn More

- **[RateAPI Platform](https://rateapi.dev)** - Full documentation and product overview
- [Webhook Guide](https://rateapi.dev/webhooks) - Detailed webhook documentation
