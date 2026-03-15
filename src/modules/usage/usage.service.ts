import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

interface PricingRow {
  input_price_per_1k: number;
  output_price_per_1k: number;
}

export interface UsageComputationInput {
  userId: string;
  conversationId: string;
  modelKey: string;
  inputMessages: unknown[];
  outputTokensEstimate: number;
  reasoningContent?: string;
  providerUsagePayload?: unknown;
}

export interface UsageComputationResult {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  cost: number;
  costCurrency: 'USD';
  estimated: boolean;
  providerUsagePayload?: unknown;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async computeUsage(
    input: UsageComputationInput,
  ): Promise<UsageComputationResult> {
    const providerUsage = this.extractProviderUsage(input.providerUsagePayload);
    const estimatedPromptTokens = this.estimatePromptTokens(input.inputMessages);
    const estimatedCompletionTokens = Math.max(input.outputTokensEstimate, 0);
    const reasoningTokens = this.estimateReasoningTokens(input.reasoningContent);

    const promptTokens = providerUsage?.promptTokens ?? estimatedPromptTokens;
    const completionTokens =
      providerUsage?.completionTokens ?? estimatedCompletionTokens;
    const totalTokens =
      providerUsage?.totalTokens ?? promptTokens + completionTokens;

    const pricing = await this.resolvePricing(input.modelKey);
    const cost = this.calculateCost(
      promptTokens,
      completionTokens,
      pricing.input_price_per_1k,
      pricing.output_price_per_1k,
    );

    return {
      promptTokens,
      completionTokens,
      reasoningTokens,
      totalTokens,
      cost,
      costCurrency: 'USD',
      estimated: !providerUsage,
      providerUsagePayload: input.providerUsagePayload,
    };
  }

  async persistUsage(
    input: UsageComputationInput,
    usage: UsageComputationResult,
  ): Promise<void> {
    const metaJson = {
      estimated: usage.estimated,
      providerUsagePayload: usage.providerUsagePayload ?? null,
      reasoningLength: input.reasoningContent?.length ?? 0,
    };

    await this.prisma.$executeRaw`
      INSERT INTO usage_logs (
        id,
        user_id,
        conversation_id,
        model_key,
        prompt_tokens,
        completion_tokens,
        reasoning_tokens,
        total_tokens,
        cost,
        currency,
        meta_json,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${input.userId}::uuid,
        ${input.conversationId}::uuid,
        ${input.modelKey},
        ${usage.promptTokens},
        ${usage.completionTokens},
        ${usage.reasoningTokens},
        ${usage.totalTokens},
        ${usage.cost},
        ${usage.costCurrency},
        ${JSON.stringify(metaJson)}::jsonb,
        now()
      )
    `;
  }

  private async resolvePricing(modelKey: string): Promise<PricingRow> {
    const rows = await this.prisma.$queryRaw<PricingRow[]>`
      SELECT
        input_price_per_1k,
        output_price_per_1k
      FROM model_configs
      WHERE model_key = ${modelKey}
      LIMIT 1
    `;
    return rows[0] || { input_price_per_1k: 0, output_price_per_1k: 0 };
  }

  private estimatePromptTokens(messages: unknown[]): number {
    const inputChars = JSON.stringify(messages).length;
    return Math.ceil(inputChars / 4);
  }

  private estimateReasoningTokens(reasoning?: string): number {
    if (!reasoning) {
      return 0;
    }
    return Math.ceil(reasoning.length / 4);
  }

  private calculateCost(
    promptTokens: number,
    completionTokens: number,
    inputPricePer1k: number,
    outputPricePer1k: number,
  ): number {
    const promptCost = (promptTokens / 1000) * inputPricePer1k;
    const completionCost = (completionTokens / 1000) * outputPricePer1k;
    return Number((promptCost + completionCost).toFixed(8));
  }

  private extractProviderUsage(payload: unknown):
    | {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    | undefined {
    const usage = this.findUsageObject(payload);
    if (!usage) {
      return undefined;
    }

    const promptTokens = this.readNumber(
      usage['prompt_tokens'],
      usage['input_tokens'],
      usage['promptTokens'],
      usage['inputTokens'],
    );
    const completionTokens = this.readNumber(
      usage['completion_tokens'],
      usage['output_tokens'],
      usage['completionTokens'],
      usage['outputTokens'],
    );
    const totalTokens = this.readNumber(
      usage['total_tokens'],
      usage['totalTokens'],
    );

    if (
      promptTokens === undefined &&
      completionTokens === undefined &&
      totalTokens === undefined
    ) {
      return undefined;
    }

    const normalizedPrompt = promptTokens ?? 0;
    const normalizedCompletion = completionTokens ?? 0;
    const normalizedTotal =
      totalTokens ?? normalizedPrompt + normalizedCompletion;

    return {
      promptTokens: normalizedPrompt,
      completionTokens: normalizedCompletion,
      totalTokens: normalizedTotal,
    };
  }

  private findUsageObject(payload: unknown): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }
    const record = payload as Record<string, unknown>;

    if (this.looksLikeUsage(record)) {
      return record;
    }

    const candidates = [
      record['usage'],
      record['usage_metadata'],
      record['tokenUsage'],
      record['token_usage'],
      record['response_metadata'],
      record['llm_output'],
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object') {
        const nested = this.findUsageObject(candidate);
        if (nested) {
          return nested;
        }
      }
    }

    return undefined;
  }

  private looksLikeUsage(record: Record<string, unknown>): boolean {
    const keys = Object.keys(record);
    return keys.some((key) =>
      [
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'input_tokens',
        'output_tokens',
        'promptTokens',
        'completionTokens',
      ].includes(key),
    );
  }

  private readNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  }
}
