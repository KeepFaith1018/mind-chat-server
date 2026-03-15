import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProvider, OAuthUser } from '../oauth-user.interface';
import { BusinessException } from '../../../../common/exception/businessException';
import { ErrorCode } from '../../../../common/utils/errorCodeMap';

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  constructor(private readonly configService: ConfigService) {}

  getRedirectUrl(state: string): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        'Google Client ID 未配置',
      );
    }

    const redirectUri = `${
      process.env.APP_URL || 'http://localhost:3000'
    }/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getUser(code: string): Promise<OAuthUser> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${
      process.env.APP_URL || 'http://localhost:3000'
    }/api/auth/google/callback`;

    // 换取 Token
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
      throw new BusinessException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Google 授权失败',
      );
    }

    // 获取用户信息
    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      },
    ).then((r) => r.json());

    if (!userResponse.email) {
      throw new BusinessException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        '未获取到 Google 邮箱',
      );
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
}
