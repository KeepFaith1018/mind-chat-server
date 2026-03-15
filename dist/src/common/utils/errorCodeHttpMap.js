"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodeHttpStatusMap = void 0;
const common_1 = require("@nestjs/common");
const errorCodeMap_1 = require("./errorCodeMap");
exports.ErrorCodeHttpStatusMap = {
    [errorCodeMap_1.ErrorCode.SUCCESS]: common_1.HttpStatus.OK,
    [errorCodeMap_1.ErrorCode.PARAM_ERROR]: common_1.HttpStatus.BAD_REQUEST,
    [errorCodeMap_1.ErrorCode.UNAUTHORIZED]: common_1.HttpStatus.UNAUTHORIZED,
    [errorCodeMap_1.ErrorCode.UNAUTHORIZED_EXPIRED]: common_1.HttpStatus.UNAUTHORIZED,
    [errorCodeMap_1.ErrorCode.FORBIDDEN]: common_1.HttpStatus.FORBIDDEN,
    [errorCodeMap_1.ErrorCode.NOT_FOUND]: common_1.HttpStatus.NOT_FOUND,
    [errorCodeMap_1.ErrorCode.INTERNAL_ERROR]: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
    [errorCodeMap_1.ErrorCode.SERVICE_UNAVAILABLE]: common_1.HttpStatus.SERVICE_UNAVAILABLE,
    [errorCodeMap_1.ErrorCode.CONVERSATION_NOT_FOUND]: common_1.HttpStatus.NOT_FOUND,
    [errorCodeMap_1.ErrorCode.CONVERSATION_UNAUTHORIZED]: common_1.HttpStatus.FORBIDDEN,
    [errorCodeMap_1.ErrorCode.CONVERSATION_CLOSED]: common_1.HttpStatus.BAD_REQUEST,
    [errorCodeMap_1.ErrorCode.MESSAGE_NOT_FOUND]: common_1.HttpStatus.NOT_FOUND,
    [errorCodeMap_1.ErrorCode.MESSAGE_UNAUTHORIZED]: common_1.HttpStatus.FORBIDDEN,
    [errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS]: common_1.HttpStatus.BAD_REQUEST,
    [errorCodeMap_1.ErrorCode.AUTH_USER_EXISTS]: common_1.HttpStatus.BAD_REQUEST,
    [errorCodeMap_1.ErrorCode.AUTH_USER_NOT_FOUND]: common_1.HttpStatus.NOT_FOUND,
    [errorCodeMap_1.ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: common_1.HttpStatus.UNAUTHORIZED,
    [errorCodeMap_1.ErrorCode.QUOTA_EXCEEDED]: common_1.HttpStatus.FORBIDDEN,
    [errorCodeMap_1.ErrorCode.EMAIL_RATE_LIMIT]: common_1.HttpStatus.TOO_MANY_REQUESTS,
    [errorCodeMap_1.ErrorCode.FILE_TYPE_UNSUPPORTED]: common_1.HttpStatus.BAD_REQUEST,
    [errorCodeMap_1.ErrorCode.FILE_NOT_FOUND]: common_1.HttpStatus.NOT_FOUND,
};
//# sourceMappingURL=errorCodeHttpMap.js.map