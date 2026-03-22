# SSE 协议契约（前后端联调规范）

## 1. 目标

本契约用于统一 `POST /v1/chat` 的流式返回格式，确保前端使用 `fetch + ReadableStream` 时稳定解析。

---

## 2. 接口与响应头

接口：

- `POST /v1/chat`

后端必须返回的 Header：

- `Content-Type: text/event-stream; charset=utf-8`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

说明：

- `X-Accel-Buffering: no` 用于关闭 Nginx 缓冲，避免“攒一大块再输出”。

---

## 3. 消息帧格式

每个 SSE 消息帧必须满足：

```text
event: <event_name>
data: <json_or_string>

```

注意：

1. 每个消息帧结尾是两个换行（`\n\n`）
2. 前端按 `\n\n` 切块解析
3. `data` 推荐 JSON 字符串；`done` 事件可用 `[DONE]`

---

## 4. 事件定义（Chat）

## 4.1 `meta`

用途：会话初始化信息。

数据结构：

```json
{
  "conversationId": "uuid",
  "model": "deepseek-ai/DeepSeek-V3.2",
  "capabilities": {
    "webSearch": true,
    "reasoning": true,
    "fileQa": false,
    "stream": true
  }
}
```

## 4.2 `tool_result`

用途：联网搜索等工具结果。

当前 web_search 结构：

```json
{
  "version": "v1",
  "tool": "web_search",
  "query": "xxx",
  "total": 3,
  "truncated": false,
  "generatedAt": "2026-03-16T00:00:00.000Z",
  "items": [
    {
      "rank": 1,
      "title": "xxx",
      "url": "https://...",
      "snippet": "..."
    }
  ]
}
```

## 4.3 `thinking`

用途：推理增量。

```json
{ "delta": "..." }
```

## 4.4 `content`

用途：正文增量。

```json
{ "delta": "..." }
```

## 4.5 `usage`（可选）

用途：token 使用信息（当前保留事件类型，可按需启用）。

```json
{ "inputTokens": 123, "outputTokens": 456 }
```

## 4.6 `error`

用途：流内错误通知，发送后流结束。

```json
{ "message": "错误描述" }
```

## 4.7 `done`

用途：流正常结束。

```text
[DONE]
```

---

## 5. 时序约束

推荐事件顺序：

1. `meta`
2. `tool_result`（可选）
3. `thinking` / `content`（多次）
4. `done` 或 `error`（二选一）

约束：

1. `done` 与 `error` 只能出现一个
2. 发出 `done` 或 `error` 后必须关闭连接

---

## 6. 前端解析约定（fetch + ReadableStream）

前端应：

1. 使用 `TextDecoder` 持续拼接 chunk
2. 按 `\n\n` 切分消息帧
3. 解析 `event:` 与 `data:` 行
4. `data` 非 `[DONE]` 时按 JSON 解析
5. 收到 `done` 或 `[DONE]` 即停止读取

---

## 7. 断连与中止

后端行为：

1. 监听 `res.close`，中止上游模型流
2. 清理超时定时器与监听器

前端行为：

1. 页面切换/用户停止时调用 `AbortController.abort()`
2. 视为正常中止，不弹错误

---

## 8. 代理层建议（Nginx）

在 chat 路由建议配置：

```nginx
location /v1/chat {
  proxy_pass http://backend;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  proxy_buffering off;
  chunked_transfer_encoding on;
}
```

---

## 9. 兼容性结论

当前后端已满足：

1. 标准 SSE 事件格式（`\n\n` 分隔）
2. fetch + ReadableStream 解析需求
3. 流内错误事件输出
4. 客户端断开时后端可中止上游流
