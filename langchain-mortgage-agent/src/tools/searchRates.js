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
      // Use the decision engine for personalized recommendations
      const response = await fetch(`${RATEAPI_URL}/v1/decisions`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state,
          intent: intent || 'purchase',
          amount: loanAmount || 500000,
          product_type: 'mortgage',
          term_months: productType === '15-year-fixed' ? 180 : 360,
          max_providers: 5,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return JSON.stringify({ error: `API error: ${response.status} - ${error}` });
      }

      const data = await response.json();

      // Format the results for the AI
      const formattedResults = {
        state,
        productType: productType || '30-year-fixed',
        loanAmount: loanAmount || 500000,
        resultCount: data.recommendations?.length || 0,
        recommendations: data.recommendations?.map((rec, i) => ({
          rank: i + 1,
          institution: rec.provider_name,
          city: rec.city,
          rate: rec.rate,
          apr: rec.apr,
          points: rec.points || 0,
          monthlyPayment: rec.monthly_payment,
        })) || [],
        recommendation: data.recommendation,
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
        .optional()
        .describe('Type of mortgage product. Defaults to 30-year-fixed'),
      loanAmount: z.number()
        .optional()
        .describe('Loan amount in dollars. Defaults to $500,000'),
      intent: z.enum(['purchase', 'refinance'])
        .optional()
        .describe('Whether this is for a purchase or refinance. Defaults to purchase'),
    }),
  }
);
