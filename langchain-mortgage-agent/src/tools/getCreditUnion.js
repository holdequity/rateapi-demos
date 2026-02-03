import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const RATEAPI_URL = process.env.RATEAPI_URL || 'https://api.rateapi.dev';

/**
 * Get detailed information about a specific credit union
 */
export const getCreditUnion = tool(
  async ({ state, slug }) => {
    const apiKey = process.env.RATEAPI_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: 'RATEAPI_KEY not configured' });
    }

    try {
      const response = await fetch(
        `${RATEAPI_URL}/credit-unions/${state.toLowerCase()}/${slug}`,
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return JSON.stringify({
            error: `Credit union not found: ${slug} in ${state}`,
            suggestion: 'Try searching for rates first to find valid credit union names'
          });
        }
        const error = await response.text();
        return JSON.stringify({ error: `API error: ${response.status} - ${error}` });
      }

      const data = await response.json();

      // Format the credit union info
      const formattedResult = {
        name: data.name,
        city: data.city,
        state: data.state,
        url: data.url,
        lastVerified: data.lastVerified,
        rateCount: data.rates?.length || 0,
        rates: data.rates?.map(rate => ({
          productType: rate.productType,
          productName: rate.productName,
          rate: rate.rate,
          apr: rate.apr,
          points: rate.points,
          scrapedAt: rate.scrapedAt,
        })) || [],
        profileUrl: `https://rateapi.dev/credit-unions/${state.toLowerCase()}/${slug}`,
      };

      return JSON.stringify(formattedResult, null, 2);
    } catch (error) {
      return JSON.stringify({ error: `Failed to fetch credit union: ${error.message}` });
    }
  },
  {
    name: 'getCreditUnion',
    description: 'Get detailed information about a specific credit union including all their current rates across all product types. Use the credit union slug from search results.',
    schema: z.object({
      state: z.string().length(2).describe('US state code (e.g., "CA", "NY")'),
      slug: z.string().describe('Credit union URL slug (e.g., "golden-1-credit-union", "navy-federal-credit-union")'),
    }),
  }
);
