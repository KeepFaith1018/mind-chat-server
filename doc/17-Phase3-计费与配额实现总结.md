# Phase3 实现总结：计费与配额（对照实施方案）

## 1. 对照 `/doc/15-模型能力计费安全实施方案.md` 的检查结果

## 1.1 Phase1、Phase2 对齐情况

- `model_configs` 已落地并可被读取
- `usage_logs` 已在 schema 中定义
- `Conversation.summary` 字段已新增
- `GET /v1/models/available` 已实现
- Chat 已支持 `capabilities`（webSearch/reasoning/fileQa）
- 模型能力校验已接入 Chat 主链路
- 联网搜索已接入并注入 Prompt

## 1.2 Phase3 需要补齐的缺口

- 缺少统一 `UsageService` 负责 token 统计与成本计算
- `usage_logs` 未在聊天结束后自动落库
- 配额仍主要依赖估算 token，错误码复用不准确

---

## 2. 本轮 Phase3 实现内容

## 2.1 新增 Usage 模块

新增文件：

- `src/modules/usage/usage.module.ts`
- `src/modules/usage/usage.service.ts`

核心能力：

1. `computeUsage(...)`
   - 优先解析 provider 返回 usage（若存在）
   - 无真实 usage 时回退估算（字符长度 / 4）
   - 根据 `model_configs` 单价计算成本
2. `persistUsage(...)`
   - 写入 `usage_logs`（含 `meta_json`）
   - `meta_json` 记录 estimated 标记与 provider usage 原始信息

---

## 2.2 Chat 链路接入 usage 统计与落库

文件：

- `src/modules/chat/chat.service.ts`

改动要点：

1. 流式生成时收集 provider usage 原始 payload（从 chunk metadata 中提取）
2. 在 `handlePostChat` 中：
   - 调用 `UsageService.computeUsage`
   - 调用 `UsageService.persistUsage` 写入 `usage_logs`
   - 使用 `usage.totalTokens` 更新配额

结果：

- 每轮对话结束后，至少会有一条 usage 日志入库
- 成本计算已进入主链路

---

## 2.3 QuotaService 优化

文件：

- `src/modules/quota/quota.service.ts`

改动：

1. `checkQuota` 跨天自动重置后继续检查
2. 超额错误码改为 `ErrorCode.QUOTA_EXCEEDED`
3. 新增 `ensureQuota`（upsert），避免缺少记录导致更新失败
4. `recordUsage` 在写入前确保 quota 存在

---

## 2.4 模块依赖更新

文件：

- `src/modules/chat/chat.module.ts`

改动：

- 引入 `UsageModule`，供 ChatService 注入 UsageService

---

## 3. 当前实现策略说明

## 3.1 真实 usage 优先级

当前采用：

1. 尝试从 provider metadata 提取 token usage
2. 提取失败则回退估算
3. 在 `meta_json.estimated` 标识来源

## 3.2 成本计算公式

```text
cost =
  (prompt_tokens / 1000) * input_price_per_1k +
  (completion_tokens / 1000) * output_price_per_1k
```

## 3.3 货币与精度

- 币种固定 `USD`
- 成本保留 8 位小数（服务层计算），数据库字段为 decimal

---

## 4. 验收检查建议

## 4.1 功能检查

1. 发起一次 `/v1/chat` 对话
2. 对话完成后检查 `usage_logs` 是否新增记录
3. 检查 `usage_quotas.daily_token_usage` 是否递增
4. 人工把 `daily_token_limit` 调小后再次请求，验证超额拒绝

## 4.2 数据检查 SQL 示例

```sql
SELECT model_key, prompt_tokens, completion_tokens, total_tokens, cost, meta_json, created_at
FROM usage_logs
ORDER BY created_at DESC
LIMIT 20;
```

```sql
SELECT user_id, daily_token_limit, daily_token_usage, total_token_usage, last_request_at
FROM usage_quotas
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 5. 已知后续优化点（Phase3.5）

1. 将 provider usage 解析抽到适配层（按不同模型厂商定制）
2. `usage_logs` 增加 `message_id` 关联（可选增强）
3. 将写日志与扣配额放到事务中提升一致性
4. 为成本统计增加按日聚合接口
