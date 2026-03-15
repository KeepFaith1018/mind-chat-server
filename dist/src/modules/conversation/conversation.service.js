"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const businessException_1 = require("../../common/exception/businessException");
const errorCodeMap_1 = require("../../common/utils/errorCodeMap");
let ConversationService = class ConversationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.conversation.create({
            data: {
                userId,
                modelId: dto.modelId || 'deepseek-ai/DeepSeek-V3',
                title: '新对话',
            },
        });
    }
    async findAll(userId, query) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        const [items, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where: { userId },
                orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
                take: pageSize,
                skip: (page - 1) * pageSize,
                select: {
                    id: true,
                    title: true,
                    isPinned: true,
                    modelId: true,
                    updatedAt: true,
                    createdAt: true,
                },
            }),
            this.prisma.conversation.count({
                where: { userId },
            }),
        ]);
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async findOne(userId, id) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!conversation) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.CONVERSATION_NOT_FOUND);
        }
        return conversation;
    }
    async update(userId, id, dto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id, userId },
        });
        if (!conversation) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.CONVERSATION_NOT_FOUND);
        }
        return this.prisma.conversation.update({
            where: { id },
            data: dto,
        });
    }
    async remove(userId, id) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id, userId },
        });
        if (!conversation) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.CONVERSATION_NOT_FOUND);
        }
        await this.prisma.conversation.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationService);
//# sourceMappingURL=conversation.service.js.map