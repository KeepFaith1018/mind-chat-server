import { JwtUser } from '@app/types/jwtUser.interface';
export declare const CurrentUser: <K extends keyof JwtUser>(...dataOrPipes: (K | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;
