import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class WafMiddleware implements NestMiddleware {
  private readonly logger = new Logger('WAF');

  // Pola signature serangan siber populer
  private readonly sqliPatterns = [
    /(\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|drop\s+database|truncate\s+table|alter\s+table|exec\s*\(|execute\s*\()\b)/i,
    /('[\s]*or[\s]*['0-9a-z]+=[\s]*['0-9a-z]+|--[\s\r\n]|;\s*--|\/\*[\s\S]*?\*\/)/i,
    /(benchmark\s*\(\s*\d+\s*,|sleep\s*\(\s*\d+\s*\)|waitfor\s+delay)/i,
    /(\b(information_schema|sys\.tables|pg_catalog|pg_sleep)\b)/i,
  ];

  private readonly xssPatterns = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/i,
    /<[^>]+(javascript:|vbscript:|onload\s*=|onerror\s*=|onclick\s*=|onmouseover\s*=|onfocus\s*=|onblur\s*=|eval\s*\(|document\.cookie)/i,
    /<(iframe|embed|object|applet)\b[^>]*>/i,
    /data:text\/html;base64/i,
  ];

  private readonly pathTraversalPatterns = [
    /(\.\.[/\\])+/i,
    /(%2e%2e%2f|%2e%2e\/|\.\.%2f|\.\.%5c)/i,
    /(\/etc\/(passwd|shadow|hosts)|windows[/\\](system32|win\.ini))/i,
  ];

  private readonly maliciousScanners = [
    /sqlmap/i,
    /nikto/i,
    /masscan/i,
    /wpscan/i,
    /acunetix/i,
    /nessus/i,
    /havij/i,
    /dirbuster/i,
    /gobuster/i,
    /hydra/i,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || '';

    // 1. Cek Scanner / Bot Jahat melalui User-Agent
    for (const pattern of this.maliciousScanners) {
      if (pattern.test(userAgent)) {
        this.logger.warn(`[WAF BLOCKED] Malicious Scanner UA terdeteksi dari IP: ${ip} | User-Agent: ${userAgent}`);
        return res.status(403).json({
          statusCode: 403,
          error: 'WAF_BLOCKED',
          message: 'Akses diblokir oleh Web Application Firewall (Automated Scanner terdeteksi).',
        });
      }
    }

    // 2. Kumpulkan string payload yang akan diperiksa (URL, Query, Body)
    const targets: string[] = [];

    // URL & Path
    try {
      targets.push(decodeURIComponent(req.originalUrl || req.url));
    } catch {
      targets.push(req.originalUrl || req.url);
    }

    // Query parameters
    if (req.query && typeof req.query === 'object') {
      this.extractStrings(req.query, targets);
    }

    // Body payload (kecuali jika multipart upload file biner)
    if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)) {
      this.extractStrings(req.body, targets);
    }

    // 3. Scan terhadap pola serangan
    for (const target of targets) {
      // Periksa SQL Injection
      for (const pattern of this.sqliPatterns) {
        if (pattern.test(target)) {
          this.logger.warn(`[WAF BLOCKED] SQL Injection Pattern dari IP: ${ip} | Path: ${req.path} | Payload: ${target.slice(0, 100)}`);
          return res.status(403).json({
            statusCode: 403,
            error: 'WAF_BLOCKED',
            message: 'Akses diblokir oleh Web Application Firewall Casheva (Indikasi SQL Injection terdeteksi).',
          });
        }
      }

      // Periksa Cross-Site Scripting (XSS)
      for (const pattern of this.xssPatterns) {
        if (pattern.test(target)) {
          this.logger.warn(`[WAF BLOCKED] XSS Attack Pattern dari IP: ${ip} | Path: ${req.path} | Payload: ${target.slice(0, 100)}`);
          return res.status(403).json({
            statusCode: 403,
            error: 'WAF_BLOCKED',
            message: 'Akses diblokir oleh Web Application Firewall Casheva (Indikasi Cross-Site Scripting XSS terdeteksi).',
          });
        }
      }

      // Periksa Path Traversal
      for (const pattern of this.pathTraversalPatterns) {
        if (pattern.test(target)) {
          this.logger.warn(`[WAF BLOCKED] Path Traversal Pattern dari IP: ${ip} | Path: ${req.path} | Payload: ${target.slice(0, 100)}`);
          return res.status(403).json({
            statusCode: 403,
            error: 'WAF_BLOCKED',
            message: 'Akses diblokir oleh Web Application Firewall Casheva (Indikasi Path Traversal terdeteksi).',
          });
        }
      }
    }

    next();
  }

  private extractStrings(obj: any, collection: string[]) {
    if (!obj) return;
    if (typeof obj === 'string') {
      collection.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractStrings(item, collection);
      }
    } else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        // Jangan cek password mentah terhadap SQLi karena password sah mungkin mengandung karakter simbol khusus
        if (key.toLowerCase().includes('password')) continue;
        this.extractStrings(obj[key], collection);
      }
    }
  }
}
