# A-SOC: Agent Security Operations Center

> **Trust Infrastructure for the Agent Economy**

A-SOC provides sub-second, cryptographically verifiable trust auditing for autonomous AI agents conducting financial transactions via the x402 protocol. We're building the "Visa of Trust" for the agent economy.

## 🎯 Vision

Bridge the gap between "Wild West" AI developers and risk-averse enterprises by providing:

- **Real-time Trust Verification**: Sub-second JWT-based audit tickets
- **Standardized Agent Registry**: MCP-based discovery and certification
- **Compliance Automation**: Automated MVA (Minimum Viable Audit) checks
- **Insurance Readiness**: Behavioral traces for underwriting autonomous agents

## 🔓 Open Source Strategy ("The Trojan Horse")

We believe that trust infrastructure must be transparent to be adopted, but verification must be robust to be trusted.

### The "Handshake" (Open Source)
We open source the core infrastructure to allow universal adoption:
- **SDK/Middleware** (`@asoc/ticket-issuer`, `@asoc/trust-proxy`): The libraries agents use to request and verify tickets.
- **MCP Server** (`@asoc/mcp-server`): The standard interface for agents to "check in" for safety scans.

### The "Vault" (Enterprise)
We maintain the integrity of the network through our hosted services:
- **Attestation Engine**: The verification logic that detects hallucinations and PII leaks.
- **Registry & Dashboard**: The "Safety Page" and legal "Flight Recorder" for enterprise compliance.

## 🏗️ Architecture

### Packages

- **`@asoc/sdk`**: JWT-based audit ticket generation and validation
- **`@asoc/trust-proxy`**: Express middleware for x402 transaction validation
- **`@asoc/mcp-server`**: MCP audit server for agent discovery and certification

### The A-SOC x402 Handshake

```
Agent A (Buyer)          A-SOC Trust Proxy          Agent B (Seller)
     |                          |                          |
     |--- 402 Request --------->|                          |
     |                          |                          |
     |<-- X-ASOC-Proof needed --|                          |
     |                          |                          |
     |--- X-ASOC-Proof -------->|                          |
     |    (JWT Ticket)          |                          |
     |                          |                          |
     |                    [Verify Signature]               |
     |                    [Check Constraints]              |
     |                    [Validate Expiry]                |
     |                          |                          |
     |                          |--- Execute Payment ----->|
     |                          |                          |
     |<----------------------- Success -------------------->|
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run MCP server
cd packages/mcp-server
npm run dev

# Run example integration
cd examples/basic-x402
npm run dev
```

## 📦 Audit Ticket Structure

```typescript
{
  "iss": "asoc-authority.com",
  "sub": "agent-id-12345",
  "iat": 1734567890,
  "exp": 1734568190,  // 5-minute validity
  "audit_level": "Gold",
  "constraints": {
    "max_op_value": 50.00,
    "allowed_mcp_servers": ["finance-node", "legal-node"],
    "kill_switch_active": false
  },
  "sig": "0x7b2f..."
}
```

## 🛡️ MVA: Minimum Viable Audit

Level 1 certification requires:

1. **Fiscal Hard-Cap**: Code-level spending limits
2. **Prompt Sandbox**: Red-teamed prompt injection protection
3. **Identity Proof**: Verified AgentCard with domain signature
4. **PII Scrubbing**: Automatic data redaction middleware
5. **Kill Switch**: Instant API key/wallet revocation

## 🔧 Development

```bash
# Watch mode for all packages
npm run dev

# Run tests
npm run test

# Lint
npm run lint

# Clean build artifacts
npm run clean
```

## 📖 Documentation

- [Trust Proxy Integration Guide](./packages/trust-proxy/README.md)
- [MCP Server API Reference](./packages/mcp-server/README.md)
- [A-SOC SDK](./packages/sdk/README.md)

## 🤝 Contributing

We welcome contributions to our open source packages (`packages/*`). Please see the LICENSE file for details.

## 📄 License

This project follows a hybrid licensing model:
- **Open Source**: `packages/*` are available under the MIT License.
- **Proprietary**: `apps/dashboard` and hosted services are closed source.
