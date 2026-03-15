import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Response, Request } from 'express';
import { JwtUser } from '@app/types/jwtUser.interface';
import { OAuthService } from './oauth/oauth.service';
export declare class AuthController {
    private readonly authService;
    private readonly oauthService;
    constructor(authService: AuthService, oauthService: OAuthService);
    oauthRedirect(provider: string, res: Response): void;
    oauthCallback(provider: string, code: string, state: string, req: Request, res: Response): Promise<void>;
    register(dto: RegisterDto, res: Response): Promise<{
        email: string;
        name: string | null;
        avatarUrl: string | null;
        id: string;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        email: string;
        name: string | null;
        avatarUrl: string | null;
        id: string;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    logout(res: Response): null;
    refresh(req: Request, res: Response): Promise<null>;
    getProfile(user: JwtUser): Promise<{
        email: string;
        name: string | null;
        avatarUrl: string | null;
        id: string;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private setCookies;
}
