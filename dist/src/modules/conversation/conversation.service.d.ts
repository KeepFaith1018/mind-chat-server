import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto } from './dto/pagination.dto';
export declare class ConversationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateConversationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        modelId: string;
        title: string;
        isPinned: boolean;
    }>;
    findAll(userId: string, query: PaginationDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            modelId: string;
            title: string;
            isPinned: boolean;
        }[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    findOne(userId: string, id: string): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            role: string;
            content: string;
            conversationId: string;
            reasoningContent: string | null;
            toolCalls: import("@prisma/client/runtime/client").JsonValue | null;
            tokens: number;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        modelId: string;
        title: string;
        isPinned: boolean;
    }>;
    update(userId: string, id: string, dto: UpdateConversationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        modelId: string;
        title: string;
        isPinned: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        success: boolean;
    }>;
}
