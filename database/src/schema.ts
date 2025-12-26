import { pgTable, serial, text, integer, boolean, timestamp, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(()=> user.id)
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(()=> user.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at")
});

export const agents = pgTable('agents', {
  id: text('id').primaryKey(), // Agent ID (DID or UUID)
  name: text('name').notNull(),
  organization: text('organization').notNull(),
  version: text('version').notNull(),
  trustScore: integer('trust_score').default(0),
  auditLevel: text('audit_level').default('Bronze'), // Bronze, Silver, Gold, Platinum
  killSwitchActive: boolean('kill_switch_active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: jsonb('metadata'),
});

export const certifications = pgTable('certifications', {
  id: serial('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id),
  level: text('level').notNull(),
  issuedAt: timestamp('issued_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  issuer: text('issuer').notNull(),
  mvaLevel: integer('mva_level').default(1),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id),
  action: text('action').notNull(),
  resource: text('resource'),
  cost: doublePrecision('cost').default(0.0),
  success: boolean('success').default(true),
  timestamp: timestamp('timestamp').defaultNow(),
  details: jsonb('details'),
});

export const healthMetrics = pgTable('health_metrics', {
  id: serial('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id),
  uptimePercentage: doublePrecision('uptime_percentage'),
  errorRate: doublePrecision('error_rate'),
  avgLatencyMs: integer('avg_latency_ms'),
  recordedAt: timestamp('recorded_at').defaultNow(),
});

export const agentsRelations = relations(agents, ({ many }) => ({
  certifications: many(certifications),
  auditLogs: many(auditLogs),
  healthMetrics: many(healthMetrics),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  agent: one(agents, {
    fields: [certifications.agentId],
    references: [agents.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  agent: one(agents, {
    fields: [auditLogs.agentId],
    references: [agents.id],
  }),
}));

export const healthMetricsRelations = relations(healthMetrics, ({ one }) => ({
  agent: one(agents, {
    fields: [healthMetrics.agentId],
    references: [agents.id],
  }),
}));
