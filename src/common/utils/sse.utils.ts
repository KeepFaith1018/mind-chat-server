import { Response } from 'express';

export type SSEEventType =
  | 'meta'
  | 'thinking'
  | 'content'
  | 'tool_call'
  | 'tool_result'
  | 'usage'
  | 'done'
  | 'error';

export class SSEUtils {
  private res: Response;

  constructor(res: Response) {
    this.res = res;
    this.init();
  }

  private init() {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
  }

  send(event: SSEEventType, data: any) {
    // 如果连接已关闭，不再写入
    if (this.res.writableEnded) return;
    
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }

  sendMeta(data: {
    conversationId: string;
    model?: string;
    capabilities?: {
      webSearch: boolean;
      reasoning: boolean;
      fileQa: boolean;
      stream: boolean;
    };
  }) {
    this.send('meta', data);
  }

  sendThinking(delta: string) {
    this.send('thinking', { delta });
  }

  sendContent(delta: string) {
    this.send('content', { delta });
  }

  sendUsage(data: { inputTokens: number; outputTokens: number }) {
    this.send('usage', data);
  }

  sendError(message: string) {
    this.send('error', { message });
    this.end();
  }

  sendDone() {
    this.send('done', '[DONE]');
    this.end();
  }

  end() {
    if (!this.res.writableEnded) {
      this.res.end();
    }
  }
}
