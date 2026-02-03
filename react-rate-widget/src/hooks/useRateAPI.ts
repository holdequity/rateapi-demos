import { useState, useEffect, useCallback } from 'react';

export interface Rate {
  id: string;
  institution: string;
  state: string;
  city: string;
  productType: string;
  productName: string;
  rate: number;
  apr: number;
  points: number;
  scrapedAt: string;
}

export interface RateAPIResponse {
  total: number;
  count: number;
  offset: number;
  limit: number;
  results: Rate[];
}

export interface UseRateAPIOptions {
  /**
   * URL of your backend proxy that forwards requests to RateAPI.
   * Your proxy should add the API key server-side and call /v1/decisions.
   * Example: '/api/rates'
   */
  proxyUrl: string;
  /** US state code (e.g., "CA", "NY") */
  state?: string;
  /** Product type: mortgage, auto_loan, heloc, personal_loan, credit_card */
  productType?: string;
  /** Number of results to return */
  limit?: number;
  /** Auto-refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
}

export interface UseRateAPIResult {
  rates: Rate[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * React hook for fetching mortgage rates via your backend proxy
 *
 * IMPORTANT: Never expose your API key client-side!
 * Your backend proxy should call /v1/decisions with the API key.
 *
 * @example
 * ```tsx
 * const { rates, loading, error, refresh } = useRateAPI({
 *   proxyUrl: '/api/rates',
 *   state: 'CA',
 *   limit: 5
 * });
 * ```
 */
export function useRateAPI(options: UseRateAPIOptions): UseRateAPIResult {
  const {
    proxyUrl,
    state,
    productType,
    limit = 5,
    refreshInterval = 0,
  } = options;

  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = useCallback(async () => {
    if (!proxyUrl) {
      setError('Proxy URL is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (state) params.set('state', state);
      if (productType) params.set('product_type', productType);
      params.set('limit', String(limit));

      const separator = proxyUrl.includes('?') ? '&' : '?';
      const url = `${proxyUrl}${separator}${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data: RateAPIResponse = await response.json();
      setRates(data.results || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  }, [proxyUrl, state, productType, limit]);

  // Initial fetch
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Optional refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchRates, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchRates, refreshInterval]);

  return {
    rates,
    loading,
    error,
    lastUpdated,
    refresh: fetchRates,
  };
}
