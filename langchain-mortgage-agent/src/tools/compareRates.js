import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

/**
 * Compare financial rates across multiple states
 */
export const compareRates = tool(
  async ({ states, productType, productCategory, loanAmount }) => {
    const apiKey = process.env.RATEAPI_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: 'RATEAPI_KEY not configured' });
    }

    try {
      // Determine term_months based on productType/productCategory
      let termMonths = 360; // default 30-year mortgage
      if (productType === '15-year-fixed') {
        termMonths = 180;
      } else if (productCategory === 'auto_loan') {
        termMonths = 60; // default 5-year auto loan
      }

      // Fetch rates for each state in parallel
      const results = await Promise.all(
        states.map(async (state) => {
          try {
            const response = await fetch(`${RATEAPI_URL}/v1/decisions`, {
              method: 'POST',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                decision_type: 'financing',
                context: {
                  request_id: `compare_${state}_${Date.now()}`,
                  geo: { state }
                },
                product_request: {
                  product_type: productCategory || 'mortgage',
                  intent: 'purchase',
                  amount: loanAmount || 500000,
                  term_months: termMonths,
                  rate_type: 'fixed'
                },
                preferences: {
                  max_providers: 1,
                  prefer_credit_unions: true
                }
              }),
            });

            if (!response.ok) {
              return { state, error: `API error: ${response.status}` };
            }

            const data = await response.json();
            const best = data.actions?.[0]?.offers?.[0];

            if (!best) {
              return { state, error: 'No rates found' };
            }

            return {
              state,
              bestRate: {
                institution: best.credit_union_name,
                rate: best.rate,
                apr: best.apr,
                points: best.points || 0,
                monthlyPayment: best.monthly_payment,
              },
            };
          } catch (error) {
            return { state, error: error.message };
          }
        })
      );

      // Sort by rate for easy comparison
      const successfulResults = results.filter(r => !r.error);
      const failedResults = results.filter(r => r.error);

      successfulResults.sort((a, b) => a.bestRate.rate - b.bestRate.rate);

      // Calculate savings between best and worst
      let savings = null;
      if (successfulResults.length >= 2) {
        const best = successfulResults[0];
        const worst = successfulResults[successfulResults.length - 1];
        const monthlyDiff = worst.bestRate.monthlyPayment - best.bestRate.monthlyPayment;
        const termMonths = productType === '15-year-fixed' ? 180 : 360;

        savings = {
          bestState: best.state,
          worstState: worst.state,
          rateDifference: Math.round((worst.bestRate.rate - best.bestRate.rate) * 1000) / 1000,
          monthlyDifference: Math.round(monthlyDiff * 100) / 100,
          lifetimeDifference: Math.round(monthlyDiff * termMonths),
        };
      }

      const comparison = {
        productType: productType || '30-year-fixed',
        loanAmount: loanAmount || 500000,
        statesCompared: states.length,
        comparison: successfulResults,
        errors: failedResults.length > 0 ? failedResults : undefined,
        savings,
        generatedAt: new Date().toISOString(),
      };

      return JSON.stringify(comparison, null, 2);
    } catch (error) {
      return JSON.stringify({ error: `Comparison failed: ${error.message}` });
    }
  },
  {
    name: 'compareRates',
    description: 'Compare the best financial rates across multiple US states. Supports mortgages, auto loans, HELOCs, personal loans, and credit cards. Useful for understanding regional rate differences.',
    schema: z.object({
      states: z.array(z.string().length(2))
        .min(2)
        .max(10)
        .describe('Array of US state codes to compare (e.g., ["CA", "NY", "TX"])'),
      productCategory: z.enum(['mortgage', 'auto_loan', 'heloc', 'personal_loan', 'credit_card'])
        .describe('Type of financial product to compare. Use "mortgage" as default'),
      productType: z.enum(['30-year-fixed', '15-year-fixed'])
        .optional()
        .describe('Type of mortgage to compare (only applies to mortgages). Use "30-year-fixed" as default'),
      loanAmount: z.number()
        .describe('Loan amount for payment calculations. Use 500000 for mortgages, 30000 for auto loans as defaults'),
    }),
  }
);
