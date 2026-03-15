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
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const operators_1 = require("rxjs/operators");
const winston_1 = require("winston");
class LoggingInterceptor {
    logger;
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const { method, url } = req;
        const body = req.body;
        const start = Date.now();
        return next.handle().pipe((0, operators_1.tap)(() => {
            const time = Date.now() - start;
            this.logger.info(`${method} ${url} - ${time}ms`, { body });
        }));
    }
}
exports.LoggingInterceptor = LoggingInterceptor;
__decorate([
    (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_PROVIDER),
    __metadata("design:type", winston_1.Logger)
], LoggingInterceptor.prototype, "logger", void 0);
//# sourceMappingURL=logging.interceptor.js.map