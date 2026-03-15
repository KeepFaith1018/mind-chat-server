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
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const github_provider_1 = require("./providers/github.provider");
const google_provider_1 = require("./providers/google.provider");
const businessException_1 = require("../../../common/exception/businessException");
const errorCodeMap_1 = require("../../../common/utils/errorCodeMap");
const crypto = __importStar(require("crypto"));
const auth_service_1 = require("../auth.service");
const config_1 = require("@nestjs/config");
let OAuthService = class OAuthService {
    githubProvider;
    googleProvider;
    authService;
    configService;
    providers;
    stateMaxAgeMs = 10 * 60 * 1000;
    constructor(githubProvider, googleProvider, authService, configService) {
        this.githubProvider = githubProvider;
        this.googleProvider = googleProvider;
        this.authService = authService;
        this.configService = configService;
        this.providers = {
            github: githubProvider,
            google: googleProvider,
        };
    }
    getRedirectUrl(providerName, redirect) {
        const provider = this.getProvider(providerName);
        const state = this.generateSignedState(providerName, redirect);
        const url = provider.getRedirectUrl(state);
        return { url, state };
    }
    async login(providerName, code, state) {
        const redirectUrl = this.verifySignedState(state, providerName);
        const provider = this.getProvider(providerName);
        const oauthUser = await provider.getUser(code);
        const authData = await this.authService.oauthLogin({
            email: oauthUser.email,
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            name: oauthUser.name,
            avatarUrl: oauthUser.avatarUrl,
            accessToken: oauthUser.accessToken,
        });
        return {
            ...authData,
            redirectUrl,
        };
    }
    getProvider(name) {
        const provider = this.providers[name];
        if (!provider) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, `不支持的 OAuth 提供商: ${name}`);
        }
        return provider;
    }
    generateSignedState(providerName, redirect) {
        const payload = {
            provider: providerName,
            ts: Date.now(),
            nonce: crypto.randomBytes(16).toString('hex'),
            redirect: this.normalizeRedirect(redirect),
        };
        const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', this.getStateSecret())
            .update(payloadEncoded)
            .digest('base64url');
        return `${payloadEncoded}.${signature}`;
    }
    verifySignedState(state, providerName) {
        if (!state) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, '无效的状态码(state)');
        }
        const [payloadEncoded, signature] = state.split('.');
        if (!payloadEncoded || !signature) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, '无效的状态码(state)');
        }
        const expectedSignature = crypto
            .createHmac('sha256', this.getStateSecret())
            .update(payloadEncoded)
            .digest('base64url');
        const provided = Buffer.from(signature);
        const expected = Buffer.from(expectedSignature);
        if (provided.length !== expected.length ||
            !crypto.timingSafeEqual(provided, expected)) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, '无效的状态码(state)');
        }
        let payload;
        try {
            payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
        }
        catch {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, '无效的状态码(state)');
        }
        if (!payload.ts ||
            Date.now() - payload.ts > this.stateMaxAgeMs ||
            payload.provider !== providerName) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.PARAM_ERROR, '无效的状态码(state)');
        }
        return this.normalizeRedirect(payload.redirect);
    }
    normalizeRedirect(redirect) {
        if (!redirect || !redirect.startsWith('/')) {
            return '/';
        }
        if (redirect.startsWith('//')) {
            return '/';
        }
        return redirect;
    }
    getStateSecret() {
        return (this.configService.get('JWT_SECRET') || 'default_state_secret');
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [github_provider_1.GithubOAuthProvider,
        google_provider_1.GoogleOAuthProvider,
        auth_service_1.AuthService,
        config_1.ConfigService])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map