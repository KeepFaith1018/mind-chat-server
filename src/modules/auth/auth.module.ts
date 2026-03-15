import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth/oauth.service';
import { GithubOAuthProvider } from './oauth/providers/github.provider';
import { GoogleOAuthProvider } from './oauth/providers/google.provider';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    GithubOAuthProvider,
    GoogleOAuthProvider,
  ],
  exports: [AuthService],
})
export class AuthModule {}
