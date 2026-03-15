import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProvider, OAuthUser } from '../oauth-user.interface';
import { BusinessException } from '@app/common/exception/businessException';
import { ErrorCode } from '@app/common/utils/errorCodeMap';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
}

interface GithubUserResponse {
  id: number;
  login: string;
  name?: string;
  avatar_url?: string;
  email?: string;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class GithubOAuthProvider implements OAuthProvider {
  constructor(private readonly configService: ConfigService) {}

  getRedirectUrl(state: string): string {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const appUrl = this.configService.get<string>('APP_URL');

    if (!clientId || !appUrl) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        'GitHub OAuth 配置缺失',
      );
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

  async getUser(code: string): Promise<OAuthUser> {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        'GitHub OAuth 配置缺失',
      );
    }

    // 获取 AccessToken
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

    const tokenData = (await tokenResponse.json()) as GithubTokenResponse;

    if (!tokenData.access_token || tokenData.error) {
      throw new BusinessException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'GitHub 授权失败',
      );
    }

    const headers = {
      Authorization: `token ${tokenData.access_token}`,
      'User-Agent': 'MindChat-App',
    };

    // 获取用户信息
    const userRes = await fetch(GITHUB_USER_URL, { headers });
    const user = (await userRes.json()) as GithubUserResponse;

    // 获取邮箱
    const emailRes = await fetch(GITHUB_EMAILS_URL, { headers });
    const emails = (await emailRes.json()) as GithubEmail[];

    const primaryEmail =
      emails.find((e) => e.primary && e.verified)?.email || user.email;

    if (!primaryEmail) {
      throw new BusinessException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        '未获取到 GitHub 邮箱',
      );
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
}
