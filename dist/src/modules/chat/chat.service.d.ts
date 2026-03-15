import { PrismaService } from '../../common/prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';
import { Response } from 'express';
import { AiService } from '../ai/ai.service';
import { QuotaService } from '../quota/quota.service';
import { PromptService } from './services/prompt.service';
export declare class ChatService {
    private readonly prisma;
    private readonly aiService;
    private readonly quotaService;
    private readonly promptService;
    constructor(prisma: PrismaService, aiService: AiService, quotaService: QuotaService, promptService: PromptService);
    chat(userId: string, dto: ChatDto, res: Response): Promise<void>;
    private getOrCreateConversation;
    private saveUserMessage;
    private handlePostChat;
}
