import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger('CSRF');

  // Allowed trusted domains (localhost dev & local networks)
  private readonly allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // Safe idempotent methods do not need CSRF validation
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Bypass for Swagger API Docs and public login
    const reqPath = req.originalUrl || req.path || req.url || '';
    if (reqPath.includes('/docs') || reqPath.includes('/auth/login')) {
      return next();
    }

    const origin = req.headers['origin'] as string;
    const referer = req.headers['referer'] as string;
    const requestedWith = req.headers['x-requested-with'] as string;
    const csrfToken = req.headers['x-csrf-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    // 1. If Bearer Token or custom header (X-Requested-With / X-CSRF-Token) is present, request is verified SPA/API client
    const hasCustomHeader =
      Boolean(requestedWith) ||
      Boolean(csrfToken) ||
      (Boolean(authHeader) && authHeader.startsWith('Bearer '));

    // 2. Origin / Referer check if provided
    if (origin) {
      const isAllowedOrigin = this.allowedOrigins.some(
        (allowed) => origin === allowed || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'),
      );
      if (!isAllowedOrigin && !hasCustomHeader) {
        this.logger.warn(`[CSRF BLOCKED] Permintaan dari Origin tidak dikenal: ${origin} | Path: ${req.path}`);
        return res.status(403).json({
          statusCode: 403,
          error: 'CSRF_BLOCKED',
          message: 'Permintaan ditolak: Origin sumber tidak diizinkan oleh kebijakan keamanan CSRF.',
        });
      }
    }

    // 3. Reject mutating requests with no authentication and no anti-CSRF signal
    if (!hasCustomHeader && !origin && !referer) {
      this.logger.warn(`[CSRF BLOCKED] Permintaan mutasi tanpa proteksi CSRF / Auth Header | Path: ${req.path}`);
      return res.status(403).json({
        statusCode: 403,
        error: 'CSRF_BLOCKED',
        message: 'Akses ditolak: Diperlukan header keamanan X-Requested-With atau Authorization.',
      });
    }

    next();
  }
}
