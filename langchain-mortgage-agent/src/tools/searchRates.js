import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

/**
 * Search for financial rates using the RateAPI decision engine
 */
export const searchRates = tool(
  async ({ state, productType, productCategory, loanAmount, intent }) => {
    const apiKey = process.env.RATEAPI_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: 'RATEAPI_KEY not configured' });
    }

    try {
      // Determine term_months based on productType (for mortgages and auto loans)
      let termMonths = 360; // default 30-year mortgage
      if (productType === '15-year-fixed') {
        termMonths = 180;
      } else if (productCategory === 'auto_loan') {
        termMonths = 60; // default 5-year auto loan
      }

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
            product_type: productCategory || 'mortgage',
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
    description: 'Search for current financial rates by state and loan parameters. Supports mortgages, auto loans, HELOCs, personal loans, and credit cards. Returns the best available rates from credit unions and lenders.',
    schema: z.object({
      state: z.string().length(2).describe('US state code (e.g., "CA", "NY", "TX")'),
      productCategory: z.enum(['mortgage', 'auto_loan', 'heloc', 'personal_loan', 'credit_card'])
        .describe('Type of financial product. Use "mortgage" as default'),
      productType: z.enum(['30-year-fixed', '15-year-fixed', '5-1-arm', '7-1-arm'])
        .optional()
        .describe('Type of mortgage product (only applies to mortgages). Use "30-year-fixed" as default'),
      loanAmount: z.number()
        .describe('Loan amount in dollars. Use 500000 for mortgages, 30000 for auto loans, 20000 for personal loans as defaults'),
      intent: z.enum(['purchase', 'refinance', 'cash_out', 'balance_transfer', 'new_credit'])
        .describe('Loan intent: "purchase" or "refinance" for mortgages/auto loans, "cash_out" for HELOCs, "balance_transfer" or "new_credit" for credit cards. Use "purchase" as default'),
    }),
  }
);
