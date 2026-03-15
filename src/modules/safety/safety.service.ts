import { Injectable } from '@nestjs/common';
import { BusinessException } from '@app/common/exception/businessException';
import { ErrorCode } from '@app/common/utils/errorCodeMap';
import { ChatMessageDto } from '../chat/dto/chat.dto';

interface OutputFilterResult {
  safeText: string;
  blocked: boolean;
  reason?: string;
}

@Injectable()
export class SafetyService {
  private readonly inputBlockPatterns: RegExp[] = [
    /ignore\s+previous\s+instructions/i,
    /reveal\s+system\s+prompt/i,
    /developer\s+message/i,
    /bypass\s+safety/i,
    /jailbreak/i,
  ];

  private readonly outputBlockPatterns: RegExp[] = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /BEGIN\s+PRIVATE\s+KEY/i,
    /sk-[a-z0-9]{20,}/i,
  ];

  assertSafeInput(messages: ChatMessageDto[]): void {
    const latestUserMessage = this.findLatestUserMessage(messages);
    if (!latestUserMessage) {
      return;
    }

    for (const pattern of this.inputBlockPatterns) {
      if (pattern.test(latestUserMessage)) {
        throw new BusinessException(
          ErrorCode.FORBIDDEN,
          '输入触发安全策略，请调整提问方式',
        );
      }
    }
  }

  filterOutputChunk(text: string): OutputFilterResult {
    let safeText = text;
    let blocked = false;
    let reason: string | undefined;

    for (const pattern of this.outputBlockPatterns) {
      if (pattern.test(safeText)) {
        blocked = true;
        reason = '命中输出安全策略';
        safeText = '[内容因安全策略已拦截]';
        break;
      }
    }

    return { safeText, blocked, reason };
  }

  private findLatestUserMessage(messages: ChatMessageDto[]): string {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const item = messages[i];
      if (item?.role === 'user' && item.content?.trim()) {
        return item.content.trim();
      }
    }
    return '';
  }
}
