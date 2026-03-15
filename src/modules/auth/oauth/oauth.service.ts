import { Injectable } from '@nestjs/common';
import { OAuthProvider } from './oauth-user.interface';
import { GithubOAuthProvider } from './providers/github.provider';
import { GoogleOAuthProvider } from './providers/google.provider';
import { BusinessException } from '@app/common/exception/businessException';
import { ErrorCode } from '@app/common/utils/errorCodeMap';
import * as crypto from 'crypto';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OAuthService {
  private readonly providers: Record<string, OAuthProvider>;
  private readonly stateMaxAgeMs = 10 * 60 * 1000;

  constructor(
    private readonly githubProvider: GithubOAuthProvider,
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.providers = {
      github: githubProvider,
      google: googleProvider,
    };
  }

  getRedirectUrl(
    providerName: string,
    redirect?: string,
  ): { url: string; state: string } {
    const provider = this.getProvider(providerName);
    const state = this.generateSignedState(providerName, redirect);
    const url = provider.getRedirectUrl(state);
    return { url, state };
  }

  async login(providerName: string, code: string, state: string) {
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

  private getProvider(name: string): OAuthProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new BusinessException(
        ErrorCode.PARAM_ERROR,
        `不支持的 OAuth 提供商: ${name}`,
      );
    }
    return provider;
  }

  private generateSignedState(providerName: string, redirect?: string): string {
    const payload = {
      provider: providerName,
      ts: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
      redirect: this.normalizeRedirect(redirect),
    };

    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = crypto
      .createHmac('sha256', this.getStateSecret())
      .update(payloadEncoded)
      .digest('base64url');

    return `${payloadEncoded}.${signature}`;
  }

  private verifySignedState(state: string, providerName: string): string {
    if (!state) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的状态码(state)');
    }

    const [payloadEncoded, signature] = state.split('.');
    if (!payloadEncoded || !signature) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的状态码(state)');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.getStateSecret())
      .update(payloadEncoded)
      .digest('base64url');

    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    ) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的状态码(state)');
    }

    let payload: {
      provider?: string;
      ts?: number;
      redirect?: string;
    };

    try {
      payload = JSON.parse(
        Buffer.from(payloadEncoded, 'base64url').toString('utf8'),
      ) as { provider?: string; ts?: number; redirect?: string };
    } catch {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的状态码(state)');
    }

    if (
      !payload.ts ||
      Date.now() - payload.ts > this.stateMaxAgeMs ||
      payload.provider !== providerName
    ) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的状态码(state)');
    }

    return this.normalizeRedirect(payload.redirect);
  }

  private normalizeRedirect(redirect?: string): string {
    if (!redirect || !redirect.startsWith('/')) {
      return '/';
    }
    if (redirect.startsWith('//')) {
      return '/';
    }
    return redirect;
  }

  private getStateSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET') || 'default_state_secret'
    );
  }
}
