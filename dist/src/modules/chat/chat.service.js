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
const models_service_1 = require("../models/models.service");
let ChatService = class ChatService {
    prisma;
    aiService;
    quotaService;
    promptService;
    modelsService;
    constructor(prisma, aiService, quotaService, promptService, modelsService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.quotaService = quotaService;
        this.promptService = promptService;
        this.modelsService = modelsService;
    }
    async chat(userId, dto, res) {
        const sse = new sse_utils_1.SSEUtils(res);
        try {
            await this.quotaService.checkQuota(userId);
            const conversation = await this.getOrCreateConversation(userId, dto);
            const selectedModel = await this.modelsService.resolveModelForChat(dto.model || conversation.modelId);
            const hasFiles = Boolean(dto.fileIds?.length);
            const requestedCapabilities = this.normalizeCapabilities(dto.capabilities);
            const effectiveCapabilities = this.modelsService.resolveCapabilities(selectedModel, requestedCapabilities, hasFiles);
            if (!effectiveCapabilities.stream) {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.SERVICE_UNAVAILABLE, `模型 ${selectedModel.displayName} 不支持流式对话`);
            }
            if (hasFiles && !effectiveCapabilities.fileQa) {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, `模型 ${selectedModel.displayName} 不支持文件问答`);
            }
            if (requestedCapabilities.webSearch && !effectiveCapabilities.webSearch) {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, `模型 ${selectedModel.displayName} 不支持联网搜索`);
            }
            if (requestedCapabilities.webSearch && effectiveCapabilities.webSearch) {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.SERVICE_UNAVAILABLE, '联网搜索能力将在下一阶段启用');
            }
            await this.syncConversationModel(conversation.id, selectedModel.modelKey);
            sse.sendMeta({
                conversationId: conversation.id,
                model: selectedModel.modelKey,
                capabilities: effectiveCapabilities,
            });
            this.saveUserMessage(conversation.id, dto).catch((err) => console.error('Save User Message Error:', err));
            const langChainMessages = await this.promptService.buildMessages(userId, dto.messages, dto.fileIds, {
                reasoningEnabled: effectiveCapabilities.reasoning,
                webSearchEnabled: effectiveCapabilities.webSearch,
            });
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 60000);
            const reasoningParamKey = typeof selectedModel.configJson?.reasoningParamKey === 'string'
                ? selectedModel.configJson.reasoningParamKey
                : undefined;
            const stream = await this.aiService.streamChat(langChainMessages, {
                modelName: selectedModel.modelKey,
                reasoningEnabled: effectiveCapabilities.reasoning,
                reasoningParamKey,
            });
            clearTimeout(timeoutId);
            let fullContent = '';
            let fullReasoning = '';
            let outputTokens = 0;
            for await (const chunk of stream) {
                outputTokens += 1;
                const reasoning = chunk.additional_kwargs?.reasoning_content ||
                    chunk.response_metadata?.reasoning_content;
                if (reasoning && effectiveCapabilities.reasoning) {
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
            this.handlePostChat(userId, conversation.id, fullContent, fullReasoning, langChainMessages, outputTokens).catch((err) => console.error('Post Chat Error:', err));
        }
        catch (error) {
            console.error('Chat Error:', error);
            const message = error instanceof Error && error.message ? error.message : 'Unknown error';
            sse.sendError(message);
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
            return conversation;
        }
        const title = dto.messages[dto.messages.length - 1]?.content.slice(0, 50) || '新对话';
        const conversation = await this.prisma.conversation.create({
            data: {
                userId,
                title,
                modelId: dto.model || 'deepseek-ai/DeepSeek-V3',
            },
        });
        return conversation;
    }
    async syncConversationModel(conversationId, modelId) {
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { modelId },
        });
    }
    normalizeCapabilities(capabilities) {
        return {
            webSearch: Boolean(capabilities?.webSearch),
            reasoning: Boolean(capabilities?.reasoning),
            fileQa: Boolean(capabilities?.fileQa),
        };
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
        prompt_service_1.PromptService,
        models_service_1.ModelsService])
], ChatService);
//# sourceMappingURL=chat.service.js.map