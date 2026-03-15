"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const errorCodeMap_1 = require("../../common/utils/errorCodeMap");
const businessException_1 = require("../../common/exception/businessException");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async oauthLogin(dto) {
        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.email },
                    {
                        accounts: {
                            some: {
                                provider: dto.provider,
                                providerId: dto.providerId,
                            },
                        },
                    },
                ],
            },
            include: {
                accounts: true,
            },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    name: dto.name || dto.email.split('@')[0],
                    avatarUrl: dto.avatarUrl,
                    accounts: {
                        create: {
                            provider: dto.provider,
                            providerId: dto.providerId,
                            accessToken: dto.accessToken,
                        },
                    },
                    quota: {
                        create: {
                            dailyTokenLimit: 500000,
                        },
                    },
                },
                include: {
                    accounts: true,
                },
            });
        }
        else {
            const account = user.accounts.find((a) => a.provider === dto.provider && a.providerId === dto.providerId);
            if (account) {
                if (dto.accessToken) {
                    await this.prisma.account.update({
                        where: { id: account.id },
                        data: { accessToken: dto.accessToken },
                    });
                }
            }
            else {
                await this.prisma.account.create({
                    data: {
                        userId: user.id,
                        provider: dto.provider,
                        providerId: dto.providerId,
                        accessToken: dto.accessToken,
                    },
                });
            }
        }
        const tokens = await this.signTokens(user.id, user.email);
        return {
            user: this.excludePassword(user),
            ...tokens,
        };
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_USER_EXISTS);
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name || dto.email.split('@')[0],
            },
        });
        const tokens = await this.signTokens(user.id, user.email);
        return {
            user: this.excludePassword(user),
            ...tokens,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || !user.passwordHash) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS);
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS);
        }
        const tokens = await this.signTokens(user.id, user.email);
        return {
            user: this.excludePassword(user),
            ...tokens,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken);
            if (payload.type !== 'refresh') {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
            }
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub.toString() },
            });
            if (!user) {
                throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_USER_NOT_FOUND);
            }
            return this.signTokens(user.id, user.email);
        }
        catch (e) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
        }
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_USER_NOT_FOUND);
        }
        return this.excludePassword(user);
    }
    async signTokens(userId, email) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, email, type: 'access' }, { expiresIn: '15m' }),
            this.jwtService.signAsync({ sub: userId, type: 'refresh' }, { expiresIn: '7d' }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    excludePassword(user) {
        const { passwordHash, ...result } = user;
        return result;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map