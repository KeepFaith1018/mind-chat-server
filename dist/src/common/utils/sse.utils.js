"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEUtils = void 0;
class SSEUtils {
    res;
    constructor(res) {
        this.res = res;
        this.init();
    }
    init() {
        this.res.setHeader('Content-Type', 'text/event-stream');
        this.res.setHeader('Cache-Control', 'no-cache');
        this.res.setHeader('Connection', 'keep-alive');
    }
    send(event, data) {
        if (this.res.writableEnded)
            return;
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        this.res.write(`event: ${event}\ndata: ${payload}\n\n`);
    }
    sendMeta(data) {
        this.send('meta', data);
    }
    sendThinking(delta) {
        this.send('thinking', { delta });
    }
    sendContent(delta) {
        this.send('content', { delta });
    }
    sendUsage(data) {
        this.send('usage', data);
    }
    sendError(message) {
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
exports.SSEUtils = SSEUtils;
//# sourceMappingURL=sse.utils.js.map