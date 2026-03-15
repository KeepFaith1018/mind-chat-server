"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessException = void 0;
const common_1 = require("@nestjs/common");
const errorMessageMap_1 = require("../utils/errorMessageMap");
const errorCodeHttpMap_1 = require("../utils/errorCodeHttpMap");
class BusinessException extends common_1.HttpException {
    code;
    constructor(code, message, httpStatus) {
        super({
            code,
            message: message ?? errorMessageMap_1.ErrorMessageMap[code],
        }, httpStatus ?? errorCodeHttpMap_1.ErrorCodeHttpStatusMap[code] ?? common_1.HttpStatus.BAD_REQUEST);
        this.code = code;
    }
}
exports.BusinessException = BusinessException;
//# sourceMappingURL=businessException.js.map