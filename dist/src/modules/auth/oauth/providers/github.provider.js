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
exports.GithubOAuthProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const businessException_1 = require("../../../../common/exception/businessException");
const errorCodeMap_1 = require("../../../../common/utils/errorCodeMap");
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';
let GithubOAuthProvider = class GithubOAuthProvider {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    getRedirectUrl(state) {
        const clientId = this.configService.get('GITHUB_CLIENT_ID');
        const appUrl = this.configService.get('APP_URL');
        if (!clientId || !appUrl) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.INTERNAL_ERROR, 'GitHub OAuth 配置缺失');
        }
        const redirectUri = `${appUrl}/api/auth/github/callback`;
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'read:user user:email',
            state,
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }
    async getUser(code) {
        const clientId = this.configService.get('GITHUB_CLIENT_ID');
        const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');
        if (!clientId || !clientSecret) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.INTERNAL_ERROR, 'GitHub OAuth 配置缺失');
        }
        const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });
        const tokenData = (await tokenResponse.json());
        if (!tokenData.access_token || tokenData.error) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS, 'GitHub 授权失败');
        }
        const headers = {
            Authorization: `token ${tokenData.access_token}`,
            'User-Agent': 'MindChat-App',
        };
        const userRes = await fetch(GITHUB_USER_URL, { headers });
        const user = (await userRes.json());
        const emailRes = await fetch(GITHUB_EMAILS_URL, { headers });
        const emails = (await emailRes.json());
        const primaryEmail = emails.find((e) => e.primary && e.verified)?.email || user.email;
        if (!primaryEmail) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.AUTH_INVALID_CREDENTIALS, '未获取到 GitHub 邮箱');
        }
        return {
            email: primaryEmail,
            provider: 'github',
            providerId: String(user.id),
            name: user.name || user.login,
            avatarUrl: user.avatar_url,
            accessToken: tokenData.access_token,
        };
    }
};
exports.GithubOAuthProvider = GithubOAuthProvider;
exports.GithubOAuthProvider = GithubOAuthProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GithubOAuthProvider);
//# sourceMappingURL=github.provider.js.map