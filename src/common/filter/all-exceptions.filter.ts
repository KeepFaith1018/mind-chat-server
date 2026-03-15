import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Result } from '../utils/result';
import { BusinessException } from '../exception/businessException';
import { ErrorCode } from '@common/utils/errorCodeMap';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { method, url, ip, body, query } = request;

    // 业务异常
    if (exception instanceof BusinessException) {
      const res = exception.getResponse() as {
        code: number;
        message: string;
      };

      this.logger.warn('BusinessException', {
        method,
        url,
        ip,
        code: res.code,
        message: res.message,
      });

      return response
        .status(exception.getStatus())
        .json(Result.error(res.code, res.message));
    }

    // HTTP异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      let message = exception.message;

      if (typeof res === 'object' && res !== null) {
        const msg = (res as any).message;
        message = Array.isArray(msg) ? msg.join(', ') : msg;
      }

      this.logger.error('HttpException', {
        method,
        url,
        ip,
        status,
        message,
        body,
        query,
      });

      return response
        .status(status)
        .json(Result.error(ErrorCode.PARAM_ERROR, message));
    }

    // 未知异常
    const error = exception as Error;

    this.logger.error('UnknownException', {
      method,
      url,
      ip,
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      body,
      query,
    });

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(Result.error(ErrorCode.INTERNAL_ERROR, '服务器内部错误'));
  }
}
