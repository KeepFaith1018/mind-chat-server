"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nest_winston_1 = require("nest-winston");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./common/prisma/prisma.module");
const winston_config_1 = require("./common/config/winston.config");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const all_exceptions_filter_1 = require("./common/filter/all-exceptions.filter");
const jwt_1 = require("@nestjs/jwt");
const auth_module_1 = require("./modules/auth/auth.module");
const conversation_module_1 = require("./modules/conversation/conversation.module");
const chat_module_1 = require("./modules/chat/chat.module");
const ai_module_1 = require("./modules/ai/ai.module");
const quota_module_1 = require("./modules/quota/quota.module");
const upload_module_1 = require("./modules/upload/upload.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env'],
            }),
            jwt_1.JwtModule.registerAsync({
                global: true,
                useFactory(configService) {
                    return {
                        secret: configService.get('JWT_SECRET'),
                        signOptions: {
                            expiresIn: '30m',
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            nest_winston_1.WinstonModule.forRoot(winston_config_1.winstonConfig),
            auth_module_1.AuthModule,
            conversation_module_1.ConversationModule,
            chat_module_1.ChatModule,
            ai_module_1.AiModule,
            quota_module_1.QuotaModule,
            upload_module_1.UploadModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            response_interceptor_1.ResponseInterceptor,
            logging_interceptor_1.LoggingInterceptor,
            all_exceptions_filter_1.AllExceptionsFilter,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map