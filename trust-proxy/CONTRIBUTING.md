# Contributing to @asoc/trust-proxy

Thank you for contributing to the A-SOC Trust Proxy middleware!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/asoc-trust/asoc-core.git
cd asoc-core/packages/trust-proxy

# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

## Testing Your Changes

The Trust Proxy is middleware, so test it with the example:

```bash
# 1. Build your changes
npm run build

# 2. Test with seller agent
cd ../../examples/basic-x402
npm run dev:seller

# 3. In another terminal, run buyer
npm run dev:buyer
```

## Code Style

- Use Express middleware patterns
- Keep configuration options minimal and sensible
- All error responses should follow x402 spec
- Export TypeScript types for `req.asoc`

## What We're Looking For

- **New middleware variants**: e.g., `graphqlTrustProxy`, `grpcTrustProxy`
- **Better error handling**: More descriptive 402/403 responses
- **Framework adapters**: Fastify, Koa, Hono support
- **Performance improvements**: Reduce validation overhead

## Pull Request Guidelines

1. Ensure backward compatibility with existing configs
2. Update README.md with new options
3. Test with the basic-x402 example
4. Keep Express as a peer dependency (not bundled)

## Architecture Notes

The Trust Proxy is a **convenience wrapper** around `@asoc/sdk`:
- `middleware.ts`: Core x402 enforcement logic
- `vercel-ai.ts`: AI SDK integration helpers
- Should remain framework-agnostic where possible

## Questions?

Open an issue or reach out at https://github.com/asoc-trust/asoc-core/discussions
