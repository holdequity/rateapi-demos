import { LitElement, html, css } from 'lit';

/**
 * Rate Overlay Component
 *
 * Displays credit union mortgage rate comparisons on real estate listing pages.
 * Uses Shadow DOM for style isolation from the host page.
 */
export class RateOverlay extends LitElement {
  static properties = {
    bestRate: { type: Number },
    avgRate: { type: Number },
    monthlySavings: { type: Number },
    expanded: { type: Boolean },
    loading: { type: Boolean },
    error: { type: String },
    offers: { type: Array },
    minimized: { type: Boolean },
    position: { type: String }, // 'bottom-right', 'bottom-left'
    isRefinance: { type: Boolean }, // true for refinance context (e.g., ProjectionLab)
    showStateSelector: { type: Boolean }, // show state selection UI
    selectedState: { type: String }, // user's selected state
  };

  static styles = css`
    :host {
      /* CSS Custom Properties for theming */
      --rateapi-brand: #2563eb;
      --rateapi-brand-dark: #1d4ed8;
      --rateapi-success: #059669;
      --rateapi-success-light: #d1fae5;
      --rateapi-surface: #ffffff;
      --rateapi-surface-secondary: #f9fafb;
      --rateapi-text: #1f2937;
      --rateapi-text-muted: #6b7280;
      --rateapi-border: #e5e7eb;
      --rateapi-radius: 12px;
      --rateapi-radius-sm: 8px;
      --rateapi-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      --rateapi-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.16);

      display: block;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--rateapi-text);
    }

    * {
      box-sizing: border-box;
    }

    .overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 340px;
      background: var(--rateapi-surface);
      border-radius: var(--rateapi-radius);
      box-shadow: var(--rateapi-shadow-lg);
      overflow: hidden;
      z-index: 999999;
      transition: all 0.3s ease;
    }

    .overlay.minimized {
      width: auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--rateapi-brand);
      color: white;
      padding: 12px 16px;
      font-weight: 600;
      font-size: 14px;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon {
      width: 20px;
      height: 20px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .header-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 4px;
      color: white;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .header-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .content {
      padding: 16px;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: var(--rateapi-text-muted);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--rateapi-border);
      border-top-color: var(--rateapi-brand);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 12px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error {
      padding: 16px;
      text-align: center;
      color: var(--rateapi-text-muted);
    }

    .rate-comparison {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .rate-box {
      flex: 1;
    }

    .rate-label {
      font-size: 12px;
      color: var(--rateapi-text-muted);
      margin-bottom: 4px;
    }

    .rate-value {
      font-size: 22px;
      font-weight: 700;
    }

    .rate-value.best {
      color: var(--rateapi-brand);
    }

    .rate-value.avg {
      color: var(--rateapi-text-muted);
    }

    .savings-banner {
      background: var(--rateapi-success-light);
      border-radius: var(--rateapi-radius-sm);
      padding: 12px;
      text-align: center;
      margin-bottom: 16px;
    }

    .savings-label {
      font-size: 12px;
      color: var(--rateapi-success);
      margin-bottom: 2px;
    }

    .savings-amount {
      font-size: 28px;
      font-weight: 800;
      color: var(--rateapi-success);
    }

    .savings-period {
      font-size: 14px;
      color: var(--rateapi-success);
      font-weight: 500;
    }

    .cta-btn {
      width: 100%;
      padding: 12px 16px;
      background: var(--rateapi-brand);
      color: white;
      border: none;
      border-radius: var(--rateapi-radius-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .cta-btn:hover {
      background: var(--rateapi-brand-dark);
    }

    .offers-list {
      margin-top: 16px;
      border-top: 1px solid var(--rateapi-border);
      padding-top: 12px;
    }

    .offer-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--rateapi-border);
    }

    .offer-item:last-child {
      border-bottom: none;
    }

    .offer-name {
      font-weight: 600;
      font-size: 13px;
      color: var(--rateapi-text);
    }

    .offer-details {
      text-align: right;
    }

    .offer-rate {
      font-weight: 700;
      color: var(--rateapi-brand);
    }

    .offer-payment {
      font-size: 12px;
      color: var(--rateapi-text-muted);
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      background: var(--rateapi-surface-secondary);
      font-size: 11px;
      color: var(--rateapi-text-muted);
    }

    .footer a {
      color: var(--rateapi-brand);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .minimized-content {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .minimized-savings {
      font-weight: 700;
      color: var(--rateapi-success);
    }

    .mock-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
    }

    .refinance-banner {
      background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
      border-radius: var(--rateapi-radius-sm);
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 13px;
      color: #1e40af;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .refinance-icon {
      font-size: 16px;
    }

    .state-selector {
      padding: 16px;
    }

    .state-selector-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      color: var(--rateapi-text);
    }

    .state-selector-subtitle {
      font-size: 12px;
      color: var(--rateapi-text-muted);
      margin-bottom: 12px;
    }

    .state-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--rateapi-border);
      border-radius: var(--rateapi-radius-sm);
      font-size: 14px;
      background: var(--rateapi-surface);
      color: var(--rateapi-text);
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .state-select:focus {
      outline: none;
      border-color: var(--rateapi-brand);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .state-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--rateapi-surface-secondary);
      border: 1px solid var(--rateapi-border);
      border-radius: 9999px;
      padding: 4px 10px;
      font-size: 12px;
      color: var(--rateapi-text);
      cursor: pointer;
      transition: all 0.2s;
    }

    .state-badge:hover {
      background: var(--rateapi-border);
    }

    .state-badge-icon {
      width: 12px;
      height: 12px;
    }
  `;

  constructor() {
    super();
    this.bestRate = 0;
    this.avgRate = 6.75;
    this.monthlySavings = 0;
    this.expanded = false;
    this.loading = true;
    this.error = null;
    this.offers = [];
    this.minimized = false;
    this.position = 'bottom-right';
    this.isRefinance = false;
    this.showStateSelector = false;
    this.selectedState = '';
  }

  // US States for the selector
  static states = [
    { abbrev: 'AL', name: 'Alabama' }, { abbrev: 'AK', name: 'Alaska' },
    { abbrev: 'AZ', name: 'Arizona' }, { abbrev: 'AR', name: 'Arkansas' },
    { abbrev: 'CA', name: 'California' }, { abbrev: 'CO', name: 'Colorado' },
    { abbrev: 'CT', name: 'Connecticut' }, { abbrev: 'DE', name: 'Delaware' },
    { abbrev: 'FL', name: 'Florida' }, { abbrev: 'GA', name: 'Georgia' },
    { abbrev: 'HI', name: 'Hawaii' }, { abbrev: 'ID', name: 'Idaho' },
    { abbrev: 'IL', name: 'Illinois' }, { abbrev: 'IN', name: 'Indiana' },
    { abbrev: 'IA', name: 'Iowa' }, { abbrev: 'KS', name: 'Kansas' },
    { abbrev: 'KY', name: 'Kentucky' }, { abbrev: 'LA', name: 'Louisiana' },
    { abbrev: 'ME', name: 'Maine' }, { abbrev: 'MD', name: 'Maryland' },
    { abbrev: 'MA', name: 'Massachusetts' }, { abbrev: 'MI', name: 'Michigan' },
    { abbrev: 'MN', name: 'Minnesota' }, { abbrev: 'MS', name: 'Mississippi' },
    { abbrev: 'MO', name: 'Missouri' }, { abbrev: 'MT', name: 'Montana' },
    { abbrev: 'NE', name: 'Nebraska' }, { abbrev: 'NV', name: 'Nevada' },
    { abbrev: 'NH', name: 'New Hampshire' }, { abbrev: 'NJ', name: 'New Jersey' },
    { abbrev: 'NM', name: 'New Mexico' }, { abbrev: 'NY', name: 'New York' },
    { abbrev: 'NC', name: 'North Carolina' }, { abbrev: 'ND', name: 'North Dakota' },
    { abbrev: 'OH', name: 'Ohio' }, { abbrev: 'OK', name: 'Oklahoma' },
    { abbrev: 'OR', name: 'Oregon' }, { abbrev: 'PA', name: 'Pennsylvania' },
    { abbrev: 'RI', name: 'Rhode Island' }, { abbrev: 'SC', name: 'South Carolina' },
    { abbrev: 'SD', name: 'South Dakota' }, { abbrev: 'TN', name: 'Tennessee' },
    { abbrev: 'TX', name: 'Texas' }, { abbrev: 'UT', name: 'Utah' },
    { abbrev: 'VT', name: 'Vermont' }, { abbrev: 'VA', name: 'Virginia' },
    { abbrev: 'WA', name: 'Washington' }, { abbrev: 'WV', name: 'West Virginia' },
    { abbrev: 'WI', name: 'Wisconsin' }, { abbrev: 'WY', name: 'Wyoming' },
    { abbrev: 'DC', name: 'Washington D.C.' },
  ];

  render() {
    if (this.minimized) {
      return this._renderMinimized();
    }

    return html`
      <div class="overlay">
        <div class="header">
          <div class="header-title">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            ${this.isRefinance ? 'Refinance Rates' : 'Credit Union Rates'}
          </div>
          <div class="header-actions">
            <button class="header-btn" @click=${this._minimize} title="Minimize">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1" y="5" width="10" height="2" />
              </svg>
            </button>
            <button class="header-btn" @click=${this._close} title="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="2" />
              </svg>
            </button>
          </div>
        </div>

        ${this.showStateSelector ? this._renderStateSelector() :
          this.loading ? this._renderLoading() :
          this.error ? this._renderError() :
          this._renderContent()}

        <div class="footer">
          Powered by
          <a href="https://rateapi.dev" target="_blank" rel="noopener">RateAPI</a>
        </div>
      </div>
    `;
  }

  _renderLoading() {
    return html`
      <div class="loading">
        <div class="spinner"></div>
        Loading rates...
      </div>
    `;
  }

  _renderError() {
    return html`
      <div class="error">
        <p>${this.error}</p>
        <button class="cta-btn" @click=${this._retry}>Try Again</button>
      </div>
    `;
  }

  _renderStateSelector() {
    return html`
      <div class="state-selector">
        <div class="state-selector-title">Select Your State</div>
        <div class="state-selector-subtitle">
          We'll show you the best credit union rates available in your area.
        </div>
        <select class="state-select" @change=${this._onStateSelect}>
          <option value="">Choose your state...</option>
          ${RateOverlay.states.map(s => html`
            <option value="${s.abbrev}" ?selected=${this.selectedState === s.abbrev}>
              ${s.name}
            </option>
          `)}
        </select>
      </div>
    `;
  }

  _renderContent() {
    const savingsLabel = this.isRefinance
      ? 'Refinance Savings'
      : 'Potential Monthly Savings';

    const rateLabel = this.isRefinance
      ? 'Best Refi Rate'
      : 'Best Credit Union';

    const ctaText = this.expanded
      ? 'Hide credit union options'
      : 'See 5 credit union options';

    const stateName = this.selectedState
      ? RateOverlay.states.find(s => s.abbrev === this.selectedState)?.name || this.selectedState
      : '';

    return html`
      <div class="content">
        ${this.selectedState ? html`
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span class="state-badge" @click=${this._showStateSelector}>
              <svg class="state-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${stateName}
              <svg class="state-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </div>
        ` : ''}
        ${this.isRefinance ? html`
          <div class="refinance-banner">
            <span class="refinance-icon">💡</span>
            Based on your mortgage, you could save by refinancing
          </div>
        ` : ''}

        <div class="rate-comparison">
          <div class="rate-box">
            <div class="rate-label">${rateLabel}</div>
            <div class="rate-value best">${this.bestRate}% APR</div>
          </div>
          <div class="rate-box" style="text-align: right;">
            <div class="rate-label">National Avg</div>
            <div class="rate-value avg">${this.avgRate}%</div>
          </div>
        </div>

        <div class="savings-banner">
          <div class="savings-label">${savingsLabel}</div>
          <div>
            <span class="savings-amount">$${this.monthlySavings}</span>
            <span class="savings-period">/month</span>
          </div>
        </div>

        <button class="cta-btn" @click=${this._toggleExpand}>
          ${ctaText}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="transform: rotate(${this.expanded ? 180 : 0}deg); transition: transform 0.2s;">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </button>

        ${this.expanded ? this._renderOffers() : ''}
      </div>
    `;
  }

  _renderOffers() {
    if (!this.offers || this.offers.length === 0) {
      return html`<div class="offers-list"><p>No offers available</p></div>`;
    }

    return html`
      <div class="offers-list">
        ${this.offers.map(
          (offer) => html`
            <div class="offer-item">
              <div class="offer-name">${offer.credit_union_name}</div>
              <div class="offer-details">
                <div class="offer-rate">${offer.apr}% APR</div>
                <div class="offer-payment">$${offer.monthly_payment?.toLocaleString()}/mo</div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  _renderMinimized() {
    return html`
      <div class="overlay minimized">
        <div class="header" @click=${this._restore} style="cursor: pointer;">
          <div class="header-title">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Save $${this.monthlySavings}/mo
          </div>
          <div class="header-actions">
            <button class="header-btn" @click=${this._close} title="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _toggleExpand() {
    this.expanded = !this.expanded;
  }

  _minimize(e) {
    e.stopPropagation();
    this.minimized = true;
  }

  _restore() {
    this.minimized = false;
  }

  _close(e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  _retry() {
    this.dispatchEvent(new CustomEvent('retry', { bubbles: true }));
  }

  _showStateSelector() {
    this.showStateSelector = true;
  }

  _onStateSelect(e) {
    const state = e.target.value;
    if (state) {
      this.selectedState = state;
      this.showStateSelector = false;
      this.loading = true;
      // Dispatch event to notify content script of state change
      this.dispatchEvent(new CustomEvent('statechange', {
        bubbles: true,
        detail: { state }
      }));
    }
  }

  /**
   * Update the overlay with new rate data
   */
  setRateData(data) {
    this.loading = false;
    this.error = null;
    this.bestRate = data.bestRate || 0;
    this.avgRate = data.avgRate || 6.75;
    this.monthlySavings = data.monthlySavings || 0;
    this.offers = data.topOffers || [];
  }

  /**
   * Set error state
   */
  setError(message) {
    this.loading = false;
    this.error = message;
  }
}

// Note: Custom element registration is handled by the content script entry point
// to ensure proper timing and error handling
