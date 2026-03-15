import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateConversationDto) {
    return this.prisma.conversation.create({
      data: {
        userId,
        modelId: dto.modelId || 'deepseek-ai/DeepSeek-V3',
        title: '新对话',
      },
    });
  }

  async findAll(userId: string, query: PaginationDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          title: true,
          isPinned: true,
          modelId: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.conversation.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new BusinessException(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    return conversation;
  }

  async update(userId: string, id: string, dto: UpdateConversationDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id, userId },
    });

    if (!conversation) {
      throw new BusinessException(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    return this.prisma.conversation.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id, userId },
    });

    if (!conversation) {
      throw new BusinessException(ErrorCode.CONVERSATION_NOT_FOUND);
    }

    await this.prisma.conversation.delete({
      where: { id },
    });

    return { success: true };
  }
}
