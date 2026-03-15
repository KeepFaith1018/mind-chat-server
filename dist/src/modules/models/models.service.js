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
exports.ModelsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ModelsService = class ModelsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAvailableModels() {
        const models = await this.prisma.$queryRaw `
      SELECT
        model_key,
        display_name,
        provider,
        max_context_tokens,
        supports_web_search,
        supports_reasoning,
        supports_file_qa,
        supports_stream,
        is_default
      FROM model_configs
      WHERE enabled = true
      ORDER BY is_default DESC, updated_at DESC
    `;
        const defaultModel = models.find((item) => item.is_default)?.model_key ?? models[0]?.model_key;
        return {
            defaultModel: defaultModel ?? null,
            models: models.map((item) => ({
                modelKey: item.model_key,
                displayName: item.display_name,
                provider: item.provider,
                maxContextTokens: item.max_context_tokens,
                capabilities: {
                    webSearch: item.supports_web_search,
                    reasoning: item.supports_reasoning,
                    fileQa: item.supports_file_qa,
                    stream: item.supports_stream,
                },
            })),
        };
    }
};
exports.ModelsService = ModelsService;
exports.ModelsService = ModelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ModelsService);
//# sourceMappingURL=models.service.js.map