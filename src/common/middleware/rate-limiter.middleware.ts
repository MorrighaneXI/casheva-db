import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RateLimiter');
  private readonly ipRequests = new Map<string, RateLimitRecord>();
  private readonly loginAttempts = new Map<string, RateLimitRecord>();

  // Konfigurasi batas request
  private readonly GENERAL_LIMIT = 180; // 180 request per menit untuk endpoint umum
  private readonly GENERAL_WINDOW = 60 * 1000; // 1 menit

  private readonly LOGIN_LIMIT = 10; // 10 percobaan login per menit per IP
  private readonly LOGIN_WINDOW = 60 * 1000; // 1 menit

  constructor() {
    // Bersihkan memori cache berkala setiap 5 menit
    setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.ipRequests.entries()) {
        if (now > record.resetTime) {
          this.ipRequests.delete(ip);
        }
      }
      for (const [ip, record] of this.loginAttempts.entries()) {
        if (now > record.resetTime) {
          this.loginAttempts.delete(ip);
        }
      }
    }, 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // 1. Proteksi Khusus Brute-Force pada Endpoint Login
    const isLoginRoute = req.path.includes('/auth/login') && req.method === 'POST';
    if (isLoginRoute) {
      let loginRecord = this.loginAttempts.get(ip);
      if (!loginRecord || now > loginRecord.resetTime) {
        loginRecord = { count: 1, resetTime: now + this.LOGIN_WINDOW };
        this.loginAttempts.set(ip, loginRecord);
      } else {
        loginRecord.count++;
        if (loginRecord.count > this.LOGIN_LIMIT) {
          const retryAfterSec = Math.ceil((loginRecord.resetTime - now) / 1000);
          this.logger.warn(`[RATE LIMIT EXCEEDED] Terlalu banyak percobaan login dari IP: ${ip}`);
          res.setHeader('Retry-After', retryAfterSec);
          return res.status(429).json({
            statusCode: 429,
            error: 'TOO_MANY_REQUESTS',
            message: `Terlalu banyak percobaan login. Silakan tunggu ${retryAfterSec} detik sebelum mencoba lagi.`,
          });
        }
      }
    }

    // 2. Proteksi Anti-DDoS untuk seluruh API
    let generalRecord = this.ipRequests.get(ip);
    if (!generalRecord || now > generalRecord.resetTime) {
      generalRecord = { count: 1, resetTime: now + this.GENERAL_WINDOW };
      this.ipRequests.set(ip, generalRecord);
    } else {
      generalRecord.count++;
      if (generalRecord.count > this.GENERAL_LIMIT) {
        const retryAfterSec = Math.ceil((generalRecord.resetTime - now) / 1000);
        this.logger.warn(`[RATE LIMIT EXCEEDED] Traffic rate limit melebihi batas dari IP: ${ip} | Path: ${req.path}`);
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          statusCode: 429,
          error: 'TOO_MANY_REQUESTS',
          message: `Batas frekuensi permintaan terlampaui (Anti-DDoS Protection). Silakan tunggu ${retryAfterSec} detik.`,
        });
      }
    }

    // Sertakan rate limit headers
    res.setHeader('X-RateLimit-Limit', this.GENERAL_LIMIT);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.GENERAL_LIMIT - generalRecord.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(generalRecord.resetTime / 1000));

    next();
  }
}
