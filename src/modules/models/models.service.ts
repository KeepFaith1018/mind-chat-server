import { Injectable } from '@nestjs/common';
import { BusinessException } from '@app/common/exception/businessException';
import { ErrorCode } from '@app/common/utils/errorCodeMap';
import { PrismaService } from '@common/prisma/prisma.service';

interface ModelConfigRow {
  model_key: string;
  display_name: string;
  provider: string;
  enabled: boolean;
  max_context_tokens: number;
  supports_web_search: boolean;
  supports_reasoning: boolean;
  supports_file_qa: boolean;
  supports_stream: boolean;
  is_default: boolean;
  config_json: unknown;
}

export interface ModelCapabilityRequest {
  webSearch?: boolean;
  reasoning?: boolean;
  fileQa?: boolean;
}

export interface ResolvedModelConfig {
  modelKey: string;
  displayName: string;
  provider: string;
  enabled: boolean;
  isDefault: boolean;
  maxContextTokens: number;
  supportsWebSearch: boolean;
  supportsReasoning: boolean;
  supportsFileQa: boolean;
  supportsStream: boolean;
  configJson: Record<string, unknown> | null;
}

export interface EffectiveCapabilities {
  webSearch: boolean;
  reasoning: boolean;
  fileQa: boolean;
  stream: boolean;
}

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableModels() {
    const models = await this.queryEnabledModels();

    const defaultModel =
      models.find((item) => item.is_default)?.model_key ?? models[0]?.model_key;

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

  async resolveModelForChat(
    preferredModelKey?: string,
  ): Promise<ResolvedModelConfig> {
    const preferred = preferredModelKey?.trim();
    if (preferred) {
      const rows = await this.prisma.$queryRaw<ModelConfigRow[]>`
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

    const rows = await this.prisma.$queryRaw<ModelConfigRow[]>`
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
      throw new BusinessException(
        ErrorCode.SERVICE_UNAVAILABLE,
        '暂无可用模型配置',
      );
    }

    return this.mapRow(rows[0]);
  }

  resolveCapabilities(
    model: ResolvedModelConfig,
    requested: ModelCapabilityRequest | undefined,
    hasFiles: boolean,
  ): EffectiveCapabilities {
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

  private async queryEnabledModels() {
    return await this.prisma.$queryRaw<ModelConfigRow[]>`
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

  private mapRow(row: ModelConfigRow): ResolvedModelConfig {
    const configJson =
      row.config_json && typeof row.config_json === 'object'
        ? (row.config_json as Record<string, unknown>)
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
}
