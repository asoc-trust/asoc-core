import { Request, Response, NextFunction } from 'express';
import { TicketIssuer, ValidationResult } from '@asoc/sdk';

/**
 * Configuration for the trust proxy middleware
 */
export interface TrustProxyConfig {
  /** Ticket issuer instance for validation */
  issuer: TicketIssuer;
  
  /** Custom header name for the audit proof (default: 'x-asoc-proof') */
  headerName?: string;
  
  /** Whether to require audit proof for all requests (default: true) */
  requireProof?: boolean;
  
  /** Custom error handler */
  onError?: (error: TrustProxyError, req: Request, res: Response) => void;
  
  /** Custom success handler (for logging/metrics) */
  onSuccess?: (result: ValidationResult, req: Request) => void;
  
  /** Whether to extract transaction value from request (default: true) */
  validateTransactionValue?: boolean;
  
  /** Path to transaction value in request body (default: 'amount') */
  transactionValuePath?: string;
  
  /** Path to MCP server name in request body (default: 'mcp_server') */
  mcpServerPath?: string;
}

/**
 * Extended Express Request with A-SOC audit data
 */
export interface AsocRequest extends Request {
  asoc?: {
    /** Validated audit ticket payload */
    ticket: ValidationResult['payload'];
    
    /** Agent ID from the ticket */
    agentId: string;
    
    /** Audit level of the certified agent */
    auditLevel: string;
  };
}

/**
 * Trust Proxy error types
 */
export class TrustProxyError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TrustProxyError';
  }
}

/**
 * Response format for 402 Payment Required with A-SOC context
 */
export interface Payment402Response {
  error: string;
  code: 402;
  message: string;
  payment_context: {
    required_proof: 'X-ASOC-Proof';
    issuer_endpoint?: string;
    documentation?: string;
  };
}

/**
 * Response format for 403 Forbidden (failed validation)
 */
export interface Forbidden403Response {
  error: string;
  code: 403;
  message: string;
  reason: string;
  error_code: string;
}
