import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Converts a ZodError (raised when LLM/HTTP args fail schema validation) into a
 * 400 with the issues. Invalid structured queries are reported, never executed.
 */
@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: 400,
      error: 'Invalid structured query',
      issues: exception.issues,
    });
  }
}
