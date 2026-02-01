# AI Agent Integration Demo

**Reference implementation** for integrating [RateAPI](https://rateapi.dev) as a tool in AI applications. This code demonstrates LLM function calling patterns that work with OpenAI, Claude, and other providers.

> **For Developers:** Use this as a template for building AI financial assistants. The mock mode lets you test without LLM API costs.

## Quick Start

```bash
cd demos/rate-agent
node rate-agent.js
```

That's it! The demo runs in mock mode by default - no LLM API key needed.

## Real Mode (with OpenAI)

```bash
export OPENAI_API_KEY=sk-...
node rate-agent.js --real
```

## What It Demonstrates

- **LLM tool integration** - How to define RateAPI as a tool for AI assistants
- **Decision engine calls** - `POST /v1/decisions` triggered by natural language
- **Credit union lookups** - `GET /credit-unions/{state}/{slug}` for detailed info

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
| `RATEAPI_KEY` | Yes | Your API key |
| `OPENAI_API_KEY` | No | OpenAI key (only needed with `--real` flag) |
| `RATEAPI_URL` | No | API base URL (default: `https://api.rateapi.dev`) |

## Mock vs Real Mode

**Mock mode (default):**
- Uses pattern matching to understand your questions
- Makes **real** API calls to RateAPI
- No external API keys needed
- Great for demos and testing

**Real mode (`--real`):**
- Uses OpenAI GPT-4 for natural language understanding
- Makes real API calls to both OpenAI and RateAPI
- More flexible conversation capabilities
- Requires `OPENAI_API_KEY`

## Sample Conversation

```
You: What are the best mortgage rates in California for a $500k home?

Looking up purchase rates in CA for $500,000...
[Calling RateAPI: get_financing_decision]
  state: CA
  intent: purchase
  amount: 500000

Agent: **Shop Around - Better rates available!**
Confidence: 85%

Here are the top options I found:

**#1 First Tech Federal Credit Union**
   30-Year Fixed @ **6.125% APR**
   Monthly Payment: $3,040

**#2 Navy Federal Credit Union**
   30-Year Fixed @ **6.250% APR**
   Monthly Payment: $3,078

Would you like more details on any of these lenders?

You: Tell me more about First Tech

[Calling RateAPI: get_credit_union]
  state: CA
  slug: first-tech-federal-credit-union

Agent: **First Tech Federal Credit Union**
Portland, Oregon

**Current Rates:**
- 30-Year Fixed: 6.0% rate (6.125% APR)
- 15-Year Fixed: 5.375% rate (5.5% APR)

Website: https://www.firsttechfed.com
```

## Files

- `rate-agent.js` - Main agent with chat loop
- `mock-llm.js` - Pattern-matching LLM simulator
- `tools.js` - RateAPI tool definitions (OpenAI function format)

## Architecture

```
[User Question]
      |
      v
[Mock Parser / OpenAI] --> Extracts intent, state, amount
      |
      v
[RateAPI Tools] --> Real API calls
      |
      v
[Response Formatter] --> Natural language response
      |
      v
[User]
```

## Use This Pattern For

- **AI chatbots** - Mortgage-aware customer support bots
- **Financial assistants** - Integrated rate lookup in planning tools
- **Voice interfaces** - Alexa/Google Home mortgage skills
- **Slack/Discord bots** - Team-facing rate lookup tools

## Code You Can Reuse

Copy these patterns into your own projects:

- `tools.js` - OpenAI-format tool definitions (works with Claude too)
- `mock-llm.js` - Testing pattern for AI integrations without LLM costs
- Intent extraction patterns - Natural language → API parameters

## Learn More

- **[RateAPI Platform](https://rateapi.dev)** - Full documentation and product overview
- [MCP Integration](https://rateapi.dev/mcp) - Use RateAPI with Claude Desktop & Claude Code
- [AI Agents Use Case](https://rateapi.dev/use-cases/ai-agents) - Building AI financial assistants
