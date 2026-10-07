import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ProblemDetails } from '@ratedeck/contracts';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

/** Maps every error to RFC 9457 `application/problem+json`. Internals never leak in 5xx. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();
    const correlationId = String(req.id ?? req.headers['x-correlation-id'] ?? '');

    let problem: ProblemDetails;

    if (exception instanceof ZodError) {
      problem = {
        type: 'https://ratedeck.dev/problems/validation',
        title: 'Validation failed',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'VALIDATION_FAILED',
        errors: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      };
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      problem = {
        type: `https://ratedeck.dev/problems/http-${status}`,
        title: HttpStatus[status]?.replace(/_/g, ' ').toLowerCase() ?? 'error',
        status,
        detail: Array.isArray(detail) ? detail.join('; ') : detail,
      };
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      problem = {
        type: 'https://ratedeck.dev/problems/internal',
        title: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    problem.instance = req.originalUrl;
    if (correlationId) problem.correlationId = correlationId;

    res.status(problem.status).type('application/problem+json').json(problem);
  }
}
