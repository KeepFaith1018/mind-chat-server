# Phase2 实现总结：能力开关、模型校验、联网搜索

## 1. 本阶段目标

本阶段围绕聊天能力编排，完成以下目标：

1. 支持前端传入能力开关（webSearch/reasoning/fileQa）
2. 在后端按模型能力进行校验与降级
3. 打通联网搜索并注入聊天上下文
4. 提供能力预览接口，支持前端状态恢复
5. 统一 SSE `tool_result` 结构，便于前端稳定渲染

---

## 2. 核心改动概览

## 2.1 DTO 扩展（能力开关）

文件：

- `src/modules/chat/dto/chat.dto.ts`

新增字段：

```json
{
  "capabilities": {
    "webSearch": true,
    "reasoning": true,
    "fileQa": false
  }
}
```

作用：前端可以显式表达本次对话希望开启的能力。

---

## 2.2 模型能力解析与校验

文件：

- `src/modules/models/models.service.ts`

新增能力：

1. `resolveModelForChat(preferredModelKey)`  
   - 优先按请求模型查找启用模型  
   - 查不到则回退默认启用模型  
   - 若无可用模型，抛业务异常

2. `resolveCapabilities(model, requested, hasFiles)`  
   - 依据模型支持能力与请求开关，得出“实际生效能力”

---

## 2.3 Chat 链路接入模型编排

文件：

- `src/modules/chat/chat.service.ts`

主要流程：

1. 解析会话模型与请求模型，得到最终模型
2. 计算请求能力与实际能力
3. 校验不支持场景：
   - 不支持 stream
   - 文件上传但模型不支持 fileQa
   - 请求 webSearch 但模型不支持
4. 同步会话 `modelId`
5. 将生效能力通过 `meta` 事件返回前端

---

## 2.4 深度思考开关接入

文件：

- `src/modules/ai/ai.service.ts`
- `src/modules/chat/services/prompt.service.ts`

实现点：

1. `AiService` 支持 `reasoningEnabled` + `reasoningParamKey`
2. `PromptService` 在 `reasoning=false` 时增加约束系统提示，减少推理过程输出

---

## 2.5 联网搜索能力打通

新增文件：

- `src/modules/search/search.service.ts`
- `src/modules/search/search.module.ts`

接入文件：

- `src/modules/chat/chat.module.ts`
- `src/app.module.ts`
- `src/modules/chat/chat.service.ts`
- `src/modules/chat/services/prompt.service.ts`

实现方式：

1. 从最后一条用户消息提取查询词
2. 调用 DuckDuckGo Instant Answer API 检索
3. 归一化结果（title/url/snippet）
4. 注入 Prompt 的“联网检索上下文”
5. 通过 SSE `tool_result` 事件回传引用信息

---

## 2.6 tool_result 结构标准化

当前 `tool_result` 事件结构：

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

作用：前端可稳定渲染“来源列表/检索卡片”。

---

## 2.7 能力预览接口（前端状态恢复）

文件：

- `src/modules/chat/chat.controller.ts`
- `src/modules/chat/chat.service.ts`

新增接口：

- `GET /v1/chat/capabilities`

查询参数：

- `model`
- `conversationId`
- `webSearch`
- `reasoning`
- `fileQa`
- `fileCount`

返回：

- `model`：当前解析后的模型信息
- `requested`：前端请求能力
- `effective`：实际生效能力
- `context`：会话/文件上下文状态

---

## 3. 前端对接要点

1. 发起聊天时在 body 中传 `capabilities`
2. 监听 SSE：
   - `meta`：拿到 conversationId/model/effective capabilities
   - `tool_result`：渲染检索来源
   - `thinking/content/done/error`：渲染消息流
3. 页面恢复时调用 `GET /v1/chat/capabilities` 还原按钮状态

---

## 4. 当前已知限制

1. 联网搜索目前使用通用公开检索接口，结果质量受源数据影响
2. 暂未引入“搜索缓存”和“重排序”
3. 暂未将引用来源入库（当前仅通过 SSE 返回给前端）

---

## 5. 下一步建议（Phase2.5 / Phase3）

1. 增加搜索结果缓存（按 query+model 缓存 1~5 分钟）
2. 增加引用落库（message metadata）
3. 将 token 统计从估算升级为 provider usage 优先
4. 把 `usage_logs` 写入链路打通（成本计算）
