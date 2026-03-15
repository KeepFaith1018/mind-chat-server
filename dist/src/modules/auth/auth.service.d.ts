import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { OAuthLoginDto } from './dto/oauth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    oauthLogin(dto: OAuthLoginDto): Promise<{
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
    register(dto: RegisterDto): Promise<{
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
    login(dto: LoginDto): Promise<{
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
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(userId: string): Promise<{
        email: string;
        name: string | null;
        avatarUrl: string | null;
        id: string;
        status: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private signTokens;
    private excludePassword;
}
