# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in RateAPI Demos, please report it by emailing **kameronkales@gmail.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We'll respond within 48 hours and work with you to address the issue.

## Scope

This security policy covers the demo code in this repository. For security issues with the RateAPI service itself, please contact us at https://rateapi.dev

## What We Protect

- API key handling and storage
- Webhook signature verification
- Environment variable security
- Dependency vulnerabilities

## Best Practices for Using These Demos

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Rotate API keys** - If you accidentally expose a key, create a new one
3. **Verify webhook signatures** - See the webhook-monitor demo for implementation
4. **Keep dependencies updated** - Run `npm audit` regularly

## Out of Scope

- Issues with third-party services (OpenAI, Anthropic, etc.)
- General support questions (use GitHub Issues instead)
- Feature requests (use the Demo Request template)
