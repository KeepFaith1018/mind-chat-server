import { PrismaService } from '../../common/prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';
import { Response } from 'express';
import { AiService } from '../ai/ai.service';
import { QuotaService } from '../quota/quota.service';
import { PromptService } from './services/prompt.service';
import { ModelsService } from '../models/models.service';
export declare class ChatService {
    private readonly prisma;
    private readonly aiService;
    private readonly quotaService;
    private readonly promptService;
    private readonly modelsService;
    constructor(prisma: PrismaService, aiService: AiService, quotaService: QuotaService, promptService: PromptService, modelsService: ModelsService);
    chat(userId: string, dto: ChatDto, res: Response): Promise<void>;
    private getOrCreateConversation;
    private syncConversationModel;
    private normalizeCapabilities;
    private saveUserMessage;
    private handlePostChat;
}
