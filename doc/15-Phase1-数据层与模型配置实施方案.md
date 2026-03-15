# Phase 1：数据层与模型配置实施方案

## 1. 目标

本阶段仅完成三件事：

1. Prisma 新增 `model_configs`、`usage_logs`、`conversation.summary`
2. 生成迁移并验证
3. 初始化模型种子数据（SQL）

交付标准：

- 模型配置可读（后端可从 DB 拉取）
- 前端可拉取可用模型列表与能力矩阵

---

## 2. 数据模型设计

## 2.1 model_configs

用途：作为模型能力与价格配置中心（手动改表维护）。

字段：

- `id` UUID 主键
- `model_key` 唯一键（例：`deepseek-ai/DeepSeek-V3`）
- `display_name` 展示名
- `provider` 提供商（siliconflow/openai/...）
- `enabled` 是否可用
- `is_default` 是否默认模型
- `max_context_tokens` 最大上下文
- `supports_web_search` 是否支持联网搜索
- `supports_reasoning` 是否支持深度思考
- `supports_file_qa` 是否支持文件问答
- `supports_stream` 是否支持流式
- `input_price_per_1k` 输入价格
- `output_price_per_1k` 输出价格
- `config_json` 扩展配置
- `created_at` / `updated_at`

## 2.2 usage_logs

用途：记录每次调用 token 与成本，供后续计费/审计。

字段：

- `id` UUID 主键
- `user_id` 用户 ID
- `conversation_id` 会话 ID（可空）
- `model_key` 模型标识
- `prompt_tokens` 输入 token
- `completion_tokens` 输出 token
- `reasoning_tokens` 推理 token（可空）
- `total_tokens` 总 token
- `cost` 成本
- `currency` 货币（默认 USD）
- `meta_json` 扩展元数据
- `created_at`

## 2.3 conversation.summary

在 `conversations` 增加：

- `summary` 历史摘要文本（可空）
- `summary_updated_at` 摘要更新时间（可空）

---

## 3. 后端接口规划（Phase 1）

新增接口：

- `GET /v1/models/available`

返回：

- `defaultModel`
- `models[]`（每个模型含能力矩阵）

示例：

```json
{
  "defaultModel": "deepseek-ai/DeepSeek-V3",
  "models": [
    {
      "modelKey": "deepseek-ai/DeepSeek-V3",
      "displayName": "DeepSeek V3",
      "provider": "siliconflow",
      "maxContextTokens": 64000,
      "capabilities": {
        "webSearch": true,
        "reasoning": true,
        "fileQa": true,
        "stream": true
      }
    }
  ]
}
```

---

## 4. 实施步骤

1. 修改 Prisma schema：
   - 新增 `ModelConfig`
   - 新增 `UsageLog`
   - `Conversation` 增加 `summary` 和 `summaryUpdatedAt`
2. 执行迁移：
   - `npx prisma migrate dev --name phase1_model_config_usage_logs`
   - `npx prisma generate`
3. 新增模型模块：
   - `ModelsModule`
   - `ModelsService`
   - `ModelsController`
4. 接入主模块：
   - 在 `AppModule` 中注册 `ModelsModule`
5. 初始化种子 SQL：
   - 写入 `prisma/seeds/phase1_model_configs.sql`
   - 插入默认模型与能力配置
6. 验证：
   - 迁移成功
   - 接口返回正确
   - 至少一个默认模型（`is_default=true`）

---

## 5. 验证清单

数据库：

- `model_configs` 存在
- `usage_logs` 存在
- `conversations.summary` 字段存在

接口：

- `GET /v1/models/available` 返回 200
- 返回内存在 `defaultModel`
- 模型能力字段完整

数据：

- 至少 2 条模型配置
- 仅 1 条默认模型（建议）

---

## 6. 风险与处理

1. 默认模型配置缺失  
   处理：接口层兜底，按 `updated_at desc` 取一条 enabled 模型作为默认值

2. 手工改库导致能力字段不合法  
   处理：服务层做字段校验与默认值归一

3. 迁移失败（网络/权限）  
   处理：先 `prisma validate`，再 `migrate dev`，必要时回滚迁移目录

