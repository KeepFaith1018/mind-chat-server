import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  modelId?: string = 'deepseek-ai/DeepSeek-V3';
}

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsString()
  @IsOptional()
  modelId?: string;
}
