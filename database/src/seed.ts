import dotenv from 'dotenv';
import { db } from './db.js';
import { agents, certifications, healthMetrics } from './schema.js';

async function seed() {
  console.log('Seeding database...');

  // Agent 1: Gold Tier
  await db.insert(agents).values({
    id: 'agent-12345',
    name: 'Finance Agent Alpha',
    organization: 'Acme AI Corp',
    version: '1.0.0',
    trustScore: 85,
    auditLevel: 'Gold',
    killSwitchActive: false,
    metadata: {
      description: 'Autonomous trading and portfolio management agent',
      capabilities: ['trading', 'portfolio-analysis', 'risk-assessment'],
      verified_domain: 'acmeai.com',
      constraints: {
        max_op_value: 100.0,
        allowed_mcp_servers: ['finance-node', 'trading-node', 'legal-node'],
        max_ops_per_hour: 1000,
      },
    },
  }).onConflictDoNothing();

  await db.insert(certifications).values({
    agentId: 'agent-12345',
    level: 'Gold',
    issuer: 'asoc-authority.com',
    mvaLevel: 5,
    issuedAt: new Date(Date.now() - 86400000 * 30), // 30 days ago
    expiresAt: new Date(Date.now() + 86400000 * 335), // 335 days from now
  });

  await db.insert(healthMetrics).values({
    agentId: 'agent-12345',
    uptimePercentage: 99.8,
    avgLatencyMs: 120,
    errorRate: 0.002,
    recordedAt: new Date(),
  });

  // Agent 2: Silver Tier
  await db.insert(agents).values({
    id: 'agent-67890',
    name: 'Customer Service Bot',
    organization: 'Beta Bots Inc',
    version: '1.0.0',
    trustScore: 68,
    auditLevel: 'Silver',
    killSwitchActive: false,
    metadata: {
      description: 'AI customer support agent',
      capabilities: ['customer-support', 'ticket-management', 'sentiment-analysis'],
      constraints: {
        max_op_value: 10.0,
        allowed_mcp_servers: ['support-node', 'crm-node'],
        max_ops_per_hour: 500,
      },
    },
  }).onConflictDoNothing();

  await db.insert(certifications).values({
    agentId: 'agent-67890',
    level: 'Silver',
    issuer: 'asoc-authority.com',
    mvaLevel: 3,
    issuedAt: new Date(Date.now() - 86400000 * 15),
    expiresAt: new Date(Date.now() + 86400000 * 350),
  });

  await db.insert(healthMetrics).values({
    agentId: 'agent-67890',
    uptimePercentage: 98.5,
    avgLatencyMs: 250,
    errorRate: 0.012,
    recordedAt: new Date(),
  });

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
