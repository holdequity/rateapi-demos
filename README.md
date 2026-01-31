# RateAPI Demos

<p align="center">
  <b>2,900+ credit union mortgage rates. One API call.</b>
</p>

<p align="center">
  <img src="./assets/live-api-data.png" alt="RateAPI Live Data - 34,930 rates from 2,918 credit unions" width="700" />
</p>

<p align="center">
  <a href="#-pick-your-demo">Pick a Demo</a> •
  <a href="#-demo-details">Demo Details</a> •
  <a href="https://rateapi.dev">Documentation</a>
</p>

---

![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Demos](https://img.shields.io/badge/demos-5-orange)
[![Discord Bot](https://img.shields.io/badge/Discord_Bot-View_Docs-5865F2?logo=discord&logoColor=white)](https://rateapi.dev/discord-bot)
[![API Status](https://img.shields.io/badge/API-live-success)](https://api.rateapi.dev)
[![GitHub stars](https://img.shields.io/github/stars/rate-api/demos?style=social)](https://github.com/rate-api/demos/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/rate-api/demos?style=social)](https://github.com/rate-api/demos/network/members)

```bash
git clone https://github.com/rate-api/demos.git
cd rateapi-demos
node run.js rate-explorer  # Auto-creates API key, shows live rates
```

---

## Why RateAPI?

- **4,000+ credit unions** — Complete coverage of US credit union mortgage rates
- **Real-time data** — Rates updated continuously, not daily scrapes
- **Production-ready** — Webhooks, monitoring, SDKs included
- **Free to start** — Self-service API key creation, no sales calls

---

## 🎯 Pick Your Demo

| Demo | Best For | Run Time |
|------|----------|----------|
| [**Rate Explorer**](#-1-rate-explorer) | See the API in action | 30 sec |
| [**Webhook Monitor**](#-2-webhook-monitor) | Build rate alerts | 2 min |
| [**AI Agent**](#-3-ai-agent) | Add to chatbots/assistants | 1 min |
| [**React Widget**](#-4-react-widget) | Embed in React apps | 5 min |
| [**LangChain Agent**](#-5-langchain-agent) | Build AI mortgage advisors | 10 min |
| [**Discord Bot**](#-6-discord-bot) | Community rate alerts | [View Docs](https://rateapi.dev/discord-bot) |

### API Coverage by Demo

|  | Rate Explorer | Webhook Monitor | AI Agent | React Widget | LangChain |
|--|:--:|:--:|:--:|:--:|:--:|
| API Key Creation | ✓ | | | | |
| Decision Engine | ✓ | ✓ | ✓ | ✓ | ✓ |
| Credit Union Lookup | ✓ | | ✓ | | ✓ |
| Monitor CRUD | | ✓ | | | |
| Webhook Verification | | ✓ | | | |
| LLM Tool Integration | | | ✓ | | ✓ |
| React Hooks | | | | ✓ | |

**Start with Rate Explorer** — it auto-creates an API key the other demos will use.

---

## 📖 Demo Details

### 🔍 1. Rate Explorer

**Find the best mortgage rates in seconds.** Zero dependencies, just Node.js.

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

**Get alerts when mortgage rates drop.** Production-ready webhook verification included.

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

**Chat-based mortgage advisor.** Works without OpenAI key (mock mode).

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

**Embeddable rate comparison widget.** Light/dark themes, TypeScript support.

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

**Full mortgage advisor with LangChain.** CLI and web interface.

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

**Get mortgage rates without leaving Discord.** Free hosted bot with rate alerts and natural language queries.

[![View Documentation](https://img.shields.io/badge/View_Documentation-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://rateapi.dev/discord-bot)

**Highlights:**
- Real-time rate comparisons across thousands of credit unions
- Rate drop alerts — get notified when rates hit your target
- Natural language queries — ask questions in plain English
- No API key needed, no rate limits, free to use

**Perfect for:**
- Real estate investing Discord communities
- Personal finance servers
- Mortgage professional groups

[Read the full documentation](https://rateapi.dev/discord-bot) to see all commands and add the bot to your server.

---

## 🌟 Built With RateAPI

Projects and integrations built by the community:

- *Your project here!* — [Submit a PR](https://github.com/rate-api/demos/pulls) to showcase your integration

Using RateAPI in production? We'd love to feature your project.

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

- [RateAPI Platform](https://rateapi.dev) — Product overview
- [API Reference](https://api.rateapi.dev) — Full documentation
- [Discord Bot](https://rateapi.dev/discord-bot) — Add to your server
- [MCP Integration](https://rateapi.dev/mcp) — Claude Desktop setup
- [OpenAPI Spec](https://api.rateapi.dev/openapi.json) — Machine-readable spec

---

## 🤝 Contributing

PRs welcome! Ideas for new demos:

- [x] Discord bot for rate alerts
- [ ] Telegram bot for rate alerts
- [ ] Chrome extension
- [ ] Google Sheets integration
- [ ] Python SDK

[Open an issue →](https://github.com/rate-api/demos/issues)

---

<p align="center">
  Built by <a href="https://rateapi.dev">RateAPI</a>
</p>
