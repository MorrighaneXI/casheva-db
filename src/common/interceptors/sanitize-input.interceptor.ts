import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SanitizeInputInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)) {
      this.sanitizeInPlace(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      this.sanitizeInPlace(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      this.sanitizeInPlace(req.params);
    }

    return next.handle();
  }

  private sanitizeInPlace(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
          obj[i] = this.sanitizeString(obj[i]);
        } else if (typeof obj[i] === 'object') {
          this.sanitizeInPlace(obj[i]);
        }
      }
    } else {
      for (const key of Object.keys(obj)) {
        // Jangan ubah/sanitize string password mentah agar tidak merusak hash
        if (key.toLowerCase().includes('password')) {
          continue;
        }

        if (typeof obj[key] === 'string') {
          obj[key] = this.sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.sanitizeInPlace(obj[key]);
        }
      }
    }
  }

  private sanitizeString(value: string): string {
    if (!value) return value;

    // 1. Hilangkan Null Byte (\0) untuk mencegah poison null byte injection
    let clean = value.replace(/\0/g, '');

    // 2. Bersihkan skrip tag berbahaya <script>...</script>
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 3. Bersihkan inline event handler berbahaya (seperti onload=, onerror=, onclick=)
    clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/on\w+\s*=\s*[^>\s]+/gi, '');

    // 4. Bersihkan skema javascript: / vbscript:
    clean = clean.replace(/javascript:/gi, '');
    clean = clean.replace(/vbscript:/gi, '');

    return clean.trim();
  }
}
