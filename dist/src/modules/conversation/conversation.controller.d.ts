import { ConversationService } from './conversation.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtUser } from '@app/types/jwtUser.interface';
export declare class ConversationController {
    private readonly conversationService;
    constructor(conversationService: ConversationService);
    create(user: JwtUser, createConversationDto: CreateConversationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        modelId: string;
        title: string;
        isPinned: boolean;
    }>;
    findAll(user: JwtUser, query: PaginationDto): Promise<{
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
    findOne(user: JwtUser, id: string): Promise<{
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
    update(user: JwtUser, id: string, updateConversationDto: UpdateConversationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        modelId: string;
        title: string;
        isPinned: boolean;
    }>;
    remove(user: JwtUser, id: string): Promise<{
        success: boolean;
    }>;
}
