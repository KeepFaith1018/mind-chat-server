import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@common/utils/errorCodeMap';
export declare class BusinessException extends HttpException {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message?: string, httpStatus?: HttpStatus);
}
