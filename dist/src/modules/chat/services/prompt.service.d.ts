import { BaseMessage } from '@langchain/core/messages';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ChatMessageDto } from '../dto/chat.dto';
interface BuildMessageOptions {
    reasoningEnabled?: boolean;
    webSearchEnabled?: boolean;
}
export declare class PromptService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    buildMessages(userId: string, messages: ChatMessageDto[], fileIds?: string[], options?: BuildMessageOptions): Promise<BaseMessage[]>;
    private buildFileContext;
}
export {};
