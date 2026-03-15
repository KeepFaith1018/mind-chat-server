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
exports.GoogleOAuthProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const businessException_1 = require("../../../../common/exception/businessException");
const errorCodeMap_1 = require("../../../../common/utils/errorCodeMap");
let GoogleOAuthProvider = class GoogleOAuthProvider {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    getRedirectUrl(state) {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        if (!clientId) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.INTERNAL_ERROR, 'Google Client ID 未配置');
        }
        const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async getUser(code) {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        }).then((r) => r.json());
        if (tokenResponse.error || !tokenResponse.access_token) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS, 'Google 授权失败');
        }
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
            },
        }).then((r) => r.json());
        if (!userResponse.email) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS, '未获取到 Google 邮箱');
        }
        return {
            email: userResponse.email,
            provider: 'google',
            providerId: userResponse.id,
            name: userResponse.name,
            avatarUrl: userResponse.picture,
            accessToken: tokenResponse.access_token,
        };
    }
};
exports.GoogleOAuthProvider = GoogleOAuthProvider;
exports.GoogleOAuthProvider = GoogleOAuthProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleOAuthProvider);
//# sourceMappingURL=google.provider.js.map