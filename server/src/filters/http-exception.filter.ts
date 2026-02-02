import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    let errorDetails = {};

    // Handle validation errors
    if (
      exception instanceof HttpException &&
      status === HttpStatus.BAD_REQUEST
    ) {
      const response = exception.getResponse() as any;
      if (response.message && Array.isArray(response.message)) {
        message = 'Validation failed';
        errorDetails = {
          errors: response.message.map((error: string) => ({
            field: error.split(' ')[0],
            message: error,
          })),
        };
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...errorDetails,
    };

    // Log the error
    this.logger.error({
      ...errorResponse,
      error: {
        name: exception instanceof Error ? exception.name : 'Unknown',
        message:
          exception instanceof Error ? exception.message : 'Unknown error',
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    });

    response.status(status).send(errorResponse);
  }
}
