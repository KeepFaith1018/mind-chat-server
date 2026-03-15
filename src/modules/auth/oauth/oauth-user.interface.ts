export interface OAuthUser {
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: string;
  providerId: string;
  accessToken?: string;
}

export interface OAuthProvider {
  getRedirectUrl(state: string): string;
  getUser(code: string): Promise<OAuthUser>;
}
