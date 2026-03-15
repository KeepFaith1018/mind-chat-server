import 'express';
import { JwtUser } from '../type/jwtUser.interface';

declare module 'express' {
  interface Request {
    cookies: Record<string, any>;
    user?: JwtUser;
  }
}
