import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BusinessException } from '../exception/businessException';
import { ErrorCode } from '../utils/errorCodeMap';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

interface CounterState {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly counters = new Map<string, CounterState>();
  private readonly defaultOptions: RateLimitOptions = {
    limit: 30,
    windowSeconds: 60,
  };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || this.defaultOptions;

    const request = context.switchToHttp().getRequest<Request>();
    const userId = this.getUserId(request);
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const routePath = this.getRoutePath(request);
    const key = `rl:${routePath}:${userId || ip}`;
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;

    const state = this.counters.get(key);
    if (!state || state.resetAt <= now) {
      this.counters.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      this.compact(now);
      return true;
    }

    if (state.count >= options.limit) {
      throw new BusinessException(
        ErrorCode.EMAIL_RATE_LIMIT,
        '请求过于频繁，请稍后再试',
      );
    }

    state.count += 1;
    this.counters.set(key, state);
    this.compact(now);
    return true;
  }

  private getUserId(request: Request): string | undefined {
    const user = request['user'] as { sub?: string } | undefined;
    return user?.sub;
  }

  private getRoutePath(request: Request): string {
    const route = request['route'] as { path?: string } | undefined;
    return route?.path || request.path;
  }

  private compact(now: number) {
    if (this.counters.size < 200) {
      return;
    }
    for (const [key, state] of this.counters.entries()) {
      if (state.resetAt <= now) {
        this.counters.delete(key);
      }
    }
  }
}
