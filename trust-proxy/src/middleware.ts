import { Request, Response, NextFunction } from 'express';
import {
  TrustProxyConfig,
  AsocRequest,
  TrustProxyError,
  Payment402Response,
  Forbidden403Response,
} from './types.js';

/**
 * A-SOC Trust Proxy Middleware
 * 
 * Express middleware that validates X-ASOC-Proof headers for x402 payment flows.
 * Enforces cryptographic trust verification for agent-to-agent transactions.
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { createTrustProxy } from '@asoc/trust-proxy';
 * import { TicketIssuer } from '@asoc/sdk';
 * 
 * const app = express();
 * const issuer = new TicketIssuer({ ... });
 * 
 * app.use('/api/agent', createTrustProxy({ issuer }));
 * ```
 */
export function createTrustProxy(config: TrustProxyConfig) {
  const {
    issuer,
    headerName = 'x-asoc-proof',
    requireProof = true,
    validateTransactionValue = true,
    transactionValuePath = 'amount',
    mcpServerPath = 'mcp_server',
    onError,
    onSuccess,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract audit proof from headers
      const proofToken = req.headers[headerName.toLowerCase()] as string | undefined;

      // If no proof provided
      if (!proofToken) {
        if (requireProof) {
          const response: Payment402Response = {
            error: 'Payment Required',
            code: 402,
            message: 'X-ASOC-Proof header required for agent transaction',
            payment_context: {
              required_proof: 'X-ASOC-Proof',
              issuer_endpoint: 'https://asoc-authority.com/issue-ticket',
              documentation: 'https://docs.asoc.dev/x402-handshake',
            },
          };

          return res.status(402).json(response);
        }

        // If proof not required, continue without validation
        return next();
      }

      // Validate transaction constraints if enabled
      let validationResult;
      if (validateTransactionValue) {
        const transactionValue = getNestedProperty(req.body, transactionValuePath) as number | undefined;
        const mcpServer = getNestedProperty(req.body, mcpServerPath) as string | undefined;

        if (transactionValue !== undefined) {
          validationResult = await issuer.validateTransaction(
            proofToken,
            transactionValue,
            mcpServer
          );
        } else {
          validationResult = await issuer.validateTicket(proofToken);
        }
      } else {
        validationResult = await issuer.validateTicket(proofToken);
      }

      // Handle validation failure
      if (!validationResult.valid) {
        const error = new TrustProxyError(
          validationResult.error || 'Ticket validation failed',
          403,
          validationResult.errorCode || 'VALIDATION_FAILED',
          validationResult
        );

        if (onError) {
          return onError(error, req, res);
        }

        const response: Forbidden403Response = {
          error: 'Forbidden',
          code: 403,
          message: 'Agent certification validation failed',
          reason: validationResult.error || 'Unknown error',
          error_code: validationResult.errorCode || 'VALIDATION_FAILED',
        };

        return res.status(403).json(response);
      }

      // Attach audit data to request
      const asocReq = req as AsocRequest;
      asocReq.asoc = {
        ticket: validationResult.payload!,
        agentId: validationResult.payload!.sub,
        auditLevel: validationResult.payload!.audit_level,
      };

      // Success callback for metrics/logging
      if (onSuccess) {
        onSuccess(validationResult, req);
      }

      next();
    } catch (error) {
      const trustError = new TrustProxyError(
        'Internal trust proxy error',
        500,
        'INTERNAL_ERROR',
        error
      );

      if (onError) {
        return onError(trustError, req, res);
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Trust validation system error',
      });
    }
  };
}

/**
 * Utility to safely extract nested properties from objects
 */
function getNestedProperty(obj: any, path: string): unknown {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Pre-configured middleware for strict x402 enforcement
 */
export function strictTrustProxy(config: Omit<TrustProxyConfig, 'requireProof'>) {
  return createTrustProxy({
    ...config,
    requireProof: true,
    validateTransactionValue: true,
  });
}

/**
 * Pre-configured middleware for optional validation (logging mode)
 */
export function optionalTrustProxy(config: Omit<TrustProxyConfig, 'requireProof'>) {
  return createTrustProxy({
    ...config,
    requireProof: false,
    validateTransactionValue: false,
  });
}
