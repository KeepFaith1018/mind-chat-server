import { ConversationService } from './conversation.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtUser } from '@app/types/jwtUser.interface';
export declare class ConversationController {
    private readonly conversationService;
    constructor(conversationService: ConversationService);
    create(user: JwtUser, createConversationDto: CreateConversationDto): Promise<{
        id: string;
        title: string;
        isPinned: boolean;
        modelId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    findAll(user: JwtUser, query: PaginationDto): Promise<{
        items: {
            id: string;
            title: string;
            isPinned: boolean;
            modelId: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    findOne(user: JwtUser, id: string): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            conversationId: string;
            role: string;
            content: string;
            reasoningContent: string | null;
            toolCalls: import("@prisma/client/runtime/client").JsonValue | null;
            tokens: number;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        title: string;
        isPinned: boolean;
        modelId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    update(user: JwtUser, id: string, updateConversationDto: UpdateConversationDto): Promise<{
        id: string;
        title: string;
        isPinned: boolean;
        modelId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    remove(user: JwtUser, id: string): Promise<{
        success: boolean;
    }>;
}
