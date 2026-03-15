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
  reasoningEnabled?: boolean;
  reasoningParamKey?: string;
}

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 创建 AI 模型实例
   */
  createChatModel(options: ChatOptions = {}) {
    const apiKey = this.configService.get<string>('SILICONFLOW_API_KEY')?.trim();
    if (!apiKey) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        'SiliconFlow API Key missing',
      );
    }

    const modelKwargs: Record<string, unknown> = {};
    if (typeof options.reasoningEnabled === 'boolean') {
      const reasoningKey = options.reasoningParamKey || 'enable_thinking';
      modelKwargs[reasoningKey] = options.reasoningEnabled;
    }

    return new ChatOpenAI({
      modelName: options.modelName || 'deepseek-ai/DeepSeek-V3',
      temperature: options.temperature ?? 0.7,
      apiKey,
      configuration: {
        baseURL: 'https://api.siliconflow.cn/v1',
      },
      streaming: options.streaming ?? true,
      ...(Object.keys(modelKwargs).length > 0 ? { modelKwargs } : {}),
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
