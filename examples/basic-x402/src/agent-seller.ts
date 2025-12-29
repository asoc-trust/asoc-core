import express from 'express';
import { createTrustProxy, AsocRequest } from '@asoc/trust-proxy';
import { TicketIssuer } from '@asoc/sdk';

const PORT = 3001;
const ASOC_SECRET = 'dev-secret-key-change-in-production';

// Initialize ticket issuer
const issuer = new TicketIssuer({
  signingKey: ASOC_SECRET,
  issuer: 'asoc-authority.com',
  algorithm: 'HS256',
});

const app = express();
app.use(express.json());

// Apply A-SOC trust proxy to all agent endpoints
app.use(
  '/api/agent',
  createTrustProxy({
    issuer,
    onSuccess: (result, req) => {
      console.log(`✅ Validated agent: ${result.payload?.sub} (${result.payload?.audit_level})`);
    },
    onError: (error, req, res) => {
      console.log(`❌ Validation failed: ${error.message} (${error.errorCode})`);
      res.status(error.statusCode).json({
        error: error.message,
        code: error.errorCode,
      });
    },
  })
);

/**
 * Agent Seller Endpoint: Execute AI Service
 * 
 * This endpoint requires a valid X-ASOC-Proof header.
 * Simulates an AI agent performing work after payment verification.
 */
app.post('/api/agent/execute', (req: AsocRequest, res) => {
  const { task, parameters } = req.body;
  const { agentId, auditLevel, ticket } = req.asoc!;

  console.log(`\n🤖 Agent Seller: Executing task for ${agentId}`);
  console.log(`   Task: ${task}`);
  console.log(`   Audit Level: ${auditLevel}`);
  console.log(`   Max Transaction Value: $${ticket?.constraints.max_op_value}`);

  // Simulate work
  const result = {
    success: true,
    task,
    agent_id: agentId,
    result: `Processed "${task}" with parameters: ${JSON.stringify(parameters)}`,
    timestamp: new Date().toISOString(),
    cost: req.body.amount || 0,
  };

  res.json(result);
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    role: 'agent-seller',
    port: PORT,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              Agent Seller (Service Provider)              ║
╠═══════════════════════════════════════════════════════════╣
║  Status:    RUNNING                                       ║
║  Port:      ${PORT}                                       ║
║  Endpoint:  http://localhost:${PORT}/api/agent/execute   ║
╠═══════════════════════════════════════════════════════════╣
║  Protection: A-SOC Trust Proxy ENABLED                    ║
║  Requires:   X-ASOC-Proof header with valid ticket       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
