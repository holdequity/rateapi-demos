# Contributing to RateAPI Demos

Thanks for your interest in contributing! This repository contains demo applications showcasing the RateAPI mortgage rates API.

## Ways to Contribute

- **Report bugs** - Found something broken? Open an issue
- **Request demos** - Want to see a specific integration? Let us know
- **Submit demos** - Built something cool with RateAPI? We'd love to include it
- **Improve docs** - Typos, clarifications, better examples

## Development Setup

All demos share a root `.env` file:

```bash
# Copy example (if available) or create new
touch .env

# Run the rate-explorer demo first to auto-create an API key
node run.js rate-explorer

# The API key is now saved to .env and works for all demos
```

**Requirements:**
- Node.js 18 or higher
- npm or yarn

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Run `node run.js` to see available demos
4. Make your changes
5. Test that your changes work
6. Submit a pull request

## Submitting a Demo

If you've built a demo you'd like to contribute:

1. Create a new directory under the repo root (e.g., `my-demo/`)
2. Include a README.md explaining what the demo does
3. Make sure it works with `node run.js` or document how to run it
4. Keep dependencies minimal
5. Don't commit API keys or secrets

## Code Style

- Use clear, descriptive variable names
- Include comments for non-obvious logic
- Follow existing patterns in the codebase

## Pull Request Process

1. Create a descriptive PR title
2. Explain what your changes do and why
3. Link any related issues
4. Wait for review - we'll get back to you soon

## Questions?

- Open an issue on [GitHub](https://github.com/rate-api/demos/issues)
- Check out [rateapi.dev](https://rateapi.dev) for API information

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
