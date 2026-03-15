import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Response, Request } from 'express';
import { JwtUser } from '@app/types/jwtUser.interface';
import { OAuthService } from './oauth/oauth.service';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private readonly authService;
    private readonly oauthService;
    private readonly configService;
    constructor(authService: AuthService, oauthService: OAuthService, configService: ConfigService);
    oauthRedirect(provider: string, res: Response, redirect?: string): void;
    oauthCallback(provider: string, code: string, state: string, res: Response): Promise<void>;
    register(dto: RegisterDto, res: Response): Promise<{
        name: string | null;
        id: string;
        email: string;
        avatarUrl: string | null;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        name: string | null;
        id: string;
        email: string;
        avatarUrl: string | null;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    logout(res: Response): null;
    refresh(req: Request, res: Response): Promise<null>;
    getProfile(user: JwtUser): Promise<{
        name: string | null;
        id: string;
        email: string;
        avatarUrl: string | null;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private setCookies;
    private toFrontendUrl;
}
