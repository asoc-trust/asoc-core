import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TicketIssuer } from '@asoc/ticket-issuer';
import {
  AgentRecord,
  TrustScore,
  VerifyAgentRequest,
  IssueTicketRequest,
  QueryAgentsRequest,
  KillSwitchRequest,
} from './types.js';

/**
 * In-memory agent registry (replace with database in production)
 */
class AgentRegistry {
  private agents: Map<string, AgentRecord> = new Map();

  constructor() {
    // Seed with demo agents
    this.seedDemoAgents();
  }

  private seedDemoAgents() {
    const demoAgents: AgentRecord[] = [
      {
        agentId: 'agent-12345',
        auditLevel: 'Gold',
        trustScore: 85,
        organization: 'Acme AI Corp',
        metadata: {
          name: 'Finance Agent Alpha',
          description: 'Autonomous trading and portfolio management agent',
          capabilities: ['trading', 'portfolio-analysis', 'risk-assessment'],
          verified_domain: 'acmeai.com',
        },
        certification: {
          certified_at: Date.now() - 86400000 * 30, // 30 days ago
          expires_at: Date.now() + 86400000 * 335, // 335 days from now
          certifier: 'asoc-authority.com',
          mva_level: 5,
        },
        health: {
          uptime_percentage: 99.8,
          avg_latency_ms: 120,
          error_rate: 0.002,
          total_transactions: 15420,
          last_active: Date.now() - 3600000, // 1 hour ago
        },
        killSwitchActive: false,
        constraints: {
          max_op_value: 100.0,
          allowed_mcp_servers: ['finance-node', 'trading-node', 'legal-node'],
          max_ops_per_hour: 1000,
        },
      },
      {
        agentId: 'agent-67890',
        auditLevel: 'Silver',
        trustScore: 68,
        organization: 'Beta Bots Inc',
        metadata: {
          name: 'Customer Service Bot',
          description: 'AI customer support agent',
          capabilities: ['customer-support', 'ticket-management', 'sentiment-analysis'],
        },
        certification: {
          certified_at: Date.now() - 86400000 * 15,
          expires_at: Date.now() + 86400000 * 350,
          certifier: 'asoc-authority.com',
          mva_level: 3,
        },
        health: {
          uptime_percentage: 98.5,
          avg_latency_ms: 250,
          error_rate: 0.012,
          total_transactions: 8920,
          last_active: Date.now() - 7200000, // 2 hours ago
        },
        killSwitchActive: false,
        constraints: {
          max_op_value: 10.0,
          allowed_mcp_servers: ['support-node', 'crm-node'],
          max_ops_per_hour: 500,
        },
      },
    ];

    demoAgents.forEach((agent) => this.agents.set(agent.agentId, agent));
  }

  getAgent(agentId: string): AgentRecord | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentRecord[] {
    return Array.from(this.agents.values());
  }

  updateAgent(agentId: string, updates: Partial<AgentRecord>) {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.set(agentId, { ...agent, ...updates });
    }
  }

  activateKillSwitch(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.killSwitchActive = true;
      agent.constraints.max_op_value = 0; // Prevent all transactions
    }
  }
}

/**
 * Creates and configures the A-SOC MCP server
 */
export function createAsocMcpServer(issuer: TicketIssuer) {
  const registry = new AgentRegistry();

  const server = new McpServer({
    name: 'asoc-audit-server',
    version: '0.1.0',
  });

  /**
   * Tool: is_agent_certified
   * 
   * Quick boolean check if an agent is currently certified
   */
  server.registerTool(
    'is_agent_certified',
    {
      title: 'Check Agent Certification',
      description: 'Verify if an agent has valid A-SOC certification',
      inputSchema: {
        agentId: z.string().describe('The agent ID to check'),
      },
      outputSchema: {
        certified: z.boolean(),
        agentId: z.string(),
        auditLevel: z.string().optional(),
        expiresAt: z.number().optional(),
        killSwitchActive: z.boolean().optional(),
      },
    },
    async ({ agentId }) => {
      const agent = registry.getAgent(agentId);

      if (!agent) {
        const output = { certified: false, agentId };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const now = Date.now();
      const isCertified =
        agent.certification.expires_at > now && !agent.killSwitchActive;

      const output = {
        certified: isCertified,
        agentId: agent.agentId,
        auditLevel: agent.auditLevel,
        expiresAt: agent.certification.expires_at,
        killSwitchActive: agent.killSwitchActive,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  /**
   * Tool: get_trust_score
   * 
   * Calculate and return detailed trust score for an agent
   */
  server.registerTool(
    'get_trust_score',
    {
      title: 'Get Agent Trust Score',
      description: 'Calculate comprehensive trust score with behavioral factors',
      inputSchema: VerifyAgentRequest.shape,
      outputSchema: {
        agentId: z.string(),
        score: z.number(),
        level: z.string(),
        factors: z.object({
          certification: z.number(),
          behavioral_health: z.number(),
          transaction_history: z.number(),
          domain_verification: z.number(),
        }),
        recommendation: z.enum(['approve', 'review', 'reject']),
        details: z.any().optional(),
      },
    },
    async ({ agentId, includeHealth }) => {
      const agent = registry.getAgent(agentId);

      if (!agent) {
        const output = {
          agentId,
          score: 0,
          level: 'None',
          factors: {
            certification: 0,
            behavioral_health: 0,
            transaction_history: 0,
            domain_verification: 0,
          },
          recommendation: 'reject' as const,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      // Calculate trust factors
      const certificationScore = agent.killSwitchActive
        ? 0
        : (agent.certification.mva_level / 5) * 100;

      const healthScore =
        agent.health.uptime_percentage * 0.4 +
        (1 - agent.health.error_rate) * 100 * 0.3 +
        Math.max(0, 100 - agent.health.avg_latency_ms / 5) * 0.3;

      const txScore = Math.min(
        100,
        (agent.health.total_transactions / 10000) * 100
      );

      const domainScore = agent.metadata.verified_domain ? 100 : 50;

      const trustScore: TrustScore = {
        agentId: agent.agentId,
        score: agent.trustScore,
        level: agent.auditLevel,
        factors: {
          certification: Math.round(certificationScore),
          behavioral_health: Math.round(healthScore),
          transaction_history: Math.round(txScore),
          domain_verification: domainScore,
        },
        recommendation:
          agent.trustScore >= 80
            ? 'approve'
            : agent.trustScore >= 60
            ? 'review'
            : 'reject',
      };

      const output = includeHealth
        ? { ...trustScore, details: agent.health }
        : trustScore;

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  /**
   * Tool: issue_audit_ticket
   * 
   * Generate a signed audit ticket for a certified agent
   */
  server.registerTool(
    'issue_audit_ticket',
    {
      title: 'Issue Audit Ticket',
      description: 'Generate a signed JWT audit ticket for x402 transactions',
      inputSchema: IssueTicketRequest.shape,
      outputSchema: {
        success: z.boolean(),
        ticket: z.string().optional(),
        agentId: z.string(),
        expiresIn: z.number().optional(),
        error: z.string().optional(),
      },
    },
    async ({ agentId, validitySeconds = 300 }) => {
      const agent = registry.getAgent(agentId);

      if (!agent) {
        const output = {
          success: false,
          agentId,
          error: 'Agent not found in registry',
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      if (agent.killSwitchActive) {
        const output = {
          success: false,
          agentId,
          error: 'Agent kill switch is active',
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      // Generate ticket
      const ticket = issuer.generateTicket({
        agentId: agent.agentId,
        auditLevel: agent.auditLevel,
        constraints: {
          ...agent.constraints,
          kill_switch_active: false,
        },
        validityDuration: validitySeconds,
        metadata: {
          organization: agent.organization,
          trust_score: agent.trustScore,
        },
      });

      const output = {
        success: true,
        ticket,
        agentId: agent.agentId,
        expiresIn: validitySeconds,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  /**
   * Tool: query_agents
   * 
   * Search for agents by criteria
   */
  server.registerTool(
    'query_agents',
    {
      title: 'Query Certified Agents',
      description: 'Search for agents by trust score, audit level, or capabilities',
      inputSchema: QueryAgentsRequest.shape,
      outputSchema: {
        results: z.array(
          z.object({
            agentId: z.string(),
            organization: z.string(),
            auditLevel: z.string(),
            trustScore: z.number(),
            capabilities: z.array(z.string()),
          })
        ),
        total: z.number(),
      },
    },
    async ({ minTrustScore = 0, auditLevel, capabilities, limit = 10 }) => {
      let agents = registry.getAllAgents();

      // Apply filters
      if (minTrustScore > 0) {
        agents = agents.filter((a) => a.trustScore >= minTrustScore);
      }

      if (auditLevel) {
        agents = agents.filter((a) => a.auditLevel === auditLevel);
      }

      if (capabilities && capabilities.length > 0) {
        agents = agents.filter((a) =>
          capabilities.every((cap) => a.metadata.capabilities.includes(cap))
        );
      }

      // Filter out kill-switched agents
      agents = agents.filter((a) => !a.killSwitchActive);

      const results = agents.slice(0, limit).map((a) => ({
        agentId: a.agentId,
        organization: a.organization,
        auditLevel: a.auditLevel,
        trustScore: a.trustScore,
        capabilities: a.metadata.capabilities,
      }));

      const output = { results, total: agents.length };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  /**
   * Tool: activate_kill_switch
   * 
   * Emergency disable an agent
   */
  server.registerTool(
    'activate_kill_switch',
    {
      title: 'Activate Kill Switch',
      description: 'Emergency disable an agent and revoke all tickets',
      inputSchema: KillSwitchRequest.shape,
      outputSchema: {
        success: z.boolean(),
        agentId: z.string(),
        timestamp: z.number(),
        reason: z.string(),
      },
    },
    async ({ agentId, reason, revokeTickets = true }) => {
      const agent = registry.getAgent(agentId);

      if (!agent) {
        const output = {
          success: false,
          agentId,
          timestamp: Date.now(),
          reason: 'Agent not found',
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      registry.activateKillSwitch(agentId);

      const output = {
        success: true,
        agentId,
        timestamp: Date.now(),
        reason,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  );

  return server;
}
