import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

/**
 * Search for mortgage rates using the RateAPI decision engine
 */
export const searchRates = tool(
  async ({ state, productType, loanAmount, intent }) => {
    const apiKey = process.env.RATEAPI_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: 'RATEAPI_KEY not configured' });
    }

    try {
      const termMonths = productType === '15-year-fixed' ? 180 : 360;

      // Use the new decision engine format
      const response = await fetch(`${RATEAPI_URL}/v1/decisions`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision_type: 'financing',
          context: {
            request_id: `search_${Date.now()}`,
            geo: { state }
          },
          product_request: {
            product_type: 'mortgage',
            intent: intent || 'purchase',
            amount: loanAmount || 500000,
            term_months: termMonths,
            rate_type: 'fixed'
          },
          preferences: {
            max_providers: 5,
            prefer_credit_unions: true
          }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return JSON.stringify({ error: `API error: ${response.status} - ${error}` });
      }

      const data = await response.json();

      // Extract offers from the new response format
      const offers = data.actions?.[0]?.offers || [];

      // Format the results for the AI
      const formattedResults = {
        state,
        productType: productType || '30-year-fixed',
        loanAmount: loanAmount || 500000,
        resultCount: offers.length,
        recommendations: offers.map((offer) => ({
          rank: offer.rank,
          institution: offer.credit_union_name,
          rate: offer.rate,
          apr: offer.apr,
          points: offer.points || 0,
          monthlyPayment: offer.monthly_payment,
          savings: offer.estimated_monthly_savings,
        })),
        summary: data.summary,
        generatedAt: new Date().toISOString(),
      };

      return JSON.stringify(formattedResults, null, 2);
    } catch (error) {
      return JSON.stringify({ error: `Failed to fetch rates: ${error.message}` });
    }
  },
  {
    name: 'searchRates',
    description: 'Search for current mortgage rates by state and loan parameters. Returns the best available rates from credit unions.',
    schema: z.object({
      state: z.string().length(2).describe('US state code (e.g., "CA", "NY", "TX")'),
      productType: z.enum(['30-year-fixed', '15-year-fixed', '5-1-arm', '7-1-arm'])
        .describe('Type of mortgage product. Use "30-year-fixed" as default'),
      loanAmount: z.number()
        .describe('Loan amount in dollars. Use 500000 as default'),
      intent: z.enum(['purchase', 'refinance'])
        .describe('Whether this is for a purchase or refinance. Use "purchase" as default'),
    }),
  }
);
