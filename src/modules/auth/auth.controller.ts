import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Response, Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';
import { JwtUser } from '@app/types/jwtUser.interface';
import { OAuthService } from './oauth/oauth.service';
import { Auth } from '@app/common/decorators/auth.decorator';
import { ConfigService } from '@nestjs/config';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  // 统一 OAuth 跳转接口: /auth/oauth/github, /auth/oauth/google
  @Get('oauth/:provider')
  oauthRedirect(
    @Param('provider') provider: string,
    @Res() res: Response,
    @Query('redirect') redirect?: string,
  ) {
    const { url } = this.oauthService.getRedirectUrl(provider, redirect);
    res.redirect(url);
  }

  @Get(':provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!['github', 'google'].includes(provider)) {
      throw new BusinessException(ErrorCode.NOT_FOUND);
    }

    const data = await this.oauthService.login(provider, code, state);

    this.setCookies(res, data.accessToken, data.refreshToken);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = data.redirectUrl || '/';
    const finalUrl = this.toFrontendUrl(frontendUrl, redirectUrl);
    res.redirect(finalUrl);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(dto);
    this.setCookies(res, data.accessToken, data.refreshToken);
    return data.user;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(dto);
    this.setCookies(res, data.accessToken, data.refreshToken);
    return data.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    res.clearCookie('refresh_token');
    return null;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Refresh token not found',
      );
    }

    const data = await this.authService.refreshToken(refreshToken);
    this.setCookies(res, data.accessToken, data.refreshToken);
    return null;
  }

  @Get('me')
  @Auth()
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: JwtUser) {
    // 这里的 user 是 JWT payload，如果需要详细信息可以调 Service，或者直接返回
    // 建议调用 Service 获取最新用户信息（去除密码）
    return await this.authService.getProfile(user.sub.toString());
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000, // 15m
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    });
  }

  private toFrontendUrl(frontendUrl: string, redirectPath: string): string {
    try {
      return new URL(redirectPath, frontendUrl).toString();
    } catch {
      return frontendUrl;
    }
  }
}
