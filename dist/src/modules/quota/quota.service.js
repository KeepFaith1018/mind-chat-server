"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const businessException_1 = require("../../common/exception/businessException");
const errorCodeMap_1 = require("../../common/utils/errorCodeMap");
let QuotaService = class QuotaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkQuota(userId) {
        let quota = await this.prisma.usageQuota.findUnique({
            where: { userId },
        });
        if (!quota) {
            quota = await this.prisma.usageQuota.create({
                data: {
                    userId,
                    dailyTokenLimit: 500000,
                    dailyTokenUsage: 0,
                    totalTokenUsage: 0,
                },
            });
        }
        const today = new Date();
        const lastRequest = quota.lastRequestAt || new Date(0);
        if (lastRequest.getDate() !== today.getDate() ||
            lastRequest.getMonth() !== today.getMonth() ||
            lastRequest.getFullYear() !== today.getFullYear()) {
            await this.prisma.usageQuota.update({
                where: { userId },
                data: { dailyTokenUsage: 0, lastRequestAt: today },
            });
            return true;
        }
        if (quota.dailyTokenUsage >= quota.dailyTokenLimit) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.EMAIL_RATE_LIMIT, '今日对话额度已用完');
        }
        return true;
    }
    async recordUsage(userId, tokens) {
        if (tokens <= 0)
            return;
        await this.prisma.usageQuota.update({
            where: { userId },
            data: {
                dailyTokenUsage: { increment: tokens },
                totalTokenUsage: { increment: tokens },
                lastRequestAt: new Date(),
            },
        });
    }
};
exports.QuotaService = QuotaService;
exports.QuotaService = QuotaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuotaService);
//# sourceMappingURL=quota.service.js.map