import { ConfigService } from '@nestjs/config';
import { OAuthProvider, OAuthUser } from '../oauth-user.interface';
export declare class GoogleOAuthProvider implements OAuthProvider {
    private readonly configService;
    constructor(configService: ConfigService);
    getRedirectUrl(state: string): string;
    getUser(code: string): Promise<OAuthUser>;
}
