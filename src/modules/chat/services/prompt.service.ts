import { Inject, Injectable } from '@nestjs/common';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ChatMessageDto } from '../dto/chat.dto';

interface BuildMessageOptions {
  reasoningEnabled?: boolean;
  webSearchEnabled?: boolean;
  webSearchContext?: string;
}

@Injectable()
export class PromptService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 构建 LangChain 消息列表
   * 包含：历史消息截断、文件上下文注入、System Prompt
   */
  async buildMessages(
    userId: string,
    messages: ChatMessageDto[],
    fileIds?: string[],
    options?: BuildMessageOptions,
  ): Promise<BaseMessage[]> {
    const fileContext = await this.buildFileContext(userId, fileIds);
    const webSearchContext = options?.webSearchContext || '';
    this.logger.info('AIPrompt.ContextLoaded', {
      userId,
      fileRequestedCount: fileIds?.length || 0,
      hasFileContext: Boolean(fileContext),
      fileContextLength: fileContext.length,
      webSearchEnabled: Boolean(options?.webSearchEnabled),
      hasWebSearchContext: Boolean(webSearchContext),
      webSearchContextLength: webSearchContext.length,
      reasoningEnabled: Boolean(options?.reasoningEnabled),
    });

    // 2. 截断历史消息 (保留最近 20 条，避免 Token 溢出)
    // 假设 messages 是前端传来的全量历史，或者我们从数据库加载
    const maxHistory = 20;
    const recentMessages = messages.slice(-maxHistory);

    // 3. 转换消息对象
    const langChainMessages: BaseMessage[] = recentMessages.map((m, index) => {
      let content = m.content;

      const contexts: string[] = [];
      if (fileContext) {
        contexts.push(fileContext);
      }
      if (webSearchContext) {
        contexts.push(webSearchContext);
      }

      if (
        index === recentMessages.length - 1 &&
        m.role === 'user' &&
        contexts.length > 0
      ) {
        content = `${contexts.join(
          '\n',
        )}\n\n重要提示：以上内容为参考资料。请优先基于参考资料回答用户问题，如果参考资料中没有相关信息请明确说明，并给出保守结论。\n\n用户问题：${content}`;
      }

      switch (m.role) {
        case 'user':
          return new HumanMessage(content);
        case 'assistant':
          return new AIMessage(content);
        case 'system':
          return new SystemMessage(content);
        default:
          return new HumanMessage(content);
      }
    });

    // 4. 添加默认 System Prompt (如果第一条不是 System)
    if (!(langChainMessages[0] instanceof SystemMessage)) {
      langChainMessages.unshift(
        new SystemMessage(
          '你是一个智能助手 MindChat，请用简洁、专业的语言回答用户问题。',
        ),
      );
    }

    if (options?.reasoningEnabled === false) {
      langChainMessages.unshift(
        new SystemMessage('请直接给出答案，不要输出详细推理过程。'),
      );
    }

    if (options?.webSearchEnabled) {
      langChainMessages.unshift(
        new SystemMessage('如果缺少足够信息，请明确说明并给出保守结论。'),
      );
      if (!webSearchContext) {
        langChainMessages.unshift(
          new SystemMessage(
            '本轮联网检索未返回可用结果。对于“最新/实时/时效性”问题，不要使用不确定的历史记忆作事实结论，请明确说明无法获取实时信息。',
          ),
        );
      }
    }

    this.logger.info('AIPrompt.Built', {
      userId,
      recentMessageCount: recentMessages.length,
      outputMessageCount: langChainMessages.length,
      hasInjectedFileContext: Boolean(fileContext),
      hasInjectedWebSearchContext: Boolean(webSearchContext),
    });

    return langChainMessages;
  }

  private async buildFileContext(userId: string, fileIds?: string[]) {
    if (!fileIds || fileIds.length === 0) return '';

    const files = await this.prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId,
      },
    });

    if (files.length === 0) {
      this.logger.info('AIPrompt.FileUsage', {
        userId,
        requestedFileIds: fileIds,
        usedFileCount: 0,
        usedFiles: [],
      });
      return '';
    }

    this.logger.info('AIPrompt.FileUsage', {
      userId,
      requestedFileIds: fileIds,
      usedFileCount: files.length,
      usedFiles: files.slice(0, 5).map((file) => ({
        id: file.id,
        filename: file.filename,
      })),
    });

    let context = `\n\n=== 参考资料开始 ===\n`;
    files.forEach((f, index) => {
      // 简单防护：移除可能导致 Prompt 逃逸的特殊字符
      const safeContent = f.content?.replace(/=== 参考资料/g, '') || '';
      context += `\n[资料 ${index + 1}: ${f.filename}]\n${safeContent}\n`;
    });
    context += `\n=== 参考资料结束 ===\n`;

    return context;
  }
}
