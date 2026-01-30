# 🤖 LangChain Mortgage Agent

<p align="center">
  <b>AI-powered mortgage advisor using LangChain + RateAPI</b><br>
  Natural language conversations • Real-time rate data • Production-ready architecture
</p>

<p align="center">
  <img src="https://img.shields.io/badge/langchain-0.3-blue" alt="LangChain" />
  <img src="https://img.shields.io/badge/GPT--4o-supported-green" alt="GPT-4" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
</p>

---

## 🧠 What is LangChain?

**LangChain** is a framework for building applications powered by language models (like GPT-4). It provides:

- **Tools** - Functions the AI can call (like searching rates, calculating payments)
- **Memory** - Conversation history so the AI remembers context
- **Chains** - Sequences of operations (prompt → AI → tool → response)
- **Agents** - AI that decides which tools to use based on the user's question

**Why use LangChain for a mortgage agent?**
- The AI can naturally understand "What's the best rate in California for a $500k loan?"
- It decides to call the RateAPI, formats the response nicely, and explains the results
- It remembers previous context ("How about Texas?" → knows you're still asking about rates)

---

## 🎯 What This Demo Does

This agent acts as an AI mortgage advisor that can:

1. **Search Rates** - "What are the best 30-year fixed rates in California?"
2. **Calculate Payments** - "What's the monthly payment on $400k at 6.5%?"
3. **Compare Options** - "Compare the top 3 rates in NY vs CA"
4. **Explain Concepts** - "What's the difference between rate and APR?"
5. **Make Recommendations** - "I have $100k saved, should I buy now or wait?"

The agent uses **GPT-4** for understanding and reasoning, and **RateAPI** for real-time rate data.

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
cd langchain-mortgage-agent
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
OPENAI_API_KEY=sk-...          # Required: Your OpenAI API key
RATEAPI_KEY=your-rateapi-key   # Required: Your RateAPI key
```

### Get a RateAPI Key

```bash
curl -X POST https://api.rateapi.dev/keys \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}'
```

### 3. Run the Agent

**CLI Chat Mode:**
```bash
npm run chat
```

**Web Interface:**
```bash
npm run web
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
langchain-mortgage-agent/
├── src/
│   ├── agent.js           # Main LangChain agent setup
│   ├── cli.js             # Interactive CLI interface
│   ├── server.js          # Express web server
│   ├── tools/
│   │   ├── searchRates.js    # Search mortgage rates
│   │   ├── calculatePayment.js # Calculate monthly payment
│   │   ├── compareRates.js   # Compare rates across states
│   │   └── getCreditUnion.js # Get credit union details
│   └── prompts/
│       └── system.txt     # Agent system prompt
├── package.json
└── README.md
```

---

## 🔧 How It Works

### 1. User Asks a Question

```
User: "What's the best mortgage rate in California right now?"
```

### 2. LangChain Agent Decides

The agent analyzes the question and decides which tool(s) to use:
- "This is asking for rates in CA" → Call `searchRates` tool

### 3. Tool Calls RateAPI

```javascript
// The searchRates tool calls:
POST https://api.rateapi.dev/v1/decisions
{
  "state": "CA",
  "intent": "purchase",
  "amount": 500000,
  "product_type": "mortgage",
  "term_months": 360,
  "max_providers": 5
}
```

### 4. Agent Formats Response

```
Agent: "The best 30-year fixed rate in California right now is 6.125%
from Golden 1 Credit Union in Sacramento. Here are the top 5 options:

1. Golden 1 Credit Union - 6.125% (6.289% APR)
2. SchoolsFirst FCU - 6.250% (6.412% APR)
3. Logix FCU - 6.375% (6.498% APR)
..."
```

---

## 🛠️ Available Tools

The agent has access to these tools:

### `searchRates`
Search for mortgage rates by state and loan amount.

```javascript
{
  name: "searchRates",
  description: "Search for current mortgage rates",
  parameters: {
    state: "US state code (e.g., CA, NY)",
    loanAmount: "Loan amount in dollars"
  }
}
```

### `calculatePayment`
Calculate monthly mortgage payment.

```javascript
{
  name: "calculatePayment",
  description: "Calculate monthly mortgage payment",
  parameters: {
    principal: "Loan amount",
    rate: "Annual interest rate (e.g., 6.5)",
    termYears: "Loan term in years (e.g., 30)"
  }
}
```

### `compareRates`
Compare rates across multiple states.

```javascript
{
  name: "compareRates",
  description: "Compare best rates across states",
  parameters: {
    states: "Array of state codes"
  }
}
```

### `getCreditUnion`
Get details about a specific credit union.

```javascript
{
  name: "getCreditUnion",
  description: "Get credit union details and all rates",
  parameters: {
    state: "State code",
    slug: "Credit union URL slug"
  }
}
```

---

## 💬 Example Conversations

### Basic Rate Search
```
You: What's the best rate in Texas?

Agent: The best 30-year fixed mortgage rate in Texas right now is 6.250%
from EECU (Educational Employees Credit Union) in Fort Worth.

Here are the top 5 options:
1. EECU - 6.250% rate (6.389% APR) - 0 points
2. Texas Dow Employees CU - 6.375% rate (6.501% APR) - 0 points
3. Randolph-Brooks FCU - 6.500% rate (6.612% APR) - 0 points

Would you like me to calculate monthly payments for any of these?
```

### Payment Calculation
```
You: What would my payment be on a $350,000 loan at 6.25%?

Agent: For a $350,000 loan at 6.25% over 30 years:

Monthly Payment: $2,155.31
Total Interest: $425,910.55
Total Cost: $775,910.55

This assumes:
- 30-year fixed rate mortgage
- No PMI (assuming 20%+ down payment)
- Excludes property taxes and insurance

Would you like me to compare this with 15-year options?
```

### Comparison
```
You: Compare California vs Nevada for a $500k loan

Agent: Here's a comparison of the best 30-year fixed rates:

| State | Best Rate | Lender | Monthly Payment |
|-------|-----------|--------|-----------------|
| California | 6.125% | Golden 1 CU | $3,038 |
| Nevada | 6.375% | One Nevada CU | $3,120 |

Difference: You'd save $82/month ($29,520 over 30 years)
with the California rate.

Note: Credit union membership requirements vary.
```

---

## 🎨 Customization

### Modify the System Prompt

Edit `src/prompts/system.txt` to change the agent's personality:

```
You are a friendly mortgage advisor assistant powered by RateAPI.

Your expertise includes:
- Current mortgage rates from 4,000+ credit unions
- Payment calculations and amortization
- Explaining mortgage concepts in simple terms

Always be helpful, accurate, and encourage users to verify rates directly...
```

### Add New Tools

Create a new tool in `src/tools/`:

```javascript
// src/tools/estimateClosingCosts.js
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const estimateClosingCosts = tool(
  async ({ loanAmount, state }) => {
    const lowEstimate = loanAmount * 0.02;
    const highEstimate = loanAmount * 0.05;

    return JSON.stringify({
      loanAmount,
      state,
      closingCostRange: { low: lowEstimate, high: highEstimate },
      note: 'Actual costs vary by lender and location'
    });
  },
  {
    name: 'estimateClosingCosts',
    description: 'Estimate closing costs for a mortgage',
    schema: z.object({
      loanAmount: z.number().describe('Loan amount in dollars'),
      state: z.string().describe('US state code'),
    }),
  }
);
```

Then add it to `src/agent.js`:

```javascript
import { estimateClosingCosts } from './tools/estimateClosingCosts.js';

const tools = [
  searchRates,
  calculatePayment,
  compareRates,
  getCreditUnion,
  estimateClosingCosts,
];
```

---

## 🚀 Production Deployment

### Deploy to Render

```yaml
# render.yaml
services:
  - type: web
    name: mortgage-agent
    runtime: node
    buildCommand: npm install
    startCommand: npm run web
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: RATEAPI_KEY
        sync: false
```

---

## 📚 Learn More

### LangChain Resources
- [LangChain Documentation](https://js.langchain.com/docs)
- [Tool Calling Guide](https://js.langchain.com/docs/how_to/tool_calling)
- [Agent Architecture](https://js.langchain.com/docs/concepts/agents)

### RateAPI Resources
- [RateAPI Website](https://rateapi.dev)
- [API Reference](https://api.rateapi.dev)

---

## 🤝 Contributing

Ideas for improvements:
- [ ] Add memory persistence (Redis, SQLite)
- [ ] Support Claude API as an alternative to OpenAI
- [ ] Add refinance analysis tool
- [ ] Implement rate alerts via webhooks

---

## 📄 License

MIT

---

<p align="center">
  Built with ❤️ by <a href="https://rateapi.dev">RateAPI</a>
</p>
