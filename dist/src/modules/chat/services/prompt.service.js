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
exports.PromptService = void 0;
const common_1 = require("@nestjs/common");
const messages_1 = require("@langchain/core/messages");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
let PromptService = class PromptService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async buildMessages(userId, messages, fileIds) {
        const fileContext = await this.buildFileContext(userId, fileIds);
        const maxHistory = 20;
        const recentMessages = messages.slice(-maxHistory);
        const langChainMessages = recentMessages.map((m, index) => {
            let content = m.content;
            if (index === recentMessages.length - 1 &&
                m.role === 'user' &&
                fileContext) {
                content = `${fileContext}\n\n重要提示：以上内容为参考资料。请仅基于参考资料回答用户问题。如果参考资料中没有相关信息，请直接说明。\n\n用户问题：${content}`;
            }
            switch (m.role) {
                case 'user':
                    return new messages_1.HumanMessage(content);
                case 'assistant':
                    return new messages_1.AIMessage(content);
                case 'system':
                    return new messages_1.SystemMessage(content);
                default:
                    return new messages_1.HumanMessage(content);
            }
        });
        if (!(langChainMessages[0] instanceof messages_1.SystemMessage)) {
            langChainMessages.unshift(new messages_1.SystemMessage('你是一个智能助手 MindChat，请用简洁、专业的语言回答用户问题。'));
        }
        return langChainMessages;
    }
    async buildFileContext(userId, fileIds) {
        if (!fileIds || fileIds.length === 0)
            return '';
        const files = await this.prisma.file.findMany({
            where: {
                id: { in: fileIds },
                userId,
            },
        });
        if (files.length === 0)
            return '';
        let context = `\n\n=== 参考资料开始 ===\n`;
        files.forEach((f, index) => {
            const safeContent = f.content?.replace(/=== 参考资料/g, '') || '';
            context += `\n[资料 ${index + 1}: ${f.filename}]\n${safeContent}\n`;
        });
        context += `\n=== 参考资料结束 ===\n`;
        return context;
    }
};
exports.PromptService = PromptService;
exports.PromptService = PromptService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromptService);
//# sourceMappingURL=prompt.service.js.map