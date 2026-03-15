import { BaseMessage } from '@langchain/core/messages';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ChatMessageDto } from '../dto/chat.dto';
export declare class PromptService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    buildMessages(userId: string, messages: ChatMessageDto[], fileIds?: string[]): Promise<BaseMessage[]>;
    private buildFileContext;
}
