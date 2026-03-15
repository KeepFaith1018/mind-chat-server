import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查用户配额
   */
  async checkQuota(userId: string) {
    let quota = await this.prisma.usageQuota.findUnique({
      where: { userId },
    });

    if (!quota) {
      // 如果没有配额记录，初始化默认配额
      quota = await this.prisma.usageQuota.create({
        data: {
          userId,
          dailyTokenLimit: 500000,
          dailyTokenUsage: 0,
          totalTokenUsage: 0,
        },
      });
    }

    // 检查每日限额 (简单实现，实际可能需要按天重置逻辑，这里假设 dailyTokenUsage 每日由定时任务重置，或者每次请求判断日期)
    // 更好的做法是记录 lastRequestAt，如果跨天了则重置
    const today = new Date();
    const lastRequest = quota.lastRequestAt || new Date(0);
    
    if (
      lastRequest.getDate() !== today.getDate() ||
      lastRequest.getMonth() !== today.getMonth() ||
      lastRequest.getFullYear() !== today.getFullYear()
    ) {
      // 跨天重置
      await this.prisma.usageQuota.update({
        where: { userId },
        data: { dailyTokenUsage: 0, lastRequestAt: today },
      });
      return true;
    }

    if (quota.dailyTokenUsage >= quota.dailyTokenLimit) {
      throw new BusinessException(
        ErrorCode.EMAIL_RATE_LIMIT, // 暂时复用 Rate Limit 错误，最好新增 QUOTA_EXCEEDED
        '今日对话额度已用完',
      );
    }

    return true;
  }

  /**
   * 记录 Token 消耗
   */
  async recordUsage(userId: string, tokens: number) {
    if (tokens <= 0) return;

    await this.prisma.usageQuota.update({
      where: { userId },
      data: {
        dailyTokenUsage: { increment: tokens },
        totalTokenUsage: { increment: tokens },
        lastRequestAt: new Date(),
      },
    });
  }
}
