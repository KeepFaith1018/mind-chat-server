import { Response } from 'express';
export type SSEEventType = 'meta' | 'thinking' | 'content' | 'tool_call' | 'tool_result' | 'usage' | 'done' | 'error';
export declare class SSEUtils {
    private res;
    constructor(res: Response);
    private init;
    send(event: SSEEventType, data: any): void;
    sendMeta(data: {
        conversationId: string;
    }): void;
    sendThinking(delta: string): void;
    sendContent(delta: string): void;
    sendUsage(data: {
        inputTokens: number;
        outputTokens: number;
    }): void;
    sendError(message: string): void;
    sendDone(): void;
    end(): void;
}
