import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateShareDto {
  @IsUUID()
  conversationId: string;

  @IsInt()
  @Min(1)
  @Max(24 * 30)
  @IsOptional()
  expireHours?: number;
}
