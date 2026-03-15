import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
export interface ChatOptions {
    modelName?: string;
    temperature?: number;
    streaming?: boolean;
}
export declare class AiService {
    private readonly configService;
    constructor(configService: ConfigService);
    createChatModel(options?: ChatOptions): ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>;
    streamChat(messages: BaseMessage[], options?: ChatOptions): Promise<import("@langchain/core/utils/stream").IterableReadableStream<import("@langchain/core/messages").AIMessageChunk<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>>>>;
}
