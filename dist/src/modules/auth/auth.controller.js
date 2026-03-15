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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const auth_guard_1 = require("../../common/guards/auth.guard");
const currentUser_decorator_1 = require("../../common/decorators/currentUser.decorator");
const businessException_1 = require("../../common/exception/businessException");
const errorCodeMap_1 = require("../../common/utils/errorCodeMap");
const oauth_service_1 = require("./oauth/oauth.service");
let AuthController = class AuthController {
    authService;
    oauthService;
    constructor(authService, oauthService) {
        this.authService = authService;
        this.oauthService = oauthService;
    }
    oauthRedirect(provider, res) {
        const { url, state } = this.oauthService.getRedirectUrl(provider);
        res.cookie(`${provider}_oauth_state`, state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 10 * 60 * 1000,
        });
        res.redirect(url);
    }
    async oauthCallback(provider, code, state, req, res) {
        if (!['github', 'google'].includes(provider)) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.NOT_FOUND);
        }
        const savedState = req.cookies[`${provider}_oauth_state`];
        res.clearCookie(`${provider}_oauth_state`);
        const data = await this.oauthService.login(provider, code, state, savedState);
        this.setCookies(res, data.accessToken, data.refreshToken);
        res.redirect('/');
    }
    async register(dto, res) {
        const data = await this.authService.register(dto);
        this.setCookies(res, data.accessToken, data.refreshToken);
        return data.user;
    }
    async login(dto, res) {
        const data = await this.authService.login(dto);
        this.setCookies(res, data.accessToken, data.refreshToken);
        return data.user;
    }
    logout(res) {
        res.clearCookie('token');
        res.clearCookie('refresh_token');
        return null;
    }
    async refresh(req, res) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) {
            throw new businessException_1.BusinessException(errorCodeMap_1.ErrorCode.UNAUTHORIZED, 'Refresh token not found');
        }
        const data = await this.authService.refreshToken(refreshToken);
        this.setCookies(res, data.accessToken, data.refreshToken);
        return null;
    }
    async getProfile(user) {
        return await this.authService.getProfile(user.sub.toString());
    }
    setCookies(res, accessToken, refreshToken) {
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('oauth/:provider'),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "oauthRedirect", null);
__decorate([
    (0, common_1.Get)(':provider/callback'),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Query)('code')),
    __param(2, (0, common_1.Query)('state')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, currentUser_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        oauth_service_1.OAuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map