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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const businessException_1 = require("../../common/exception/businessException");
const errorCodeMap_1 = require("../../common/utils/errorCodeMap");
const ai_service_1 = require("../ai/ai.service");
const quota_service_1 = require("../quota/quota.service");
const prompt_service_1 = require("./services/prompt.service");
const sse_utils_1 = require("../../common/utils/sse.utils");
let ChatService = class ChatService {
    prisma;
    aiService;
    quotaService;
    promptService;
    constructor(prisma, aiService, quotaService, promptService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.quotaService = quotaService;
        this.promptService = promptService;
    }
    async chat(userId, dto, res) {
        const sse = new sse_utils_1.SSEUtils(res);
        try {
            await this.quotaService.checkQuota(userId);
            const conversationId = await this.getOrCreateConversation(userId, dto);
            sse.sendMeta({ conversationId });
            this.saveUserMessage(conversationId, dto).catch((err) => console.error('Save User Message Error:', err));
            const langChainMessages = await this.promptService.buildMessages(userId, dto.messages, dto.fileIds);
            const modelId = dto.model || 'deepseek-ai/DeepSeek-V3';
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 60000);
            const stream = await this.aiService.streamChat(langChainMessages, {
                modelName: modelId,
            });
            clearTimeout(timeoutId);
            let fullContent = '';
            let fullReasoning = '';
            let outputTokens = 0;
            for await (const chunk of stream) {
                outputTokens += 1;
                const reasoning = chunk.additional_kwargs?.reasoning_content ||
                    chunk.response_metadata?.reasoning_content;
                if (reasoning) {
                    fullReasoning += reasoning;
                    sse.sendThinking(reasoning);
                }
                if (chunk.content) {
                    const contentStr = chunk.content;
                    fullContent += contentStr;
                    sse.sendContent(contentStr);
                }
            }
            sse.sendDone();
            this.handlePostChat(userId, conversationId, fullContent, fullReasoning, langChainMessages, outputTokens).catch((err) => console.error('Post Chat Error:', err));
        }
        catch (error) {
            console.error('Chat Error:', error);
            sse.sendError(error.message || 'Unknown error');
        }
    }
    async getOrCreateConversation(userId, dto) {
        if (dto.conversationId) {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: dto.conversationId, userId },
            });
            if (!conversation) {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.CONVERSATION_NOT_FOUND);
            }
            return conversation.id;
        }
        const title = dto.messages[dto.messages.length - 1]?.content.slice(0, 50) || '新对话';
        const conversation = await this.prisma.conversation.create({
            data: {
                userId,
                title,
                modelId: dto.model || 'deepseek-ai/DeepSeek-V3',
            },
        });
        return conversation.id;
    }
    async saveUserMessage(conversationId, dto) {
        const lastUserMsg = dto.messages[dto.messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
            await this.prisma.message.create({
                data: {
                    conversationId,
                    role: 'user',
                    content: lastUserMsg.content,
                },
            });
        }
    }
    async handlePostChat(userId, conversationId, content, reasoning, inputMessages, outputTokens) {
        if (!content && !reasoning)
            return;
        await this.prisma.message.create({
            data: {
                conversationId,
                role: 'assistant',
                content,
                reasoningContent: reasoning || null,
                tokens: outputTokens,
            },
        });
        const inputChars = JSON.stringify(inputMessages).length;
        const inputTokens = Math.ceil(inputChars / 4);
        const totalTokens = inputTokens + outputTokens;
        await this.quotaService.recordUsage(userId, totalTokens);
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        quota_service_1.QuotaService,
        prompt_service_1.PromptService])
], ChatService);
//# sourceMappingURL=chat.service.js.map