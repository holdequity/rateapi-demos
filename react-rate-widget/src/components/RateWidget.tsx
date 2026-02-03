import React from 'react';
import { useRateAPI, type UseRateAPIOptions, type Rate } from '../hooks/useRateAPI';
import './RateWidget.css';

export interface RateWidgetProps {
  /**
   * URL of your backend proxy that forwards requests to RateAPI.
   * Your proxy should add the API key server-side - never expose API keys client-side!
   * Example: '/api/rates' or 'https://your-api.com/rates'
   */
  proxyUrl: string;
  /** US state code to filter rates (e.g., "CA", "NY") */
  state?: string;
  /** Product type filter: mortgage, auto_loan, heloc, personal_loan, credit_card (default: "mortgage") */
  productType?: string;
  /** Number of rates to display (default: 5) */
  limit?: number;
  /** Auto-refresh interval in milliseconds (0 = disabled) */
  refreshInterval?: number;
  /** Widget title (defaults to dynamic title based on product type, e.g. "Mortgage Rates") */
  title?: string;
  /** Show state filter dropdown */
  showStateFilter?: boolean;
  /** Show product type filter */
  showProductFilter?: boolean;
  /** Show refresh button */
  showRefreshButton?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Theme: 'light' | 'dark' | 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** Called when a rate row is clicked */
  onRateClick?: (rate: Rate) => void;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

const PRODUCT_TYPES = [
  { value: 'mortgage', label: 'Mortgages', category: 'mortgage' },
  { value: 'auto_loan', label: 'Auto Loans', category: 'auto_loan' },
  { value: 'heloc', label: 'HELOCs', category: 'heloc' },
  { value: 'personal_loan', label: 'Personal Loans', category: 'personal_loan' },
  { value: 'credit_card', label: 'Credit Cards', category: 'credit_card' },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  mortgage: 'Mortgage Rates',
  auto_loan: 'Auto Loan Rates',
  heloc: 'HELOC Rates',
  personal_loan: 'Personal Loan Rates',
  credit_card: 'Credit Card Offers',
};

/**
 * RateWidget - Embeddable financial rate comparison widget
 * Supports mortgages, auto loans, HELOCs, personal loans, and credit cards
 *
 * IMPORTANT: Use a backend proxy to protect your API key!
 *
 * @example
 * ```tsx
 * <RateWidget
 *   proxyUrl="/api/rates"  // Your backend that adds API key
 *   state="CA"
 *   productType="mortgage"  // or auto_loan, heloc, personal_loan, credit_card
 *   limit={5}
 *   theme="light"
 *   showProductFilter={true}
 * />
 * ```
 */
export function RateWidget({
  proxyUrl,
  state: initialState,
  productType: initialProductType,
  limit = 5,
  refreshInterval,
  title,
  showStateFilter = false,
  showProductFilter = false,
  showRefreshButton = true,
  compact = false,
  className = '',
  theme = 'light',
  onRateClick,
}: RateWidgetProps) {
  const [selectedState, setSelectedState] = React.useState(initialState);
  const [selectedProductType, setSelectedProductType] = React.useState(initialProductType || 'mortgage');

  const widgetTitle = title || PRODUCT_TYPE_LABELS[selectedProductType] || "Today's Best Rates";

  const { rates, loading, error, lastUpdated, refresh } = useRateAPI({
    proxyUrl,
    state: selectedState,
    productType: selectedProductType,
    limit,
    refreshInterval,
  });

  const formatRate = (rate: number) => `${rate.toFixed(3)}%`;
  const formatAPR = (apr: number) => `${apr.toFixed(3)}%`;
  const formatPoints = (points: number) => points === 0 ? 'No points' : `${points.toFixed(2)} pts`;

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const themeClass = theme === 'auto'
    ? 'rateapi-widget-auto'
    : theme === 'dark'
      ? 'rateapi-widget-dark'
      : 'rateapi-widget-light';

  return (
    <div className={`rateapi-widget ${themeClass} ${compact ? 'rateapi-widget-compact' : ''} ${className}`}>
      {/* Header */}
      <div className="rateapi-widget-header">
        <h3 className="rateapi-widget-title">{widgetTitle}</h3>
        {lastUpdated && (
          <span className="rateapi-widget-updated">
            Updated {getRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Filters */}
      {(showStateFilter || showProductFilter) && (
        <div className="rateapi-widget-filters">
          {showStateFilter && (
            <select
              className="rateapi-widget-select"
              value={selectedState || ''}
              onChange={(e) => setSelectedState(e.target.value || undefined)}
            >
              <option value="">All States</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          )}
          {showProductFilter && (
            <select
              className="rateapi-widget-select"
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
            >
              {PRODUCT_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Content */}
      <div className="rateapi-widget-content">
        {loading && rates.length === 0 && (
          <div className="rateapi-widget-loading">
            <div className="rateapi-widget-spinner" />
            <span>Loading rates...</span>
          </div>
        )}

        {error && (
          <div className="rateapi-widget-error">
            <span className="rateapi-widget-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && rates.length === 0 && (
          <div className="rateapi-widget-empty">
            No rates found for the selected criteria.
          </div>
        )}

        {rates.length > 0 && (
          <div className="rateapi-widget-table">
            <div className="rateapi-widget-table-header">
              <span className="rateapi-widget-col-institution">Institution</span>
              <span className="rateapi-widget-col-rate">Rate</span>
              <span className="rateapi-widget-col-apr">APR</span>
              {!compact && <span className="rateapi-widget-col-points">Points</span>}
            </div>
            {rates.map((rate, index) => (
              <div
                key={rate.id || index}
                className={`rateapi-widget-row ${onRateClick ? 'rateapi-widget-row-clickable' : ''}`}
                onClick={() => onRateClick?.(rate)}
              >
                <div className="rateapi-widget-col-institution">
                  <span className="rateapi-widget-institution-name">{rate.institution}</span>
                  {!compact && (
                    <span className="rateapi-widget-institution-location">
                      {rate.city}, {rate.state}
                    </span>
                  )}
                </div>
                <span className="rateapi-widget-col-rate rateapi-widget-rate-value">
                  {formatRate(rate.rate)}
                </span>
                <span className="rateapi-widget-col-apr">
                  {formatAPR(rate.apr)}
                </span>
                {!compact && (
                  <span className="rateapi-widget-col-points">
                    {formatPoints(rate.points)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rateapi-widget-footer">
        {showRefreshButton && (
          <button
            className="rateapi-widget-refresh"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
        <a
          href="https://rateapi.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="rateapi-widget-powered"
        >
          Powered by RateAPI
        </a>
      </div>
    </div>
  );
}

export default RateWidget;
