import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filter/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 开启跨域访问
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  // 使用 Cookie Parser
  app.use(cookieParser());
  // 使用 Winston 作为全局 Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  // 全局拦截器 (统一响应格式 + 日志)
  app.useGlobalInterceptors(
    app.get(ResponseInterceptor),
    app.get(LoggingInterceptor),
  );
  // 全局异常过滤器
  app.useGlobalFilters(app.get(AllExceptionsFilter));
  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  // 全局前缀
  app.setGlobalPrefix('api');
  await app.listen(3000);
}
void bootstrap();
