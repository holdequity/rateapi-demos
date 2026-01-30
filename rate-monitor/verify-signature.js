/**
 * Webhook Signature Verification Utility
 *
 * Production-ready code for verifying RateAPI webhook signatures.
 * Copy this into your project to secure your webhook endpoints.
 */

import * as crypto from 'crypto';

// Signature version for forward compatibility
const SIGNATURE_VERSION = 'v1';

/**
 * Signs a webhook payload using HMAC-SHA256
 *
 * @param {string} payload - The JSON payload as a string
 * @param {string} secret - The webhook signing secret
 * @param {number} timestamp - Unix timestamp (seconds) when the signature was created
 * @returns {Promise<string>} The signature in format "v1={hex}"
 */
export async function signWebhookPayload(payload, secret, timestamp) {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const hexSignature = hmac.digest('hex');
  return `${SIGNATURE_VERSION}=${hexSignature}`;
}

/**
 * Verifies a webhook signature
 *
 * @param {string} payload - The JSON payload as a string
 * @param {string} signature - The signature header value (e.g., "v1={hex}")
 * @param {string} secret - The webhook signing secret
 * @param {number} timestamp - Unix timestamp from the X-RateAPI-Timestamp header
 * @param {number} toleranceSeconds - Maximum age of signature in seconds (default: 5 minutes)
 * @returns {Promise<{valid: boolean, error?: string}>} Validation result
 */
export async function verifyWebhookSignature(
  payload,
  signature,
  secret,
  timestamp,
  toleranceSeconds = 300
) {
  // Check timestamp tolerance to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    return {
      valid: false,
      error: `Signature timestamp is too old or in the future (age: ${age}s, tolerance: ${toleranceSeconds}s)`,
    };
  }

  // Parse the signature version
  const [versionPart, signaturePart] = signature.split('=');

  if (versionPart !== SIGNATURE_VERSION) {
    return {
      valid: false,
      error: `Unsupported signature version: ${versionPart}`,
    };
  }

  if (!signaturePart) {
    return {
      valid: false,
      error: 'Invalid signature format',
    };
  }

  // Compute expected signature
  const expectedSignature = await signWebhookPayload(payload, secret, timestamp);
  const expectedSignaturePart = expectedSignature.split('=')[1];

  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(signaturePart, 'utf8'),
    Buffer.from(expectedSignaturePart, 'utf8')
  );

  if (!valid) {
    return {
      valid: false,
      error: 'Signature mismatch',
    };
  }

  return { valid: true };
}

/**
 * Generates a webhook signing secret (for testing)
 * In production, this is returned by the API when you create a monitor.
 *
 * @returns {string} A 32-byte random hex string prefixed with "whsec_"
 */
export function generateWebhookSecret() {
  const bytes = crypto.randomBytes(32);
  return `whsec_${bytes.toString('hex')}`;
}
