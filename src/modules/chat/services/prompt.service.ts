import { Injectable } from '@nestjs/common';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ChatMessageDto } from '../dto/chat.dto';

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 构建 LangChain 消息列表
   * 包含：历史消息截断、文件上下文注入、System Prompt
   */
  async buildMessages(
    userId: string,
    messages: ChatMessageDto[],
    fileIds?: string[],
  ): Promise<BaseMessage[]> {
    // 1. 处理文件上下文
    const fileContext = await this.buildFileContext(userId, fileIds);

    // 2. 截断历史消息 (保留最近 20 条，避免 Token 溢出)
    // 假设 messages 是前端传来的全量历史，或者我们从数据库加载
    const maxHistory = 20;
    const recentMessages = messages.slice(-maxHistory);

    // 3. 转换消息对象
    const langChainMessages: BaseMessage[] = recentMessages.map((m, index) => {
      let content = m.content;

      // 在最后一条用户消息前注入文件上下文
      if (
        index === recentMessages.length - 1 &&
        m.role === 'user' &&
        fileContext
      ) {
        // Prompt Injection 防护提示
        content = `${fileContext}\n\n重要提示：以上内容为参考资料。请仅基于参考资料回答用户问题。如果参考资料中没有相关信息，请直接说明。\n\n用户问题：${content}`;
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

    if (files.length === 0) return '';

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
