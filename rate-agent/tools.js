/**
 * RateAPI Tool Definitions for LLM Integration
 *
 * These tool definitions follow the OpenAI function calling format.
 * They can be used with OpenAI, Anthropic, or any LLM that supports function calling.
 */

import { randomUUID } from 'crypto';

// Tool definitions in OpenAI function format
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_financing_decision',
      description: 'Get personalized mortgage financing recommendations. Returns ranked offers with rates, monthly payments, and potential savings.',
      parameters: {
        type: 'object',
        properties: {
          state: {
            type: 'string',
            description: 'US state code (2 letters, e.g., CA, TX, NY)',
          },
          intent: {
            type: 'string',
            enum: ['purchase', 'refinance'],
            description: 'Whether this is for a home purchase or refinance',
          },
          amount: {
            type: 'number',
            description: 'Loan amount in dollars',
          },
          term_months: {
            type: 'number',
            description: 'Loan term in months. Default is 360 (30 years)',
          },
          current_rate: {
            type: 'number',
            description: 'Current mortgage rate if refinancing (e.g., 7.5 for 7.5%)',
          },
        },
        required: ['state', 'intent', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_credit_union',
      description: 'Get detailed information about a specific credit union including all their current mortgage rates.',
      parameters: {
        type: 'object',
        properties: {
          state: {
            type: 'string',
            description: 'US state code (2 letters)',
          },
          slug: {
            type: 'string',
            description: "Credit union slug (URL-friendly name, e.g., 'navy-federal-credit-union')",
          },
        },
        required: ['state', 'slug'],
      },
    },
  },
];

/**
 * RateAPI Client for making API calls
 */
export class RateAPIClient {
  constructor(apiKey, apiUrl = 'https://api.rateapi.dev') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };
  }

  async getFinancingDecision({ state, intent, amount, termMonths = 360, currentRate = null, maxProviders = 5 }) {
    const requestBody = {
      decision_type: 'financing',
      context: {
        request_id: `agent-${randomUUID()}`,
        geo: {
          state: state.toUpperCase(),
        },
      },
      product_request: {
        product_type: 'mortgage',
        intent,
        amount,
        term_months: termMonths,
      },
      preferences: {
        max_providers: maxProviders,
      },
    };

    if (currentRate !== null) {
      requestBody.current_offer = {
        rate: currentRate,
        apr: currentRate,
      };
    }

    const response = await fetch(`${this.apiUrl}/v1/decisions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Decision API error: ${response.status}`);
    }

    return response.json();
  }

  async getCreditUnion(state, slug) {
    const response = await fetch(`${this.apiUrl}/credit-unions/${state.toLowerCase()}/${slug}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.message || `Credit union lookup error: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Execute a tool call and return the result
 */
export async function executeTool(client, name, args) {
  switch (name) {
    case 'get_financing_decision':
      return client.getFinancingDecision({
        state: args.state,
        intent: args.intent,
        amount: args.amount,
        termMonths: args.term_months || 360,
        currentRate: args.current_rate,
      });

    case 'get_credit_union':
      return client.getCreditUnion(args.state, args.slug);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Format decision response for display
 */
export function formatDecisionResponse(data) {
  const lines = [];

  const actionDisplay = {
    shop_providers: 'Shop Around - Better rates available',
    wait_and_watch: 'Wait & Watch - Monitor for better rates',
    do_nothing: 'Hold - Current offer is competitive',
  }[data.summary.recommended_action] || data.summary.recommended_action;

  lines.push(`Recommendation: ${actionDisplay}`);
  lines.push(`Confidence: ${Math.round(data.summary.confidence * 100)}%`);
  lines.push('');

  if (data.summary.estimated_savings) {
    const savings = data.summary.estimated_savings;
    lines.push(`Potential Savings: $${savings.monthly.toLocaleString()}/month ($${savings.total.toLocaleString()} total)`);
    lines.push('');
  }

  const action = data.actions?.[0];
  const offers = action?.offers || [];

  if (offers.length > 0) {
    lines.push(`Top ${Math.min(offers.length, 5)} Offers:`);
    lines.push('');

    for (const offer of offers.slice(0, 5)) {
      lines.push(`#${offer.rank} ${offer.credit_union_name}`);
      lines.push(`   ${offer.product_name} @ ${offer.apr}% APR`);
      lines.push(`   Monthly Payment: $${Math.round(offer.monthly_payment).toLocaleString()}`);
      if (offer.estimated_monthly_savings) {
        lines.push(`   Savings: $${Math.round(offer.estimated_monthly_savings).toLocaleString()}/month`);
      }
      lines.push('');
    }
  }

  if (action?.why) {
    lines.push('Why this recommendation:');
    for (const reason of action.why) {
      lines.push(`  - ${reason}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format credit union response for display
 */
export function formatCreditUnionResponse(data) {
  const lines = [];

  lines.push(data.name);
  const location = data.city ? `${data.city}, ` : '';
  lines.push(`${location}${data.stateName || data.state || ''}`);
  lines.push('');

  if (data.url) {
    lines.push(`Website: ${data.url}`);
    lines.push('');
  }

  const rates = data.rates || [];
  if (rates.length > 0) {
    lines.push('All Available Rates:');
    for (const rate of rates) {
      lines.push(`  - ${rate.productName}: ${rate.rate}% rate, ${rate.apr}% APR`);
      if (rate.points > 0) {
        lines.push(`    Points: ${rate.points}`);
      }
    }
  } else {
    lines.push('No current rates available.');
  }

  return lines.join('\n');
}
