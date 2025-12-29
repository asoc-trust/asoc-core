# Basic x402 Handshake Example

Complete demonstration of the A-SOC x402 trust handshake between buyer and seller agents.

## What This Demonstrates

1. **Agent Seller** - Service provider protected by A-SOC Trust Proxy
2. **Agent Buyer** - Service consumer presenting audit tickets
3. **x402 Flow** - Payment-required handshake with trust verification

## Architecture

```
┌─────────────────┐                           ┌─────────────────┐
│  Agent Buyer    │                           │  Agent Seller   │
│  (Consumer)     │                           │  (Provider)     │
└────────┬────────┘                           └────────┬────────┘
         │                                              │
         │  1. POST /execute (no X-ASOC-Proof)         │
         │─────────────────────────────────────────────>│
         │                                              │
         │  2. 402 Payment Required                    │
         │<─────────────────────────────────────────────│
         │     (requires X-ASOC-Proof header)          │
         │                                              │
         │  3. Generate Audit Ticket                   │
         │     (from A-SOC service)                    │
         │                                              │
         │  4. POST /execute WITH X-ASOC-Proof         │
         │─────────────────────────────────────────────>│
         │                                              │
         │           ┌────────────────────┐             │
         │           │  Trust Proxy       │             │
         │           │  • Validate JWT    │             │
         │           │  • Check expiry    │             │
         │           │  • Enforce limits  │             │
         │           └────────────────────┘             │
         │                                              │
         │  5. 200 OK + Service Result                 │
         │<─────────────────────────────────────────────│
         │                                              │
```

## Running the Example

### Option 1: Run Everything (Recommended)

The easiest way to see the handshake in action is to run both agents concurrently:

```bash
cd examples/basic-x402
npm run dev
```

This will:
1. Start the Seller Agent on port 3001
2. Start the Buyer Agent
3. Execute the transaction automatically

### Option 2: Run Manually

**Terminal 1: Start Agent Seller**

```bash
cd examples/basic-x402
npm run dev:seller
```

**Terminal 2: Run Agent Buyer**

```bash
cd examples/basic-x402
npm run dev:buyer
```

## Configuration

For this example, we use a hardcoded secret key (`dev-secret-key-change-in-production`) to make it run out-of-the-box. In a real application, you would load this from environment variables.

See `src/agent-seller.ts` and `src/agent-buyer.ts` to see how the `TicketIssuer` is initialized.

The seller starts on port **3001** with A-SOC protection enabled.

### Terminal 2: Start Agent Buyer

```bash
cd examples/basic-x402
npm run dev:buyer
```

The buyer will execute 3 test scenarios:

1. ❌ Request **without** X-ASOC-Proof → 402 Payment Required
2. ✅ Request **with** valid proof → 200 OK
3. ❌ Request **exceeding** constraints → 403 Forbidden

## Example Output

### Agent Seller (Terminal 1)

```
╔═══════════════════════════════════════════════════════════╗
║              Agent Seller (Service Provider)              ║
╠═══════════════════════════════════════════════════════════╣
║  Status:    RUNNING                                       ║
║  Port:      3001                                          ║
║  Endpoint:  http://localhost:3001/api/agent/execute      ║
╠═══════════════════════════════════════════════════════════╣
║  Protection: A-SOC Trust Proxy ENABLED                    ║
║  Requires:   X-ASOC-Proof header with valid ticket       ║
╚═══════════════════════════════════════════════════════════╝

✅ Validated agent: agent-12345 (Gold)

🤖 Agent Seller: Executing task for agent-12345
   Task: analyze-portfolio
   Audit Level: Gold
   Max Transaction Value: $50
```

### Agent Buyer (Terminal 2)

```
╔═══════════════════════════════════════════════════════════╗
║              Agent Buyer (Service Consumer)               ║
╠═══════════════════════════════════════════════════════════╣
║  Agent ID:  agent-12345                                   ║
║  Target:    http://localhost:3001/api/agent/execute      ║
╚═══════════════════════════════════════════════════════════╝

📋 Step 1: Generate A-SOC Audit Ticket
   ✅ Ticket issued (valid for 5 minutes)

❌ Attempt 1: Request WITHOUT X-ASOC-Proof
   Status: 402 Payment Required
   Response: {
     "error": "Payment Required",
     "code": 402,
     "message": "X-ASOC-Proof header required for agent transaction"
   }

✅ Attempt 2: Request WITH X-ASOC-Proof
   Status: 200 OK
   Response: {
     "success": true,
     "task": "analyze-portfolio",
     "agent_id": "agent-12345",
     "result": "Processed \"analyze-portfolio\"...",
     "cost": 25
   }

❌ Attempt 3: Request EXCEEDING max_op_value
   Status: 403 Forbidden
   Response: {
     "error": "Forbidden",
     "message": "Transaction value $75 exceeds limit $50",
     "error_code": "CONSTRAINT_VIOLATION"
   }
```

## Key Concepts

### X-ASOC-Proof Header

```http
POST /api/agent/execute HTTP/1.1
Host: localhost:3001
Content-Type: application/json
X-ASOC-Proof: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "task": "analyze-portfolio",
  "amount": 25.0,
  "mcp_server": "finance-node"
}
```

### Ticket Constraints Enforcement

The Trust Proxy automatically validates:

- ✅ JWT signature and expiry
- ✅ `amount` ≤ `constraints.max_op_value`
- ✅ `mcp_server` in `constraints.allowed_mcp_servers`
- ✅ `kill_switch_active` is `false`

### Error Responses

**402 Payment Required**
```json
{
  "error": "Payment Required",
  "code": 402,
  "message": "X-ASOC-Proof header required for agent transaction",
  "payment_context": {
    "required_proof": "X-ASOC-Proof",
    "issuer_endpoint": "https://asoc-authority.com/issue-ticket"
  }
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "code": 403,
  "message": "Agent certification validation failed",
  "reason": "Transaction value $75 exceeds limit $50",
  "error_code": "CONSTRAINT_VIOLATION"
}
```

## Customization

### Change Transaction Amount

Edit `agent-buyer.ts`:

```typescript
body: JSON.stringify({
  task: 'analyze-portfolio',
  amount: 10.0, // Change this value
  mcp_server: 'finance-node',
})
```

### Modify Constraints

Edit `agent-buyer.ts`:

```typescript
const ticket = issuer.generateTicket({
  agentId: BUYER_AGENT_ID,
  auditLevel: 'Platinum', // Upgrade tier
  constraints: {
    max_op_value: 100.0, // Increase limit
    allowed_mcp_servers: ['*'], // Allow all
    kill_switch_active: false,
  },
});
```

### Test Kill Switch

```typescript
const ticket = issuer.generateTicket({
  agentId: BUYER_AGENT_ID,
  auditLevel: 'Gold',
  constraints: {
    max_op_value: 50.0,
    allowed_mcp_servers: ['finance-node'],
    kill_switch_active: true, // ⚠️ Activate kill switch
  },
});
```

Result: **403 Forbidden** with `KILL_SWITCH` error code

## Next Steps

1. **Integrate with MCP Server**: Query agent certification before issuing tickets
2. **Add Payment Flow**: Implement actual USDC/stablecoin transfers
3. **Real-time Monitoring**: Track validation success/failure rates
4. **WebSocket Support**: Enable persistent agent-to-agent connections
5. **Production Keys**: Use RSA signatures instead of HMAC
