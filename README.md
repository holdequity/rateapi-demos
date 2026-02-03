# RateAPI Demos

<p align="center">
  <b>Example implementations showing how to integrate RateAPI into your applications</b>
</p>

<p align="center">
  <img src="./assets/live-api-data.png" alt="RateAPI Live Data - 34,930 rates from 2,918 credit unions" width="700" />
</p>

<p align="center">
  <a href="#-pick-your-demo">Pick a Demo</a> •
  <a href="#-demo-details">Demo Details</a> •
  <a href="https://rateapi.dev">Documentation</a> •
  <a href="https://rateapi.dev">Get API Key</a>
</p>

---

![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Demos](https://img.shields.io/badge/demos-7-orange)
[![API Status](https://img.shields.io/badge/API-live-success)](https://rateapi.dev)
[![GitHub stars](https://img.shields.io/github/stars/rate-api/demos?style=social)](https://github.com/rate-api/demos/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/rate-api/demos?style=social)](https://github.com/rate-api/demos/network/members)

**This is a collection of developer demos** — working code examples that show how to integrate RateAPI's financial rate data (mortgages, auto loans, HELOCs, personal loans, and credit cards) into different types of applications. Fork the code, learn from it, and adapt it for your own projects.

```bash
git clone https://github.com/rate-api/demos.git
cd rateapi-demos
node run.js rate-explorer  # Auto-creates API key, explore the API
```

---

## What You Can Build

These demos show integration patterns for:

- **Real Estate Platforms** — Rate widgets for property listings and mortgage comparisons
- **Financial Planning Apps** — Refinance recommendations, auto loan calculators, HELOC optimization
- **AI Assistants** — Natural language queries for mortgages, auto loans, personal loans, and credit cards
- **Rate Comparison Sites** — Multi-product rate aggregators across all loan types
- **Monitoring & Alerts** — Webhook-powered rate drop notifications for any product
- **Browser Extensions** — Contextual rate overlays for mortgages, auto financing, and refinancing tools

**Get your free API key:** [https://rateapi.dev](https://rateapi.dev)

---

## 🎯 Pick Your Demo

| Demo | What It Demonstrates | API Features |
|------|---------------------|--------------|
| [**Rate Explorer**](#-1-rate-explorer) | CLI interaction with Decision Engine | Key creation, decisions, lookups |
| [**Webhook Monitor**](#-2-webhook-monitor) | Rate alert system architecture | Monitors, webhooks, HMAC verification |
| [**AI Agent**](#-3-ai-agent) | LLM tool integration patterns | Function calling, natural language → API |
| [**React Widget**](#-4-react-widget) | Embeddable UI component | React hooks, server-side key protection |
| [**LangChain Agent**](#-5-langchain-agent) | Full AI agent architecture | Multi-tool orchestration, memory |
| [**Discord Bot**](#-6-discord-bot) | Hosted bot (one-click install) | [Add to Server](https://rateapi.dev/discord-bot) |
| [**Chrome Extension**](#-7-chrome-extension) | Content injection patterns | DOM extraction, Shadow DOM, proxies |

### API Coverage by Demo

|  | Rate Explorer | Webhook Monitor | AI Agent | React Widget | LangChain | Discord | Chrome Ext |
|--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| API Key Creation | ✓ | | | | | | |
| Decision Engine | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Credit Union Lookup | ✓ | | ✓ | | ✓ | ✓ | |
| Monitor CRUD | | ✓ | | | | | |
| Webhook Verification | | ✓ | | | | | |
| LLM Tool Integration | | | ✓ | | ✓ | | |
| React Hooks | | | | ✓ | | | |
| Web Components | | | | | | | ✓ |
| Content Injection | | | | | | | ✓ |

**Start with Rate Explorer** — it auto-creates an API key the other demos will use.

---

## 📖 Demo Details

### 🔍 1. Rate Explorer

**Find the best financial rates in seconds.** Zero dependencies, just Node.js.

```bash
node run.js rate-explorer
```

**What you'll learn:**
- Self-service API key creation (`POST /keys`)
- Decision engine (`POST /v1/decisions`)
- Credit union lookups (`GET /credit-unions/{state}/{slug}`)

[View source →](./rate-explorer/)

---

### 🔔 2. Webhook Monitor

**Get alerts when rates drop.** Production-ready webhook verification included.

```bash
cd rate-monitor && npm install
node server.js
```

**What you'll learn:**
- Creating rate monitors with conditions
- HMAC-SHA256 signature verification
- Monitor lifecycle (create, list, delete)

[View source →](./rate-monitor/)

---

### 🤖 3. AI Agent

**Chat-based financial advisor for mortgages, auto loans, personal loans, HELOCs, and credit cards.** Works without OpenAI key (mock mode).

```bash
node run.js rate-agent          # Mock mode
node run.js rate-agent --real   # GPT-4 mode (needs OPENAI_API_KEY)
```

**What you'll learn:**
- LLM function/tool calling
- Natural language → API queries
- Testing AI integrations without API costs

[View source →](./rate-agent/)

---

### 📊 4. React Widget

**Embeddable rate comparison widget for mortgages, auto loans, and more.** Light/dark themes, TypeScript support.

```bash
cd react-rate-widget && npm install
RATEAPI_KEY=your-key npm start
```

**What you'll learn:**
- React integration patterns
- Custom hooks (`useRateAPI`)
- Server-side API key protection

[View source →](./react-rate-widget/)

---

### 🧠 5. LangChain Agent

**Full financial advisor with LangChain for all loan products.** CLI and web interface.

```bash
cd langchain-mortgage-agent && npm install
npm run chat      # CLI
npm run web       # Web UI at localhost:3000
```

**What you'll learn:**
- LangChain agent architecture
- Multi-tool orchestration
- Conversational AI patterns

[View source →](./langchain-mortgage-agent/)

---

### 💬 6. Discord Bot

**Free hosted bot** — add RateAPI to your Discord server with one click. No setup, no API key required.

[![Add to Discord](https://img.shields.io/badge/Add_to_Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://rateapi.dev/discord-bot)

**Features:**
- Real-time rate comparisons for mortgages, auto loans, HELOCs, personal loans, and credit cards
- Rate drop alerts — get notified when rates hit your target across any product
- Natural language queries — ask questions in plain English about any loan type

**Great for:**
- Real estate investing and FIRE community Discord servers
- Personal finance servers
- Auto enthusiast and car buying communities
- Mortgage and lending professional groups

[View documentation and add the bot →](https://rateapi.dev/discord-bot)

---

### 🔌 7. Chrome Extension

**See credit union rates while browsing Zillow, Redfin, Realtor.com & ProjectionLab.** Supports both home purchase and refinance contexts.

```bash
node run.js chrome-extension
# Then load unpacked extension in chrome://extensions
```

**What you'll learn:**
- Chrome Manifest V3 extension architecture
- Lit web components with Shadow DOM for style isolation
- Site-specific DOM scraping and content injection
- Background service workers for API communication
- Bridge pattern for MAIN/ISOLATED world messaging
- Cloudflare Worker proxy for API key protection
- Refinance vs. purchase context handling

**Key features:**
- **Purchase context**: Auto-detects listings on Zillow, Redfin, Realtor.com
- **Refinance context**: Integrates with ProjectionLab financial planning dashboards
- Extracts price/balance and location from page DOM
- Displays floating overlay with best credit union rates
- Shows potential monthly savings vs. current rate or national average
- Expandable to show top 5 credit union offers
- State persistence across sessions (Chrome storage)
- In-memory caching to reduce API calls
- Demo mode with realistic sample data (no API key needed)

**NEW: ProjectionLab Integration** 🔥
- First Chrome extension for the FIRE community
- Auto-detects mortgage liabilities from your financial dashboard
- Shows refinance rates to help accelerate your path to FI
- Saves $214/mo on average ($400k mortgage, 7% → 6.125%)
- [Read full integration guide](./chrome-extension/PROJECTIONLAB_INTEGRATION.md)

[View source →](./chrome-extension/)

---

## 🌟 Built With These Patterns

Developers have used these demos as starting points for:

- Real estate platform integrations
- AI-powered mortgage chatbots
- Rate monitoring dashboards
- Credit union comparison tools

**Built something with RateAPI?** [Submit a PR](https://github.com/rate-api/demos/pulls) to share your implementation.

---

## ⚙️ Setup

All demos share a `.env` file in the root:

```
RATEAPI_KEY=your-key        # Auto-created by Rate Explorer
RATEAPI_URL=https://api.rateapi.dev
OPENAI_API_KEY=sk-...       # Only for AI demos in real mode
```

**Requirements:** Node.js 18+

---

## 🔗 Resources

- [RateAPI Platform](https://rateapi.dev) — Product overview and API access
- [Discord Bot](https://rateapi.dev/discord-bot) — Add to your server
- [MCP Integration](https://rateapi.dev/mcp) — Claude Desktop setup

---

## 🤝 Contributing

PRs welcome! Ideas for new integration patterns:

- [x] Discord bot (hosted service)
- [x] Chrome extension (content scripts, DOM extraction, Shadow DOM)
- [ ] Telegram bot (inline queries, notifications)
- [ ] Google Sheets (custom functions, data import)
- [ ] Python SDK (requests wrapper, async support)
- [ ] Slack bot (slash commands, Block Kit)
- [ ] Firefox extension (port WebExtension patterns)

**Want to contribute?** Each demo should:
1. Demonstrate a specific API integration pattern
2. Include working, runnable code
3. Explain what developers can learn from it

[Open an issue →](https://github.com/rate-api/demos/issues)

---

<p align="center">
  <a href="https://rateapi.dev">RateAPI</a> — Financial rate data for developers (mortgages, auto loans, HELOCs, personal loans, credit cards)
</p>
