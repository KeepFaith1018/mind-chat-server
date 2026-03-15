export interface JwtUser {
  sub: number;
  username: string;
  type: 'access' | 'refresh';
}
