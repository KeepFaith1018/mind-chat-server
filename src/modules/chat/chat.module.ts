import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { PromptService } from './services/prompt.service';
import { ModelsModule } from '../models/models.module';
import { SearchModule } from '../search/search.module';
import { UsageModule } from '../usage/usage.module';
import { SafetyModule } from '../safety/safety.module';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule,
    AiModule,
    QuotaModule,
    ModelsModule,
    SearchModule,
    UsageModule,
    SafetyModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, PromptService, RateLimitGuard],
})
export class ChatModule {}
