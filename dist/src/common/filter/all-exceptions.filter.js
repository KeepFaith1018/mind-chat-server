"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston_1 = require("winston");
const result_1 = require("../utils/result");
const businessException_1 = require("../exception/businessException");
const errorCodeMap_1 = require("../utils/errorCodeMap");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger;
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        if (exception instanceof businessException_1.BusinessException) {
            const res = exception.getResponse();
            this.logger.warn(`[BusinessException] ${request.method} ${request.url} - ${JSON.stringify(res)}`);
            response
                .status(exception.getStatus())
                .json(result_1.Result.error(res.code, res.message));
            return;
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();
            let message = exception.message;
            if (typeof res === 'string') {
                message = res;
            }
            else if (typeof res === 'object' && res !== null) {
                const msg = res.message;
                if (Array.isArray(msg)) {
                    message = msg.join(', ');
                }
                else if (typeof msg === 'string') {
                    message = msg;
                }
            }
            this.logger.error(`[HttpException] ${request.method} ${request.url} - ${status} - ${message}`);
            response
                .status(status)
                .json(result_1.Result.error(errorCodeMap_1.ErrorCode.PARAM_ERROR, message));
            return;
        }
        const error = exception;
        this.logger.error(`[UnknownException] ${request.method} ${request.url}`, error?.stack);
        response
            .status(common_1.HttpStatus.INTERNAL_SERVER_ERROR)
            .json(result_1.Result.error(errorCodeMap_1.ErrorCode.INTERNAL_ERROR, '服务器内部错误'));
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
__decorate([
    (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_PROVIDER),
    __metadata("design:type", winston_1.Logger)
], AllExceptionsFilter.prototype, "logger", void 0);
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map