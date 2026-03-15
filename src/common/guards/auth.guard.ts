import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { BusinessException } from '../exception/businessException';
import { ErrorCode } from '../utils/errorCodeMap';
import { Reflector } from '@nestjs/core';
import { AUTH_KEY } from '../decorators/auth.decorator';
import { JwtUser } from '@app/types/jwtUser.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 判断是否需要鉴权
    const needAuth = this.reflector.getAllAndOverride<boolean>(AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!needAuth) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED);
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(token);
      // 挂载用户信息
      request['user'] = payload;
      return true;
    } catch (error) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED_EXPIRED);
    }
  }

  private extractToken(request: Request): string | undefined {
    // Cookie 优先
    const cookieToken = request['cookies'].token as string | undefined;
    if (cookieToken) return cookieToken;

    // Header Bearer
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
