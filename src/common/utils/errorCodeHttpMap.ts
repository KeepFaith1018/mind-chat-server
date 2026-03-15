import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './errorCodeMap';

export const ErrorCodeHttpStatusMap: Record<ErrorCode, HttpStatus> = {
  [ErrorCode.SUCCESS]: HttpStatus.OK,

  [ErrorCode.PARAM_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.UNAUTHORIZED_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,

  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,

  // 会话
  [ErrorCode.CONVERSATION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.CONVERSATION_UNAUTHORIZED]: HttpStatus.FORBIDDEN,
  [ErrorCode.CONVERSATION_CLOSED]: HttpStatus.BAD_REQUEST,

  // 消息
  [ErrorCode.MESSAGE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.MESSAGE_UNAUTHORIZED]: HttpStatus.FORBIDDEN,

  // 认证
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: HttpStatus.BAD_REQUEST,
  [ErrorCode.AUTH_USER_EXISTS]: HttpStatus.BAD_REQUEST,
  [ErrorCode.AUTH_USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: HttpStatus.UNAUTHORIZED,

  // 配额
  [ErrorCode.QUOTA_EXCEEDED]: HttpStatus.FORBIDDEN,
  [ErrorCode.EMAIL_RATE_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,

  // 文件
  [ErrorCode.FILE_TYPE_UNSUPPORTED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.FILE_NOT_FOUND]: HttpStatus.NOT_FOUND,
};
