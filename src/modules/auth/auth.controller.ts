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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  // 统一 OAuth 跳转接口: /auth/oauth/github, /auth/oauth/google
  @Get('oauth/:provider')
  oauthRedirect(@Param('provider') provider: string, @Res() res: Response) {
    const { url, state } = this.oauthService.getRedirectUrl(provider);

    res.cookie(`${provider}_oauth_state`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10m
    });

    res.redirect(url);
  }

  // 统一 OAuth 回调接口: /auth/github/callback (保持兼容), 或 /auth/oauth/github/callback
  // 为了兼容之前的路由，这里分别处理，或者使用通配符
  @Get(':provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 简单的路由过滤，只处理 github 和 google，避免与 me/login 等冲突
    if (!['github', 'google'].includes(provider)) {
      // 如果不是 oauth provider，可能是其他接口误入（虽然 :provider 优先级低，但最好防范）
      // 由于 AuthController 还有 register/login 等固定路由，NestJS 会优先匹配固定路由
      throw new BusinessException(ErrorCode.NOT_FOUND);
    }

    const savedState = req.cookies[`${provider}_oauth_state`] as
      | string
      | undefined;
    res.clearCookie(`${provider}_oauth_state`);

    const data = await this.oauthService.login(
      provider,
      code,
      state,
      savedState,
    );

    this.setCookies(res, data.accessToken, data.refreshToken);
    res.redirect('/');
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
}
