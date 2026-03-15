import { ErrorCode } from './errorCodeMap';

export const ErrorMessageMap: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '成功',

  // 通用
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.UNAUTHORIZED]: '未登录',
  [ErrorCode.UNAUTHORIZED_EXPIRED]: '登录已过期',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',

  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用，请稍后重试',

  // 会话
  [ErrorCode.CONVERSATION_NOT_FOUND]: '会话不存在',
  [ErrorCode.CONVERSATION_UNAUTHORIZED]: '无权限访问该会话',
  [ErrorCode.CONVERSATION_CLOSED]: '会话已关闭',

  // 消息
  [ErrorCode.MESSAGE_NOT_FOUND]: '消息不存在',
  [ErrorCode.MESSAGE_UNAUTHORIZED]: '无权限访问该消息',

  // 认证
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '账号或密码错误',
  [ErrorCode.AUTH_USER_EXISTS]: '用户已存在',
  [ErrorCode.AUTH_USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: '刷新令牌无效',

  // 配额
  [ErrorCode.QUOTA_EXCEEDED]: '对话额度已用完',
  [ErrorCode.EMAIL_RATE_LIMIT]: '请求过于频繁，请稍后再试',

  // 文件
  [ErrorCode.FILE_TYPE_UNSUPPORTED]: '不支持的文件类型',
  [ErrorCode.FILE_NOT_FOUND]: '文件不存在',
};
