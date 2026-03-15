import { Injectable } from '@nestjs/common';
import { OAuthProvider } from './oauth-user.interface';
import { GithubOAuthProvider } from './providers/github.provider';
import { GoogleOAuthProvider } from './providers/google.provider';
import { BusinessException } from '@app/common/exception/businessException';
import { ErrorCode } from '@app/common/utils/errorCodeMap';
import * as crypto from 'crypto';
import { AuthService } from '../auth.service';

@Injectable()
export class OAuthService {
  private readonly providers: Record<string, OAuthProvider>;

  constructor(
    private readonly githubProvider: GithubOAuthProvider,
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly authService: AuthService,
  ) {
    this.providers = {
      github: githubProvider,
      google: googleProvider,
    };
  }

  getRedirectUrl(providerName: string): { url: string; state: string } {
    const provider = this.getProvider(providerName);
    const state = crypto.randomBytes(16).toString('hex');
    const url = provider.getRedirectUrl(state);
    return { url, state };
  }

  async login(
    providerName: string,
    code: string,
    state: string,
    savedState?: string,
  ) {
    if (!state || state !== savedState) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的状态码(state)');
    }

    const provider = this.getProvider(providerName);
    const oauthUser = await provider.getUser(code);

    return this.authService.oauthLogin({
      email: oauthUser.email,
      provider: oauthUser.provider,
      providerId: oauthUser.providerId,
      name: oauthUser.name,
      avatarUrl: oauthUser.avatarUrl,
      accessToken: oauthUser.accessToken,
    });
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
}
