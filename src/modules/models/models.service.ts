import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

interface ModelConfigRow {
  model_key: string;
  display_name: string;
  provider: string;
  max_context_tokens: number;
  supports_web_search: boolean;
  supports_reasoning: boolean;
  supports_file_qa: boolean;
  supports_stream: boolean;
  is_default: boolean;
}

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableModels() {
    const models = await this.prisma.$queryRaw<ModelConfigRow[]>`
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
}
