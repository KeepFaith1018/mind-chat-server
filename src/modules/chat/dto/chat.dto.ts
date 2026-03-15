import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
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
}
