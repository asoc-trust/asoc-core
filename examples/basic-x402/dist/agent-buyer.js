import fetch from 'node-fetch';
import { TicketIssuer } from '@asoc/sdk';
const SELLER_URL = 'http://localhost:3001/api/agent/execute';
const ASOC_SECRET = 'dev-secret-key-change-in-production';
// Agent Buyer credentials
const BUYER_AGENT_ID = 'agent-12345';
/**
 * Simulate Agent Buyer requesting service from Agent Seller
 */
async function runBuyerAgent() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║              Agent Buyer (Service Consumer)               ║
╠═══════════════════════════════════════════════════════════╣
║  Agent ID:  ${BUYER_AGENT_ID}                            ║
║  Target:    ${SELLER_URL}              ║
╚═══════════════════════════════════════════════════════════╝
  `);
    // Wait for seller to start
    await delay(2000);
    // Initialize ticket issuer (in production, this would be an A-SOC service)
    const issuer = new TicketIssuer({
        signingKey: ASOC_SECRET,
        issuer: 'asoc-authority.com',
    });
    console.log('\n📋 Step 1: Generate A-SOC Audit Ticket');
    console.log('   (In production, this calls A-SOC certification service)');
    // Generate audit ticket
    const ticket = issuer.generateTicket({
        agentId: BUYER_AGENT_ID,
        auditLevel: 'Gold',
        constraints: {
            max_op_value: 50.0,
            allowed_mcp_servers: ['finance-node', 'trading-node'],
            kill_switch_active: false,
        },
        validityDuration: 300, // 5 minutes
    });
    console.log(`   ✅ Ticket issued (valid for 5 minutes)`);
    console.log(`   Preview: ${ticket.substring(0, 50)}...`);
    // Attempt 1: Request without proof (should fail with 402)
    console.log('\n\n❌ Attempt 1: Request WITHOUT X-ASOC-Proof');
    try {
        const response1 = await fetch(SELLER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'analyze-portfolio',
                amount: 25.0,
                parameters: { symbols: ['AAPL', 'GOOGL'] },
            }),
        });
        const result1 = await response1.json();
        console.log(`   Status: ${response1.status} ${response1.statusText}`);
        console.log(`   Response:`, JSON.stringify(result1, null, 2));
    }
    catch (error) {
        console.error(`   Error: ${error.message}`);
    }
    await delay(1000);
    // Attempt 2: Request WITH valid proof (should succeed)
    console.log('\n\n✅ Attempt 2: Request WITH X-ASOC-Proof');
    try {
        const response2 = await fetch(SELLER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ASOC-Proof': ticket,
            },
            body: JSON.stringify({
                task: 'analyze-portfolio',
                amount: 25.0,
                mcp_server: 'finance-node',
                parameters: { symbols: ['AAPL', 'GOOGL'] },
            }),
        });
        const result2 = await response2.json();
        console.log(`   Status: ${response2.status} ${response2.statusText}`);
        console.log(`   Response:`, JSON.stringify(result2, null, 2));
    }
    catch (error) {
        console.error(`   Error: ${error.message}`);
    }
    await delay(1000);
    // Attempt 3: Request exceeding constraints (should fail)
    console.log('\n\n❌ Attempt 3: Request EXCEEDING max_op_value');
    try {
        const response3 = await fetch(SELLER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ASOC-Proof': ticket,
            },
            body: JSON.stringify({
                task: 'execute-trade',
                amount: 75.0, // Exceeds max of $50
                mcp_server: 'trading-node',
                parameters: { action: 'BUY', symbol: 'TSLA' },
            }),
        });
        const result3 = await response3.json();
        console.log(`   Status: ${response3.status} ${response3.statusText}`);
        console.log(`   Response:`, JSON.stringify(result3, null, 2));
    }
    catch (error) {
        console.error(`   Error: ${error.message}`);
    }
    console.log('\n\n' + '═'.repeat(63));
    console.log('                    Demo Complete');
    console.log('═'.repeat(63));
    console.log('\n✨ Key Takeaways:');
    console.log('   • X-ASOC-Proof header is REQUIRED for protected endpoints');
    console.log('   • Tickets enforce max_op_value constraints automatically');
    console.log('   • Sub-second validation enables real-time agent economy');
    console.log('   • Kill switches and expiry protect against abuse\n');
    process.exit(0);
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
runBuyerAgent().catch(console.error);
//# sourceMappingURL=agent-buyer.js.map