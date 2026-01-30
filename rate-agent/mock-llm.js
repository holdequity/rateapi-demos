/**
 * Mock LLM for Demo Mode
 *
 * Simulates an AI assistant using pattern matching to parse user questions
 * and generate appropriate tool calls. This allows the demo to run without
 * an LLM API key while still making real RateAPI calls.
 */

// State name to code mapping
const STATE_CODES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR',
  california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
};

// Common credit union name variations
const CREDIT_UNION_SLUGS = {
  'navy federal': 'navy-federal-credit-union',
  'first tech': 'first-tech-federal-credit-union',
  penfed: 'pentagon-federal-credit-union',
  alliant: 'alliant-credit-union',
  'golden 1': 'golden-1-credit-union',
  becu: 'becu',
  bethpage: 'bethpage-federal-credit-union',
};

function extractState(text) {
  const textLower = text.toLowerCase();

  // Check for full state names FIRST (more specific)
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (textLower.includes(name)) {
      return code;
    }
  }

  // Then check for explicit 2-letter codes (must be uppercase or standalone)
  // Look for patterns like "in CA", "CA rates", "rates CA", etc.
  const codeMatch = text.match(/\b([A-Z]{2})\b/);
  if (codeMatch) {
    const code = codeMatch[1];
    if (Object.values(STATE_CODES).includes(code)) {
      return code;
    }
  }

  return null;
}

function extractAmount(text) {
  const textLower = text.toLowerCase();

  // Match patterns like $500k, $500,000, 500000, 500k
  const patterns = [
    /\$?([\d,]+)\s*k\b/i,           // 500k
    /\$?([\d,]+)\s*thousand/i,      // 500 thousand
    /\$?([\d,]+)\s*million/i,       // 1 million
    /\$([\d,]+)/,                    // $500,000
    /(\d{5,})/,                      // 500000
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      let amount = parseFloat(value);

      if (textLower.includes('million')) {
        amount *= 1_000_000;
      } else if (match[0].toLowerCase().includes('k') || textLower.includes('thousand')) {
        amount *= 1000;
      }

      // Sanity check for mortgage amounts
      if (amount >= 10_000 && amount <= 10_000_000) {
        return amount;
      }
    }
  }

  // Default for "home" mentions without amount
  if (['home', 'house', 'mortgage'].some(word => textLower.includes(word))) {
    return 400_000;
  }

  return null;
}

function extractIntent(text) {
  const textLower = text.toLowerCase();

  const refinanceKeywords = ['refinance', 'refi', 'existing', 'current mortgage', 'lower rate'];
  if (refinanceKeywords.some(kw => textLower.includes(kw))) {
    return 'refinance';
  }

  return 'purchase';
}

function extractCreditUnion(text) {
  const textLower = text.toLowerCase();

  for (const [name, slug] of Object.entries(CREDIT_UNION_SLUGS)) {
    if (textLower.includes(name)) {
      const state = extractState(text);
      return { slug, state: state || 'CA' };
    }
  }

  // Generic credit union detection
  const cuMatch = textLower.match(/about\s+([a-z\s]+?)\s+(credit union|cu)/);
  if (cuMatch) {
    const name = cuMatch[1].trim();
    const slug = name.replace(/\s+/g, '-') + '-credit-union';
    const state = extractState(text);
    return { slug, state: state || 'CA' };
  }

  return null;
}

/**
 * Mock LLM that parses user questions and generates tool calls.
 */
export class MockLLM {
  constructor() {
    this.conversationContext = {
      lastState: null,
      lastAmount: null,
      lastOffers: [],
    };
  }

  /**
   * Parse user message and determine what tool to call.
   * Returns { toolName, toolArgs, thinking }
   */
  parseMessage(userMessage) {
    const text = userMessage.toLowerCase();

    // Check if asking about a specific credit union
    const cuInfo = extractCreditUnion(userMessage);
    if (cuInfo && ['about', 'tell me', 'more', 'details'].some(kw => text.includes(kw))) {
      // Use context state if available
      const state = this.conversationContext.lastState || cuInfo.state;

      return {
        toolName: 'get_credit_union',
        toolArgs: { state, slug: cuInfo.slug },
        thinking: `Looking up details for ${cuInfo.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}...`,
      };
    }

    // Check for rate/mortgage queries
    const rateKeywords = ['rate', 'rates', 'mortgage', 'loan', 'home', 'house', 'buy', 'purchase', 'refinance'];
    if (rateKeywords.some(kw => text.includes(kw))) {
      const state = extractState(userMessage) || this.conversationContext.lastState || 'CA';
      const amount = extractAmount(userMessage) || this.conversationContext.lastAmount || 400_000;
      const intent = extractIntent(userMessage);

      // Update context
      this.conversationContext.lastState = state;
      this.conversationContext.lastAmount = amount;

      return {
        toolName: 'get_financing_decision',
        toolArgs: { state, intent, amount },
        thinking: `Looking up ${intent} rates in ${state} for $${amount.toLocaleString()}...`,
      };
    }

    // Default - no tool call needed
    return { toolName: null, toolArgs: null, thinking: '' };
  }

  /**
   * Format the tool result into a natural language response.
   */
  formatResponse(toolName, toolResult, userMessage) {
    if (toolName === 'get_financing_decision') {
      return this._formatDecision(toolResult);
    } else if (toolName === 'get_credit_union') {
      return this._formatCreditUnion(toolResult);
    }
    return "I couldn't process that request.";
  }

  _formatDecision(data) {
    const lines = [];

    const actionDisplay = {
      shop_providers: 'Shop Around - Better rates available!',
      wait_and_watch: 'Wait & Watch - Monitor for better rates',
      do_nothing: 'Hold - Your current offer is competitive',
    }[data.summary?.recommended_action] || '';

    if (actionDisplay) {
      lines.push(`**${actionDisplay}**`);
      lines.push(`Confidence: ${Math.round((data.summary?.confidence || 0) * 100)}%`);
      lines.push('');
    }

    if (data.summary?.estimated_savings) {
      const savings = data.summary.estimated_savings;
      lines.push(`You could save **$${Math.round(savings.monthly).toLocaleString()}/month** ($${Math.round(savings.total).toLocaleString()} over the loan term)`);
      lines.push('');
    }

    const action = data.actions?.[0];
    const offers = action?.offers || [];

    if (offers.length > 0) {
      lines.push('Here are the top options I found:');
      lines.push('');

      this.conversationContext.lastOffers = offers;

      for (const offer of offers.slice(0, 5)) {
        lines.push(`**#${offer.rank} ${offer.credit_union_name}**`);
        lines.push(`   ${offer.product_name} @ **${offer.apr}% APR**`);
        lines.push(`   Monthly Payment: $${Math.round(offer.monthly_payment).toLocaleString()}`);
        if (offer.estimated_monthly_savings) {
          lines.push(`   Potential Savings: $${Math.round(offer.estimated_monthly_savings).toLocaleString()}/month`);
        }
        lines.push('');
      }

      lines.push('Would you like more details on any of these lenders?');
    }

    return lines.join('\n');
  }

  _formatCreditUnion(data) {
    if (!data) {
      return 'Credit union not found.';
    }

    const lines = [];

    lines.push(`**${data.name}**`);
    const location = data.city ? `${data.city}, ` : '';
    lines.push(`${location}${data.stateName || data.state || ''}`);

    if (data.url) {
      lines.push(`Website: ${data.url}`);
    }

    lines.push('');

    const rates = data.rates || [];
    if (rates.length > 0) {
      lines.push('**Current Rates:**');
      for (const rate of rates) {
        lines.push(`- ${rate.productName}: ${rate.rate}% rate (${rate.apr}% APR)`);
      }

      lines.push('');
      lines.push('These rates are subject to change. Visit their website for the most current information.');
    } else {
      lines.push('No current rates available for this credit union.');
    }

    return lines.join('\n');
  }

  /**
   * Generate a response when no tool is needed.
   */
  generateFallbackResponse(userMessage) {
    const text = userMessage.toLowerCase();

    if (['hello', 'hi', 'hey'].some(kw => text.includes(kw))) {
      return "Hello! I'm a mortgage rate advisor. Ask me about mortgage rates in any US state, and I'll find the best options for you.";
    }

    if (['help', 'what can you do'].some(kw => text.includes(kw))) {
      return `I can help you with:

1. **Finding mortgage rates** - Just tell me a state and loan amount
   Example: "What are rates in California for a $500k home?"

2. **Comparing lenders** - I'll show you the top credit unions
   Example: "Best rates in North Carolina for refinancing?"

3. **Credit union details** - Ask about any lender I mention
   Example: "Tell me more about Navy Federal"

What would you like to know?`;
    }

    if (['thank', 'thanks', 'bye', 'goodbye'].some(kw => text.includes(kw))) {
      return "You're welcome! Good luck with your mortgage search. Feel free to come back anytime you have questions.";
    }

    return `I'm not sure I understood that. Try asking something like:

- "What are the best mortgage rates in California?"
- "Show me rates for a $400k home purchase in North Carolina"
- "What are refinance rates in New York?"

Or type 'help' to learn more about what I can do.`;
  }
}
