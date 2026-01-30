import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

/**
 * Compare mortgage rates across multiple states
 */
export const compareRates = tool(
  async ({ states, productType, loanAmount }) => {
    const apiKey = process.env.RATEAPI_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: 'RATEAPI_KEY not configured' });
    }

    try {
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
                state,
                intent: 'purchase',
                amount: loanAmount || 500000,
                product_type: 'mortgage',
                term_months: productType === '15-year-fixed' ? 180 : 360,
                max_providers: 1, // Just get the best rate for comparison
              }),
            });

            if (!response.ok) {
              return { state, error: `API error: ${response.status}` };
            }

            const data = await response.json();
            const best = data.recommendations?.[0];

            if (!best) {
              return { state, error: 'No rates found' };
            }

            // Calculate monthly payment for comparison
            const monthlyRate = best.rate / 100 / 12;
            const principal = loanAmount || 500000;
            const termMonths = productType === '15-year-fixed' ? 180 : 360;
            const monthlyPayment = monthlyRate === 0
              ? principal / termMonths
              : principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                (Math.pow(1 + monthlyRate, termMonths) - 1);

            return {
              state,
              bestRate: {
                institution: best.provider_name,
                city: best.city,
                rate: best.rate,
                apr: best.apr,
                points: best.points || 0,
                monthlyPayment: Math.round(monthlyPayment * 100) / 100,
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
    description: 'Compare the best mortgage rates across multiple US states. Useful for understanding regional rate differences.',
    schema: z.object({
      states: z.array(z.string().length(2))
        .min(2)
        .max(10)
        .describe('Array of US state codes to compare (e.g., ["CA", "NY", "TX"])'),
      productType: z.enum(['30-year-fixed', '15-year-fixed'])
        .default('30-year-fixed')
        .describe('Type of mortgage to compare'),
      loanAmount: z.number()
        .default(500000)
        .describe('Loan amount for payment calculations'),
    }),
  }
);
