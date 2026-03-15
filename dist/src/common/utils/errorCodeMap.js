"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["SUCCESS"] = 0] = "SUCCESS";
    ErrorCode[ErrorCode["PARAM_ERROR"] = 40000] = "PARAM_ERROR";
    ErrorCode[ErrorCode["UNAUTHORIZED"] = 40100] = "UNAUTHORIZED";
    ErrorCode[ErrorCode["UNAUTHORIZED_EXPIRED"] = 40101] = "UNAUTHORIZED_EXPIRED";
    ErrorCode[ErrorCode["FORBIDDEN"] = 40300] = "FORBIDDEN";
    ErrorCode[ErrorCode["NOT_FOUND"] = 40400] = "NOT_FOUND";
    ErrorCode[ErrorCode["INTERNAL_ERROR"] = 50000] = "INTERNAL_ERROR";
    ErrorCode[ErrorCode["SERVICE_UNAVAILABLE"] = 50300] = "SERVICE_UNAVAILABLE";
    ErrorCode[ErrorCode["CONVERSATION_NOT_FOUND"] = 43001] = "CONVERSATION_NOT_FOUND";
    ErrorCode[ErrorCode["CONVERSATION_UNAUTHORIZED"] = 43002] = "CONVERSATION_UNAUTHORIZED";
    ErrorCode[ErrorCode["CONVERSATION_CLOSED"] = 43003] = "CONVERSATION_CLOSED";
    ErrorCode[ErrorCode["MESSAGE_NOT_FOUND"] = 44001] = "MESSAGE_NOT_FOUND";
    ErrorCode[ErrorCode["MESSAGE_UNAUTHORIZED"] = 44002] = "MESSAGE_UNAUTHORIZED";
    ErrorCode[ErrorCode["AUTH_INVALID_CREDENTIALS"] = 47001] = "AUTH_INVALID_CREDENTIALS";
    ErrorCode[ErrorCode["AUTH_USER_EXISTS"] = 47002] = "AUTH_USER_EXISTS";
    ErrorCode[ErrorCode["AUTH_USER_NOT_FOUND"] = 47003] = "AUTH_USER_NOT_FOUND";
    ErrorCode[ErrorCode["AUTH_INVALID_REFRESH_TOKEN"] = 47004] = "AUTH_INVALID_REFRESH_TOKEN";
    ErrorCode[ErrorCode["QUOTA_EXCEEDED"] = 46001] = "QUOTA_EXCEEDED";
    ErrorCode[ErrorCode["EMAIL_RATE_LIMIT"] = 46002] = "EMAIL_RATE_LIMIT";
    ErrorCode[ErrorCode["FILE_TYPE_UNSUPPORTED"] = 42001] = "FILE_TYPE_UNSUPPORTED";
    ErrorCode[ErrorCode["FILE_NOT_FOUND"] = 42002] = "FILE_NOT_FOUND";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=errorCodeMap.js.map