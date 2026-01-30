# 🏦 RateAPI Demos

<p align="center">
  <b>One API for every mortgage rate in America</b><br>
  Real-time data from 4,000+ credit unions • Self-contained examples • Zero config
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-the-demos">Demos</a> •
  <a href="https://rateapi.dev">Documentation</a>
</p>

---

![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Demos](https://img.shields.io/badge/demos-5-orange)
[![API Status](https://img.shields.io/badge/API-live-success)](https://api.rateapi.dev)

**⚡ Run in 30 seconds:**

```bash
git clone https://github.com/holdequity/rateapi-demos.git
cd rateapi-demos
node run.js rate-explorer  # Auto-creates API key, shows live rates
```

> Want to build mortgage tools, AI agents, or fintech apps? These 5 demos show you how.

---

## 💡 Why RateAPI?

Traditional mortgage data is:
- ❌ **Siloed** - Scattered across 4,000+ credit union websites
- ❌ **Stale** - Updated manually, often weeks old
- ❌ **Inaccessible** - No APIs, only HTML scraping

RateAPI solves this:
- ✅ **Unified** - One API for all US credit unions
- ✅ **Real-time** - Rates updated daily from source
- ✅ **Developer-friendly** - REST API, webhooks, MCP integration

---

## 🎯 Which Demo Should I Start With?

| If you want to...                          | Start here             | Time to run |
|--------------------------------------------|------------------------|-------------|
| Just see rates as fast as possible         | Rate Explorer          | 30 seconds  |
| Build a rate alert system                  | Webhook Monitor        | 2 minutes   |
| Integrate with AI/LLM apps                 | AI Agent               | 1 minute    |
| **Embed rates in your React app**          | **React Rate Widget**  | **5 minutes** |
| **Build a conversational mortgage advisor**| **LangChain Agent**    | **10 minutes**|
| Understand the full API surface            | Run all 5 in order     | 15 minutes  |

**Pro tip:** Run Rate Explorer first - it auto-creates an API key the others will use.

---

## 🎯 The Demos

### 🔍 1. Rate Explorer CLI

**Find the best mortgage rates in seconds.**

🎨 **Perfect for**: API newcomers, quick prototypes
📦 **Dependencies**: Zero (uses native fetch)
⚡ **Time to run**: 30 seconds

**What you'll learn:**
- Self-service API key creation (`POST /keys`)
- Decision engine usage (`POST /v1/decisions`)
- Credit union lookups (`GET /credit-unions/{state}/{slug}`)

```bash
node run.js rate-explorer
```

[**→ Try it**](./rate-explorer/) • [View README](./rate-explorer/README.md)

---

### 🔔 2. Webhook Monitor

**Get real-time alerts when mortgage rates drop.**

🎨 **Perfect for**: Building rate alert apps, monitoring competitors
📦 **Dependencies**: Express
⚡ **Time to run**: 2 minutes

**What you'll learn:**
- Creating rate monitors with custom conditions
- HMAC-SHA256 webhook signature verification (production-ready!)
- Managing monitor lifecycle (CRUD operations)

```bash
cd rate-monitor && npm install
node run.js rate-monitor
```

[**→ Try it**](./rate-monitor/) • [View README](./rate-monitor/README.md)

---

### 🤖 3. AI Agent Integration

**Chat-based mortgage advisor powered by GPT-4 + RateAPI.**

🎨 **Perfect for**: AI apps, chatbots, financial assistants
📦 **Dependencies**: Optional (works without OpenAI key!)
⚡ **Time to run**: 1 minute

**What you'll learn:**
- LLM tool/function calling integration
- Natural language → structured API queries
- Mock mode for testing without API costs

```bash
node run.js rate-agent          # Mock mode (no LLM key needed)
node run.js rate-agent --real   # Real GPT-4 mode
```

[**→ Try it**](./rate-agent/) • [View README](./rate-agent/README.md)

---

### 📊 4. React Rate Widget

**Embeddable mortgage rate comparison widget for React apps.**

🎨 **Perfect for**: React/Next.js developers, embedding rates on any website
📦 **Dependencies**: React 18+
⚡ **Time to run**: 5 minutes

**What you'll learn:**
- Integrating RateAPI into React applications
- Custom hooks for data fetching (`useRateAPI`)
- Building themeable, responsive components

```bash
cd react-rate-widget && npm install
RATEAPI_KEY=your-key npm start
```

[**→ Try it**](./react-rate-widget/) • [View README](./react-rate-widget/README.md)

---

### 🧠 5. LangChain Mortgage Agent

**AI-powered mortgage advisor using LangChain + GPT-4.**

🎨 **Perfect for**: AI/ML engineers, chatbot developers, fintech startups
📦 **Dependencies**: LangChain, OpenAI
⚡ **Time to run**: 10 minutes

**What you'll learn:**
- Building AI agents with LangChain
- Tool calling (function calling) patterns
- Creating conversational financial assistants

```bash
cd langchain-mortgage-agent && npm install
npm run chat      # CLI mode
npm run web       # Web interface
```

[**→ Try it**](./langchain-mortgage-agent/) • [View README](./langchain-mortgage-agent/README.md)

---

## 📚 API Features Covered

| Feature | Rate Explorer | Webhook Monitor | AI Agent | React Widget | LangChain Agent |
|---------|:-------------:|:---------------:|:--------:|:------------:|:---------------:|
| API Key Creation | ✓ | | | | |
| Decision Engine | ✓ | ✓ | ✓ | ✓ | ✓ |
| Credit Union Lookup | ✓ | | ✓ | | ✓ |
| Monitor CRUD | | ✓ | | | |
| Webhook Verification | | ✓ | | | |
| LLM Tool Integration | | | ✓ | | ✓ |
| React Integration | | | | ✓ | |
| LangChain Tools | | | | | ✓ |

---

## ⚙️ Configuration

All demos share a common `.env` file:

```
rateapi-demos/
├── .env                      # Shared config (auto-created by Rate Explorer)
├── .env.example              # Template
├── rate-explorer/
├── rate-monitor/
├── rate-agent/
├── react-rate-widget/
└── langchain-mortgage-agent/
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RATEAPI_KEY` | Yes* | Your API key (*auto-created by Rate Explorer) |
| `RATEAPI_URL` | No | Override API URL (default: `https://api.rateapi.dev`) |
| `OPENAI_API_KEY` | No | For AI Agent real mode |

---

## 📋 Requirements

- **Node.js 18+** (uses native fetch)
- **npm** (for Webhook Monitor dependencies only)

---

## 🔗 Learn More

- **[RateAPI Platform](https://rateapi.dev)** - Main website and product overview
- [API Documentation](https://api.rateapi.dev) - Full API reference
- [Webhook Guide](https://rateapi.dev/webhooks) - Setting up rate alerts
- [MCP Integration](https://rateapi.dev/mcp) - Claude Desktop & Claude Code setup
- [OpenAPI Spec](https://api.rateapi.dev/openapi.json) - Machine-readable API spec

---

## 🤝 Contributing

Found a bug? Have an idea for a new demo? PRs welcome!

**Ideas for new demos:**
- [ ] Telegram bot for rate alerts
- [ ] Chrome extension for rate tracking
- [ ] Google Sheets integration
- [ ] Python SDK / PyPI package

[Open an issue](https://github.com/holdequity/rateapi-demos/issues) or submit a PR!

---

<p align="center">
  Built with ❤️ by <a href="https://rateapi.dev">RateAPI</a>
</p>
