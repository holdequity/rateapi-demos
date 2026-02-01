# Rate Explorer CLI

**Reference implementation** showing how to interact with the [RateAPI](https://rateapi.dev) decision engine from the command line. Use this code to understand API key creation, the decision engine, and credit union lookups.

> **For Developers:** This is working code you can fork, learn from, and adapt for your own mortgage rate applications.

## Quick Start

```bash
cd demos/rate-explorer
node rate-explorer.js
```

That's it! The demo will:
1. Create an API key automatically (if you don't have one)
2. Prompt you for loan details (state, amount, intent)
3. Display ranked recommendations with potential savings

## What It Demonstrates

- **Self-service API key creation** - `POST /keys`
- **Decision engine** - `POST /v1/decisions`
- **Credit union lookup** - `GET /credit-unions/{state}/{slug}`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RATEAPI_KEY` | No | Your API key (created automatically if missing) |
| `RATEAPI_URL` | No | API base URL (default: `https://api.rateapi.dev`) |

## Sample Output

```
Welcome to RateAPI Rate Explorer!

No API key found. Creating one for you...
API key created and saved to ../demos/.env

Enter your state (e.g., CA, TX, NY): CA
Enter loan amount (e.g., 400000): 500000
Intent - purchase or refinance? purchase

Fetching personalized recommendations...

Recommendation: Shop Around - Better rates available
Confidence: 85%

Top 5 Offers:
#1 First Tech Federal Credit Union
   30-Year Fixed @ 6.125% APR
   Monthly Payment: $3,040

#2 Navy Federal Credit Union
   30-Year Fixed @ 6.250% APR
   Monthly Payment: $3,078

[Press Enter to see more details, or type 'q' to quit]
```

## Requirements

- Node.js 18+ (uses native fetch)
- No external dependencies!

## Use This Pattern For

- **CLI tools** - Internal tools for mortgage teams
- **Scripts** - Automated rate data collection
- **Testing** - Validate API integration before building UI
- **Prototyping** - Quickly test rate queries

## Code You Can Reuse

Copy these patterns into your own projects:

- `createApiKey()` - Self-service key provisioning
- `getDecision()` - Core rate recommendation logic
- `getCreditUnion()` - Provider detail lookups

## Learn More

Visit **[rateapi.dev](https://rateapi.dev)** for full documentation and additional use cases.
