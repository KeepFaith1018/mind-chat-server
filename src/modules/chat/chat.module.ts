import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { PromptService } from './services/prompt.service';

@Module({
  imports: [ConfigModule, AiModule, QuotaModule],
  controllers: [ChatController],
  providers: [ChatService, PromptService],
})
export class ChatModule {}
