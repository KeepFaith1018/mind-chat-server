import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatCapabilitiesDto {
  @IsBoolean()
  @IsOptional()
  webSearch?: boolean;

  @IsBoolean()
  @IsOptional()
  reasoning?: boolean;

  @IsBoolean()
  @IsOptional()
  fileQa?: boolean;
}

export class ChatDto {
  @IsArray()
  @IsNotEmpty()
  messages: ChatMessageDto[];

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsArray()
  @IsOptional()
  fileIds?: string[]; // 上传的文件 ID 列表

  @ValidateNested()
  @Type(() => ChatCapabilitiesDto)
  @IsOptional()
  capabilities?: ChatCapabilitiesDto;
}
