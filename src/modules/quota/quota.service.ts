import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async checkQuota(userId: string) {
    let quota = await this.ensureQuota(userId);
    const today = new Date();
    const lastRequest = quota.lastRequestAt || new Date(0);

    if (
      lastRequest.getDate() !== today.getDate() ||
      lastRequest.getMonth() !== today.getMonth() ||
      lastRequest.getFullYear() !== today.getFullYear()
    ) {
      quota = await this.prisma.usageQuota.update({
        where: { userId },
        data: { dailyTokenUsage: 0, lastRequestAt: today },
      });
    }

    if (quota.dailyTokenUsage >= quota.dailyTokenLimit) {
      throw new BusinessException(
        ErrorCode.QUOTA_EXCEEDED,
        '今日对话额度已用完',
      );
    }

    return true;
  }

  async recordUsage(userId: string, tokens: number) {
    if (tokens <= 0) {
      return;
    }

    await this.ensureQuota(userId);
    await this.prisma.usageQuota.update({
      where: { userId },
      data: {
        dailyTokenUsage: { increment: tokens },
        totalTokenUsage: { increment: tokens },
        lastRequestAt: new Date(),
      },
    });
  }

  private async ensureQuota(userId: string) {
    return await this.prisma.usageQuota.upsert({
      where: { userId },
      create: {
        userId,
        dailyTokenLimit: 5000,
        dailyTokenUsage: 0,
        totalTokenUsage: 0,
      },
      update: {},
    });
  }
}
