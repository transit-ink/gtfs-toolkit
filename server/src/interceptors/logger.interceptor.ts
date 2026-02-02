import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const userAgent =
      (request.headers && request.headers['user-agent']) || '';
    const startTime = Date.now();
    const skipLogging =
      url?.includes('health-check') ||
      url?.includes('robots.txt') ||
      url?.includes('favicon.ico');

    // Log request (skip health checks, robots.txt, favicon.ico)
    if (!skipLogging) {
      this.logger.log({
        message: 'Incoming Request',
        method,
        url,
        body,
        query,
        params,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful response (skip health checks, robots.txt, favicon.ico)
          if (!skipLogging) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.logger.log({
              message: 'Request Completed',
              method,
              url,
              statusCode: context.switchToHttp().getResponse().statusCode,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        },
        error: (error) => {
          // Log error
          const endTime = Date.now();
          const duration = endTime - startTime;
          this.logger.error({
            message: 'Request Failed',
            method,
            url,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        },
      }),
      catchError((error) => {
        // Re-throw the error to maintain the error flow
        return throwError(() => error);
      }),
    );
  }
}
