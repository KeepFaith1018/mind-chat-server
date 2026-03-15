import { PrismaService } from '../../common/prisma/prisma.service';
export declare class QuotaService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    checkQuota(userId: string): Promise<boolean>;
    recordUsage(userId: string, tokens: number): Promise<void>;
}
