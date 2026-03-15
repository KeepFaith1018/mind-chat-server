import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { BusinessException } from '@common/exception/businessException';
import { ErrorCode } from '@common/utils/errorCodeMap';
import { randomBytes } from 'node:crypto';
import { CreateShareDto } from './dto/create-share.dto';

interface ShareRecord {
  id: string;
  expires_at: Date | null;
  conversation_id?: string;
}

interface SharedConversationRow {
  id: string;
  title: string;
  model_id: string;
  created_at: Date;
  updated_at: Date;
}

interface SharedMessageRow {
  role: string;
  content: string;
  created_at: Date;
}

@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createShareLink(userId: string, dto: CreateShareDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId, userId },
      select: { id: true, title: true },
    });

    if (!conversation) {
      throw new BusinessException(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    const linkId = await this.generateUniqueLinkId();
    const expiresAt = dto.expireHours
      ? new Date(Date.now() + dto.expireHours * 3600 * 1000)
      : null;

    await this.prisma.$executeRaw`
      INSERT INTO shareable_links (
        id,
        conversation_id,
        expires_at,
        is_active,
        created_at
      )
      VALUES (
        ${linkId},
        ${dto.conversationId}::uuid,
        ${expiresAt},
        true,
        now()
      )
    `;

    return {
      linkId,
      shareUrl: this.buildShareUrl(linkId),
      expiresAt,
    };
  }

  async getSharedConversation(linkId: string) {
    const share = await this.prisma.$queryRaw<ShareRecord[]>`
      SELECT
        id,
        expires_at,
        conversation_id
      FROM shareable_links
      WHERE id = ${linkId}
        AND is_active = true
      LIMIT 1
    `;

    const record = share[0];
    if (!record) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '分享链接不存在或已失效',
      );
    }
    if (record.expires_at && record.expires_at.getTime() < Date.now()) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '分享链接已过期');
    }

    const conversationRows = await this.prisma.$queryRaw<
      SharedConversationRow[]
    >`
      SELECT
        id,
        title,
        model_id,
        created_at,
        updated_at
      FROM conversations
      WHERE id = ${record.conversation_id}::uuid
      LIMIT 1
    `;
    const conversation = conversationRows[0];

    if (!conversation) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '分享内容不存在');
    }

    const messages = await this.prisma.$queryRaw<SharedMessageRow[]>`
      SELECT
        role,
        content,
        created_at
      FROM messages
      WHERE conversation_id = ${conversation.id}::uuid
      ORDER BY created_at ASC
    `;

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        modelId: conversation.model_id,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messages: messages.map((item) => ({
          role: item.role,
          content: item.content,
          createdAt: item.created_at,
        })),
      },
      share: {
        id: record.id,
        expiresAt: record.expires_at,
      },
    };
  }

  async renderSharePage(linkId: string): Promise<string> {
    const payload = await this.getSharedConversation(linkId);
    const messagesHtml = payload.conversation.messages
      .map((item) => {
        const role = item.role === 'assistant' ? 'AI' : '用户';
        const roleClass = item.role === 'assistant' ? 'assistant' : 'user';
        return `<div class="msg ${roleClass}">
  <div class="role">${role}</div>
  <pre>${this.escapeHtml(item.content)}</pre>
  <div class="time">${new Date(item.createdAt).toLocaleString()}</div>
</div>`;
      })
      .join('\n');

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AI 对话分享</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto;background:#f6f8fb;margin:0;padding:24px;color:#1f2937}
    .wrap{max-width:900px;margin:0 auto}
    h1{font-size:24px;margin:0 0 8px}
    .meta{color:#6b7280;font-size:13px;margin-bottom:20px}
    .msg{background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .msg.user{border-left:4px solid #2563eb}
    .msg.assistant{border-left:4px solid #10b981}
    .role{font-weight:600;font-size:13px;margin-bottom:8px}
    pre{white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.6}
    .time{margin-top:8px;color:#9ca3af;font-size:12px}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${this.escapeHtml(payload.conversation.title || '对话分享')}</h1>
    <div class="meta">只读分享页面 · 共 ${payload.conversation.messages.length} 条消息</div>
    ${messagesHtml}
  </div>
</body>
</html>`;
  }

  private buildShareUrl(linkId: string): string {
    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3001';
    return `${appUrl}/v1/share/${linkId}/page`;
  }

  private async generateUniqueLinkId(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const linkId = randomBytes(9).toString('base64url');
      const exists = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM shareable_links WHERE id = ${linkId} LIMIT 1
      `;
      if (!exists[0]) {
        return linkId;
      }
    }
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, '生成分享链接失败');
  }

  private escapeHtml(content: string): string {
    return content
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
