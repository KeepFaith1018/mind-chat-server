import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@common/prisma/prisma.module';
import { winstonConfig } from '@common/config/winston.config';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from '@common/filter/all-exceptions.filter';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiModule } from './modules/ai/ai.module';
import { QuotaModule } from './modules/quota/quota.module';
import { UploadModule } from './modules/upload/upload.module';
import { ModelsModule } from './modules/models/models.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory(configService: ConfigService) {
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: '30m', // 默认 30 分钟
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    WinstonModule.forRoot(winstonConfig),
    AuthModule,
    ConversationModule,
    ChatModule,
    AiModule,
    QuotaModule,
    UploadModule,
    ModelsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResponseInterceptor,
    LoggingInterceptor,
    AllExceptionsFilter,
  ],
})
export class AppModule {}
