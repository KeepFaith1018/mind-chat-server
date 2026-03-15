import { GithubOAuthProvider } from './providers/github.provider';
import { GoogleOAuthProvider } from './providers/google.provider';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
export declare class OAuthService {
    private readonly githubProvider;
    private readonly googleProvider;
    private readonly authService;
    private readonly configService;
    private readonly providers;
    private readonly stateMaxAgeMs;
    constructor(githubProvider: GithubOAuthProvider, googleProvider: GoogleOAuthProvider, authService: AuthService, configService: ConfigService);
    getRedirectUrl(providerName: string, redirect?: string): {
        url: string;
        state: string;
    };
    login(providerName: string, code: string, state: string): Promise<{
        redirectUrl: string;
        accessToken: string;
        refreshToken: string;
        user: {
            email: string;
            avatarUrl: string | null;
            name: string | null;
            id: string;
            status: number;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    private getProvider;
    private generateSignedState;
    private verifySignedState;
    private normalizeRedirect;
    private getStateSecret;
}
