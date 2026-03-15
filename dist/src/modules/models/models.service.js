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
const businessException_1 = require("../../common/exception/businessException");
const errorCodeMap_1 = require("../../common/utils/errorCodeMap");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ModelsService = class ModelsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAvailableModels() {
        const models = await this.queryEnabledModels();
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
    async resolveModelForChat(preferredModelKey) {
        const preferred = preferredModelKey?.trim();
        if (preferred) {
            const rows = await this.prisma.$queryRaw `
        SELECT
          model_key,
          display_name,
          provider,
          enabled,
          max_context_tokens,
          supports_web_search,
          supports_reasoning,
          supports_file_qa,
          supports_stream,
          is_default,
          config_json
        FROM model_configs
        WHERE enabled = true AND model_key = ${preferred}
        LIMIT 1
      `;
            if (rows[0]) {
                return this.mapRow(rows[0]);
            }
        }
        const rows = await this.prisma.$queryRaw `
      SELECT
        model_key,
        display_name,
        provider,
        enabled,
        max_context_tokens,
        supports_web_search,
        supports_reasoning,
        supports_file_qa,
        supports_stream,
        is_default,
        config_json
      FROM model_configs
      WHERE enabled = true
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
        if (!rows[0]) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.SERVICE_UNAVAILABLE, '暂无可用模型配置');
        }
        return this.mapRow(rows[0]);
    }
    resolveCapabilities(model, requested, hasFiles) {
        const needWebSearch = Boolean(requested?.webSearch);
        const needReasoning = Boolean(requested?.reasoning);
        const needFileQa = Boolean(requested?.fileQa) || hasFiles;
        return {
            webSearch: needWebSearch && model.supportsWebSearch,
            reasoning: needReasoning && model.supportsReasoning,
            fileQa: needFileQa && model.supportsFileQa,
            stream: model.supportsStream,
        };
    }
    async queryEnabledModels() {
        return await this.prisma.$queryRaw `
      SELECT
        model_key,
        display_name,
        provider,
        enabled,
        max_context_tokens,
        supports_web_search,
        supports_reasoning,
        supports_file_qa,
        supports_stream,
        is_default,
        config_json
      FROM model_configs
      WHERE enabled = true
      ORDER BY is_default DESC, updated_at DESC
    `;
    }
    mapRow(row) {
        const configJson = row.config_json && typeof row.config_json === 'object'
            ? row.config_json
            : null;
        return {
            modelKey: row.model_key,
            displayName: row.display_name,
            provider: row.provider,
            enabled: row.enabled,
            isDefault: row.is_default,
            maxContextTokens: row.max_context_tokens,
            supportsWebSearch: row.supports_web_search,
            supportsReasoning: row.supports_reasoning,
            supportsFileQa: row.supports_file_qa,
            supportsStream: row.supports_stream,
            configJson,
        };
    }
};
exports.ModelsService = ModelsService;
exports.ModelsService = ModelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ModelsService);
//# sourceMappingURL=models.service.js.map