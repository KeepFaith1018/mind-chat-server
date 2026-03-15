import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';
import { Response } from 'express';
import { AiService } from '../ai/ai.service';
import { QuotaService } from '../quota/quota.service';
import { PromptService } from './services/prompt.service';
import { SSEUtils } from '../../common/utils/sse.utils';
import { ModelsService } from '../models/models.service';
import { ModelCapabilityRequest } from '../models/models.service';
import { SearchService, WebSearchItem } from '../search/search.service';
import { UsageService } from '../usage/usage.service';
import { SafetyService } from '../safety/safety.service';

export interface ChatCapabilityPreviewResponse {
  model: {
    key: string;
    displayName: string;
    provider: string;
    maxContextTokens: number;
  };
  requested: {
    webSearch: boolean;
    reasoning: boolean;
    fileQa: boolean;
  };
  effective: {
    webSearch: boolean;
    reasoning: boolean;
    fileQa: boolean;
    stream: boolean;
  };
  context: {
    conversationId: string | null;
    hasFiles: boolean;
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly quotaService: QuotaService,
    private readonly promptService: PromptService,
    private readonly modelsService: ModelsService,
    private readonly searchService: SearchService,
    private readonly usageService: UsageService,
    private readonly safetyService: SafetyService,
  ) {}

  /**
   * 处理聊天请求
   */
  async chat(userId: string, dto: ChatDto, res: Response) {
    const sse = new SSEUtils(res);

    try {
      this.safetyService.assertSafeInput(dto.messages);

      await this.quotaService.checkQuota(userId);

      const conversation = await this.getOrCreateConversation(userId, dto);
      const selectedModel = await this.modelsService.resolveModelForChat(
        dto.model || conversation.modelId,
      );
      const hasFiles = Boolean(dto.fileIds?.length);
      const requestedCapabilities = this.normalizeCapabilities(
        dto.capabilities,
      );
      const effectiveCapabilities = this.modelsService.resolveCapabilities(
        selectedModel,
        requestedCapabilities,
        hasFiles,
      );

      if (!effectiveCapabilities.stream) {
        throw new BusinessException(
          ErrorCode.SERVICE_UNAVAILABLE,
          `模型 ${selectedModel.displayName} 不支持流式对话`,
        );
      }

      if (hasFiles && !effectiveCapabilities.fileQa) {
        throw new BusinessException(
          ErrorCode.PARAM_ERROR,
          `模型 ${selectedModel.displayName} 不支持文件问答`,
        );
      }

      if (requestedCapabilities.webSearch && !effectiveCapabilities.webSearch) {
        throw new BusinessException(
          ErrorCode.PARAM_ERROR,
          `模型 ${selectedModel.displayName} 不支持联网搜索`,
        );
      }

      await this.syncConversationModel(conversation.id, selectedModel.modelKey);

      let webSearchResults: WebSearchItem[] = [];
      let searchQuery = '';
      if (effectiveCapabilities.webSearch) {
        searchQuery = this.getLatestUserQuestion(dto.messages);
        if (searchQuery) {
          webSearchResults = await this.searchService.search(searchQuery);
        }
      }

      sse.sendMeta({
        conversationId: conversation.id,
        model: selectedModel.modelKey,
        capabilities: effectiveCapabilities,
      });
      if (effectiveCapabilities.webSearch) {
        sse.send(
          'tool_result',
          this.buildWebSearchToolResultEvent(searchQuery, webSearchResults),
        );
      }

      this.saveUserMessage(conversation.id, dto).catch((err) =>
        console.error('Save User Message Error:', err),
      );

      const langChainMessages = await this.promptService.buildMessages(
        userId,
        dto.messages,
        dto.fileIds,
        {
          reasoningEnabled: effectiveCapabilities.reasoning,
          webSearchEnabled: effectiveCapabilities.webSearch,
          webSearchContext: this.searchService.buildContext(webSearchResults),
        },
      );

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 60000);

      const reasoningParamKey =
        typeof selectedModel.configJson?.reasoningParamKey === 'string'
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
      let providerUsagePayload: unknown;
      let outputBlocked = false;

      for await (const chunk of stream) {
        outputTokens += 1;
        providerUsagePayload =
          (chunk.response_metadata as unknown) ??
          (chunk.additional_kwargs as unknown) ??
          providerUsagePayload;
        const reasoning =
          (chunk.additional_kwargs?.reasoning_content as string) ||
          (chunk.response_metadata?.reasoning_content as string);

        if (reasoning && effectiveCapabilities.reasoning) {
          fullReasoning += reasoning;
          sse.sendThinking(reasoning);
        }

        if (chunk.content) {
          const contentStr = chunk.content as string;
          const filtered = this.safetyService.filterOutputChunk(contentStr);
          fullContent += filtered.safeText;
          sse.sendContent(filtered.safeText);
          if (filtered.blocked) {
            outputBlocked = true;
            break;
          }
        }
      }

      sse.sendDone();

      this.handlePostChat(
        userId,
        conversation.id,
        fullContent,
        fullReasoning,
        langChainMessages,
        outputTokens,
        selectedModel.modelKey,
        providerUsagePayload,
      ).catch((err) => console.error('Post Chat Error:', err));

      if (outputBlocked) {
        console.warn('Output blocked by safety policy', {
          conversationId: conversation.id,
        });
      }
    } catch (error) {
      console.error('Chat Error:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      sse.sendError(message);
    }
  }

  async getCapabilities(
    userId: string,
    query: {
      model?: string;
      conversationId?: string;
      webSearch?: string;
      reasoning?: string;
      fileQa?: string;
      fileCount?: string;
    },
  ): Promise<ChatCapabilityPreviewResponse> {
    const conversationModel = await this.resolveConversationModel(
      userId,
      query.conversationId,
    );
    const selectedModel = await this.modelsService.resolveModelForChat(
      query.model || conversationModel,
    );

    const requested = {
      webSearch: this.parseBoolean(query.webSearch),
      reasoning: this.parseBoolean(query.reasoning),
      fileQa: this.parseBoolean(query.fileQa),
    };
    const hasFiles = this.parseNumber(query.fileCount) > 0;
    const effective = this.modelsService.resolveCapabilities(
      selectedModel,
      requested,
      hasFiles,
    );

    return {
      model: {
        key: selectedModel.modelKey,
        displayName: selectedModel.displayName,
        provider: selectedModel.provider,
        maxContextTokens: selectedModel.maxContextTokens,
      },
      requested,
      effective,
      context: {
        conversationId: query.conversationId || null,
        hasFiles,
      },
    };
  }

  /**
   * 获取或创建会话
   */
  private async getOrCreateConversation(userId: string, dto: ChatDto) {
    if (dto.conversationId) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId, userId },
      });
      if (!conversation) {
        throw new BusinessException(ErrorCode.CONVERSATION_NOT_FOUND);
      }
      return conversation;
    }

    const title =
      dto.messages[dto.messages.length - 1]?.content.slice(0, 50) || '新对话';
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        title,
        modelId: dto.model || 'deepseek-ai/DeepSeek-V3',
      },
    });
    return conversation;
  }

  private async syncConversationModel(conversationId: string, modelId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { modelId },
    });
  }

  private normalizeCapabilities(
    capabilities: ChatDto['capabilities'],
  ): ModelCapabilityRequest {
    return {
      webSearch: Boolean(capabilities?.webSearch),
      reasoning: Boolean(capabilities?.reasoning),
      fileQa: Boolean(capabilities?.fileQa),
    };
  }

  private getLatestUserQuestion(messages: ChatDto['messages']): string {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user' && messages[i]?.content?.trim()) {
        return messages[i].content.trim();
      }
    }
    return '';
  }

  private async resolveConversationModel(
    userId: string,
    conversationId?: string,
  ): Promise<string | undefined> {
    if (!conversationId) {
      return undefined;
    }
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      select: { modelId: true },
    });
    if (!conversation) {
      throw new BusinessException(ErrorCode.CONVERSATION_NOT_FOUND);
    }
    return conversation.modelId;
  }

  private parseBoolean(value?: string): boolean {
    if (!value) {
      return false;
    }
    return value === 'true' || value === '1';
  }

  private parseNumber(value?: string): number {
    if (!value) {
      return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildWebSearchToolResultEvent(
    query: string,
    items: WebSearchItem[],
  ): {
    version: 'v1';
    tool: 'web_search';
    query: string;
    total: number;
    truncated: boolean;
    generatedAt: string;
    items: Array<{
      rank: number;
      title: string;
      url: string;
      snippet: string;
    }>;
  } {
    const maxItems = 5;
    const normalizedItems = items.slice(0, maxItems).map((item, index) => ({
      rank: index + 1,
      title: item.title,
      url: item.url,
      snippet: item.snippet.slice(0, 240),
    }));

    return {
      version: 'v1',
      tool: 'web_search',
      query,
      total: normalizedItems.length,
      truncated: items.length > maxItems,
      generatedAt: new Date().toISOString(),
      items: normalizedItems,
    };
  }

  /**
   * 保存用户消息
   */
  private async saveUserMessage(conversationId: string, dto: ChatDto) {
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

  /**
   * 后置处理：保存 AI 回复 & 扣费
   */
  private async handlePostChat(
    userId: string,
    conversationId: string,
    content: string,
    reasoning: string,
    inputMessages: any[],
    outputTokens: number,
    modelKey: string,
    providerUsagePayload?: unknown,
  ) {
    if (!content && !reasoning) return;

    // 1. 保存 AI 消息
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content,
        reasoningContent: reasoning || null,
        tokens: outputTokens,
      },
    });

    const usage = await this.usageService.computeUsage({
      userId,
      conversationId,
      modelKey,
      inputMessages,
      outputTokensEstimate: outputTokens,
      reasoningContent: reasoning,
      providerUsagePayload,
    });

    await this.usageService.persistUsage(
      {
        userId,
        conversationId,
        modelKey,
        inputMessages,
        outputTokensEstimate: outputTokens,
        reasoningContent: reasoning,
        providerUsagePayload,
      },
      usage,
    );

    await this.quotaService.recordUsage(userId, usage.totalTokens);
  }
}
