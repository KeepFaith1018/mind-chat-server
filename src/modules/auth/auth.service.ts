import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { ErrorCode } from '../../common/utils/errorCodeMap';
import { BusinessException } from '../../common/exception/businessException';
import { OAuthLoginDto } from './dto/oauth.dto';
import { User } from '@prisma/client';
import { JwtUser } from '@app/types/jwtUser.interface';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth 登录/注册
   */
  async oauthLogin(dto: OAuthLoginDto) {
    // 1. 查找用户是否存在 (通过邮箱或 Provider ID)
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          {
            accounts: {
              some: {
                provider: dto.provider,
                providerId: dto.providerId,
              },
            },
          },
        ],
      },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      // 2. 用户不存在，创建新用户
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name || dto.email.split('@')[0],
          avatarUrl: dto.avatarUrl,
          accounts: {
            create: {
              provider: dto.provider,
              providerId: dto.providerId,
              accessToken: dto.accessToken,
            },
          },
          quota: {
            create: {
              dailyTokenLimit: 500000,
            },
          },
        },
        include: {
          accounts: true,
        },
      });
    } else {
      // 3. 用户存在，更新 Account 信息
      const account = user.accounts.find(
        (a) => a.provider === dto.provider && a.providerId === dto.providerId,
      );

      if (account) {
        // 更新 Access Token
        if (dto.accessToken) {
          await this.prisma.account.update({
            where: { id: account.id },
            data: { accessToken: dto.accessToken },
          });
        }
      } else {
        // 关联新账号
        await this.prisma.account.create({
          data: {
            userId: user.id,
            provider: dto.provider,
            providerId: dto.providerId,
            accessToken: dto.accessToken,
          },
        });
      }
    }

    // 4. 签发 Token
    const tokens = await this.signTokens(user.id, user.email);

    return {
      user: this.excludePassword(user),
      ...tokens,
    };
  }

  /**
   * 用户注册
   */
  async register(dto: RegisterDto) {
    // 1. 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BusinessException(ErrorCode.AUTH_USER_EXISTS);
    }

    // 2. 密码加密
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 3. 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name || dto.email.split('@')[0],
      },
    });

    // 4. 签发 Token
    const tokens = await this.signTokens(user.id, user.email);

    return {
      user: this.excludePassword(user),
      ...tokens,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto) {
    // 1. 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // 3. 签发 Token
    const tokens = await this.signTokens(user.id, user.email);

    return {
      user: this.excludePassword(user),
      ...tokens,
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new BusinessException(ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub.toString() },
      });

      if (!user) {
        throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
      }

      return this.signTokens(user.id, user.email);
    } catch (e) {
      throw new BusinessException(ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
    }
  }

  /**
   * 获取用户信息
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
    }

    return this.excludePassword(user);
  }

  /**
   * 签发 Access Token 和 Refresh Token
   */
  private async signTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, type: 'access' },
        { expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh' },
        { expiresIn: '7d' },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * 排除密码字段
   */
  private excludePassword(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }
}
