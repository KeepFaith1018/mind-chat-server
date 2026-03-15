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

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly quotaService: QuotaService,
    private readonly promptService: PromptService,
  ) {}

  /**
   * 处理聊天请求
   */
  async chat(userId: string, dto: ChatDto, res: Response) {
    const sse = new SSEUtils(res);

    try {
      // 1. 检查配额
      await this.quotaService.checkQuota(userId);

      // 2. 准备会话 ID (原子操作优化)
      const conversationId = await this.getOrCreateConversation(userId, dto);
      sse.sendMeta({ conversationId });

      // 3. 异步持久化用户消息 (不阻塞流)
      this.saveUserMessage(conversationId, dto).catch((err) =>
        console.error('Save User Message Error:', err),
      );

      // 4. 构建 Prompt (包含文件上下文、历史截断、防护)
      const langChainMessages = await this.promptService.buildMessages(
        userId,
        dto.messages,
        dto.fileIds,
      );

      // 5. 调用 AI 模块获取流
      const modelId = dto.model || 'deepseek-ai/DeepSeek-V3';

      // 设置超时 (防止连接死锁)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60s 首字超时

      const stream = await this.aiService.streamChat(langChainMessages, {
        modelName: modelId,
        // signal: abortController.signal, // 需要 AiService 支持透传 signal
      });

      clearTimeout(timeoutId);

      // 6. 处理流式响应
      let fullContent = '';
      let fullReasoning = '';
      let outputTokens = 0;

      for await (const chunk of stream) {
        // 估算 Output Token
        outputTokens += 1; // 简单估算，LangChain chunk 通常是 token 粒度

        // 提取思考过程 (DeepSeek R1)
        const reasoning =
          (chunk.additional_kwargs?.reasoning_content as string) ||
          (chunk.response_metadata?.reasoning_content as string);

        if (reasoning) {
          fullReasoning += reasoning;
          sse.sendThinking(reasoning);
        }

        // 提取普通回复
        if (chunk.content) {
          const contentStr = chunk.content as string;
          fullContent += contentStr;
          sse.sendContent(contentStr);
        }
      }

      // 7. 结束流
      sse.sendDone();

      // 8. 异步后置处理 (持久化 AI 回复 & 扣费)
      this.handlePostChat(
        userId,
        conversationId,
        fullContent,
        fullReasoning,
        langChainMessages,
        outputTokens,
      ).catch((err) => console.error('Post Chat Error:', err));
    } catch (error) {
      console.error('Chat Error:', error);
      sse.sendError(error.message || 'Unknown error');
    }
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
      return conversation.id;
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
    return conversation.id;
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

    // 2. 扣费 (简易计算 Input Token)
    // 假设平均 1 token = 4 chars
    const inputChars = JSON.stringify(inputMessages).length;
    const inputTokens = Math.ceil(inputChars / 4);
    const totalTokens = inputTokens + outputTokens;

    await this.quotaService.recordUsage(userId, totalTokens);
  }
}
