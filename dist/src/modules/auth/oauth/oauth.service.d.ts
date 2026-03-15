import { GithubOAuthProvider } from './providers/github.provider';
import { GoogleOAuthProvider } from './providers/google.provider';
import { AuthService } from '../auth.service';
export declare class OAuthService {
    private readonly githubProvider;
    private readonly googleProvider;
    private readonly authService;
    private readonly providers;
    constructor(githubProvider: GithubOAuthProvider, googleProvider: GoogleOAuthProvider, authService: AuthService);
    getRedirectUrl(providerName: string): {
        url: string;
        state: string;
    };
    login(providerName: string, code: string, state: string, savedState?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            email: string;
            name: string | null;
            avatarUrl: string | null;
            id: string;
            status: number;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    private getProvider;
}
