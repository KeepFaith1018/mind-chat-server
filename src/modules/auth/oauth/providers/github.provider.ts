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
  error_description?: string;
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

    const redirectUri = `${appUrl}/v1/auth/github/callback`;

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

    let tokenData: GithubTokenResponse;
    try {
      console.log('[GitHub OAuth] exchange code for token', {
        tokenUrl: GITHUB_TOKEN_URL,
        hasHttpProxy: Boolean(process.env.HTTP_PROXY),
        hasHttpsProxy: Boolean(process.env.HTTPS_PROXY),
        nodeEnv: process.env.NODE_ENV,
      });

      const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[GitHub OAuth] token endpoint returned non-2xx', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          body: errorText.slice(0, 500),
        });
      }

      tokenData = (await tokenResponse.json()) as GithubTokenResponse;
    } catch (error) {
      console.error('[GitHub OAuth] token request failed', {
        reason: this.getErrorDetail(error),
      });
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        '无法连接 GitHub OAuth 服务，请检查服务器网络或代理',
      );
    }

    if (!tokenData.access_token || tokenData.error) {
      throw new BusinessException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        tokenData.error_description || 'GitHub 授权失败',
      );
    }

    const headers = {
      Authorization: `token ${tokenData.access_token}`,
      'User-Agent': 'MindChat-App',
    };

    let user: GithubUserResponse;
    let emails: GithubEmail[];
    try {
      const userRes = await fetch(GITHUB_USER_URL, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!userRes.ok) {
        const userErrorText = await userRes.text();
        console.error('[GitHub OAuth] user endpoint returned non-2xx', {
          status: userRes.status,
          statusText: userRes.statusText,
          body: userErrorText.slice(0, 500),
        });
      }
      user = (await userRes.json()) as GithubUserResponse;

      const emailRes = await fetch(GITHUB_EMAILS_URL, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!emailRes.ok) {
        const emailErrorText = await emailRes.text();
        console.error('[GitHub OAuth] emails endpoint returned non-2xx', {
          status: emailRes.status,
          statusText: emailRes.statusText,
          body: emailErrorText.slice(0, 500),
        });
      }
      emails = (await emailRes.json()) as GithubEmail[];
    } catch (error) {
      console.error('[GitHub OAuth] user profile request failed', {
        reason: this.getErrorDetail(error),
      });
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        '无法获取 GitHub 用户信息，请检查服务器网络或代理',
      );
    }

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

  private getErrorDetail(error: unknown) {
    const err = error as {
      name?: string;
      message?: string;
      stack?: string;
      cause?: unknown;
      code?: string;
      errno?: number | string;
      syscall?: string;
      hostname?: string;
    };

    const cause = err.cause as
      | {
          name?: string;
          message?: string;
          code?: string;
          errno?: number | string;
          syscall?: string;
          hostname?: string;
        }
      | undefined;

    return {
      name: err.name,
      message: err.message,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      hostname: err.hostname,
      cause: cause
        ? {
            name: cause.name,
            message: cause.message,
            code: cause.code,
            errno: cause.errno,
            syscall: cause.syscall,
            hostname: cause.hostname,
          }
        : undefined,
      stack: err.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }
}
