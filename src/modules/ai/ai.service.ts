import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';

export interface ChatOptions {
  modelName?: string;
  temperature?: number;
  streaming?: boolean;
}

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 创建 AI 模型实例
   */
  createChatModel(options: ChatOptions = {}) {
    const apiKey = this.configService.get<string>('SILICONFLOW_API_KEY');
    console.error(apiKey);
    if (!apiKey) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        'SiliconFlow API Key missing',
      );
    }

    return new ChatOpenAI({
      modelName: options.modelName || 'deepseek-ai/DeepSeek-V3',
      temperature: options.temperature ?? 0.7,
      apiKey: apiKey,
      configuration: {
        baseURL: 'https://api.siliconflow.cn/v1',
      },
      streaming: options.streaming ?? true,
    });
  }

  /**
   * 流式对话
   */
  async streamChat(messages: BaseMessage[], options: ChatOptions = {}) {
    const model = this.createChatModel(options);
    return await model.stream(messages);
  }
}
